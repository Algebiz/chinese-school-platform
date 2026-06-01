import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEnrollments, checkTimeConflict } from '@/lib/enrollment-logic'
import { getCurrentAcademicYear } from '@/lib/academic-year'

async function getFamily(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: { familyId: true } })
}

async function getCartItems(familyId: string) {
  return prisma.cartItem.findMany({
    where: { familyId },
    include: { student: { select: { id: true, name: true, nameEn: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

function serialize(items: Awaited<ReturnType<typeof getCartItems>>) {
  return items.map(i => ({
    ...i,
    price: i.price.toString(),
    createdAt: i.createdAt.toISOString(),
  }))
}

// ── GET — fetch cart ──────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const user = await getFamily(session.user.id)
  if (!user?.familyId) return NextResponse.json({ success: true, data: [] })

  const items = await getCartItems(user.familyId)
  return NextResponse.json({ success: true, data: serialize(items) })
}

// ── POST — add to cart ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const user = await getFamily(session.user.id)
  if (!user?.familyId) return NextResponse.json({ success: false, error: 'No family found' }, { status: 400 })

  const familyId = user.familyId
  const CURRENT_YEAR = await getCurrentAcademicYear()
  const body = await req.json()
  const { type, studentId, classIds, textbookIds = [], examSessionId } = body as {
    type: 'ENROLLMENT' | 'EXAM_REGISTRATION'
    studentId?: string
    classIds?: string[]
    textbookIds?: string[]
    examSessionId?: string
  }

  if (type === 'ENROLLMENT') {
    if (!studentId || !classIds?.length) {
      return NextResponse.json({ success: false, error: 'studentId and classIds required' }, { status: 400 })
    }

    // Verify student belongs to family
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { familyId: true, name: true, nameEn: true } })
    if (student?.familyId !== familyId) return NextResponse.json({ success: false, error: 'Student not in family' }, { status: 403 })

    // Check for time conflicts
    for (const classId of classIds) {
      const conflict = await checkTimeConflict(studentId, classId, CURRENT_YEAR)
      if (conflict.hasConflict) {
        return NextResponse.json({
          success: false, code: 'TIME_CONFLICT',
          error: `Schedule conflict with ${conflict.conflictingClass?.name ?? 'another class'}`,
        }, { status: 409 })
      }
    }

    // Check already in cart
    const alreadyInCart = await prisma.cartItem.findFirst({
      where: { familyId, studentId, classId: { in: classIds }, type: 'ENROLLMENT' },
    })
    if (alreadyInCart) {
      return NextResponse.json({ success: false, code: 'ALREADY_IN_CART', error: 'Class already in cart' }, { status: 409 })
    }

    // Create actual PENDING enrollments (reserves the spot)
    const { enrollments } = await createEnrollments(studentId, classIds, textbookIds, CURRENT_YEAR)

    // Fetch class + textbook details for pricing
    const classes = await prisma.class.findMany({ where: { id: { in: classIds } } })
    const textbooks = textbookIds.length > 0
      ? await prisma.textbook.findMany({ where: { id: { in: textbookIds } } })
      : []

    const studentName = student.name
    const enrollmentId = enrollments[0]?.id ?? null

    // Create CartItems in a transaction
    await prisma.$transaction(async (tx) => {
      for (const cls of classes) {
        const parentItem = await tx.cartItem.create({
          data: {
            familyId, type: 'ENROLLMENT', studentId, classId: cls.id,
            enrollmentId,
            price: cls.fee,
            description: `${cls.name} — ${studentName}`,
            descriptionEn: cls.nameEn ? `${cls.nameEn} — ${studentName}` : undefined,
          },
        })

        // Child textbook items
        for (const tb of textbooks) {
          if (tb.classId !== cls.id) continue
          await tx.cartItem.create({
            data: {
              familyId, type: 'TEXTBOOK', studentId, textbookId: tb.id,
              parentCartItemId: parentItem.id,
              price: tb.price,
              description: `${tb.nameZh} (${cls.name})`,
              descriptionEn: `${tb.name} (${cls.nameEn ?? cls.name})`,
            },
          })
        }
      }

      // Auto-add deposit if no paid deposit and no deposit already in cart
      const existingDeposit = await prisma.volunteerDeposit.findUnique({
        where: { familyId_academicYear: { familyId, academicYear: CURRENT_YEAR } },
      })
      const depositInCart = await tx.cartItem.findFirst({ where: { familyId, type: 'DEPOSIT' } })
      const yearConfig = await prisma.academicYearConfig.findFirst({ where: { isActive: true } })
      const depositRequired = yearConfig?.volunteerDepositRequired ?? true
      const depositAmount = yearConfig?.volunteerDepositAmount?.toNumber() ?? 100

      if (depositRequired && !depositInCart && (!existingDeposit || existingDeposit.status === 'PENDING')) {
        await tx.cartItem.create({
          data: {
            familyId, type: 'DEPOSIT',
            price: depositAmount,
            description: '志愿服务押金（可退）',
            descriptionEn: 'Volunteer Deposit (refundable)',
          },
        })
      }
    })

  } else if (type === 'EXAM_REGISTRATION') {
    if (!studentId || !examSessionId) {
      return NextResponse.json({ success: false, error: 'studentId and examSessionId required' }, { status: 400 })
    }

    const examSession = await prisma.examSession.findUnique({
      where: { id: examSessionId },
      select: { examType: true, level: true, examDate: true, fee: true, registrationDeadline: true },
    })
    if (!examSession) return NextResponse.json({ success: false, error: 'Exam session not found' }, { status: 404 })
    if (examSession.registrationDeadline < new Date()) {
      return NextResponse.json({ success: false, error: 'Registration deadline passed' }, { status: 409 })
    }

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { familyId: true, name: true } })
    if (student?.familyId !== familyId) return NextResponse.json({ success: false, error: 'Student not in family' }, { status: 403 })

    const alreadyInCart = await prisma.cartItem.findFirst({
      where: { familyId, studentId, examSessionId, type: 'EXAM_REGISTRATION' },
    })
    if (alreadyInCart) {
      return NextResponse.json({ success: false, code: 'ALREADY_IN_CART', error: 'Exam already in cart' }, { status: 409 })
    }

    const examDate = examSession.examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    await prisma.cartItem.create({
      data: {
        familyId, type: 'EXAM_REGISTRATION', studentId, examSessionId,
        price: examSession.fee,
        description: `${examSession.examType} Level ${examSession.level} — ${student.name} (${examDate})`,
        descriptionEn: `${examSession.examType} Level ${examSession.level} — ${student.name} (${examDate})`,
      },
    })
  } else {
    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
  }

  const updated = await getCartItems(familyId)
  return NextResponse.json({ success: true, data: serialize(updated) }, { status: 201 })
}

// ── DELETE — clear entire cart ────────────────────────────────────────────────

export async function DELETE() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const user = await getFamily(session.user.id)
  if (!user?.familyId) return NextResponse.json({ success: true })

  await prisma.cartItem.deleteMany({ where: { familyId: user.familyId } })
  return NextResponse.json({ success: true, data: [] })
}
