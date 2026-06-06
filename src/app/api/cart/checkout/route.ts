import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEnrollments } from '@/lib/enrollment-logic'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })
  if (!user?.familyId) return NextResponse.json({ success: false, error: 'No family found' }, { status: 400 })

  const familyId = user.familyId
  const CURRENT_YEAR = await getCurrentAcademicYear()

  const [enrollmentCartItems, examCartItems] = await Promise.all([
    prisma.cartItem.findMany({
      where: { familyId, type: 'ENROLLMENT', parentCartItemId: null },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cartItem.findMany({
      where: { familyId, type: 'EXAM_REGISTRATION', parentCartItemId: null },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  console.log('[cart/checkout] familyId:', familyId, '| ENROLLMENT:', enrollmentCartItems.length, '| EXAM_REGISTRATION:', examCartItems.length)

  if (enrollmentCartItems.length === 0 && examCartItems.length === 0) {
    return NextResponse.json({ success: true, data: { enrollmentIds: [], examRegistrationIds: [] } })
  }

  const enrollmentIds: string[] = []
  const examRegistrationIds: string[] = []
  const cartUpdates: Promise<unknown>[] = []

  // ── Process ENROLLMENT items ──────────────────────────────────────────────────
  for (const item of enrollmentCartItems) {
    console.log('[cart/checkout] Processing enrollment item:', {
      id: item.id, studentId: item.studentId, classId: item.classId, enrollmentId: item.enrollmentId,
    })

    if (!item.studentId || !item.classId) {
      console.log('[cart/checkout] Skipping item — missing studentId or classId')
      continue
    }

    // Verify the class still exists in the database
    const cls = await prisma.class.findUnique({ where: { id: item.classId } })
    console.log('[cart/checkout] Class lookup:', item.classId, '→', cls ? `found: ${cls.name}` : 'NOT FOUND')

    if (!cls) {
      console.error('[cart/checkout] Class', item.classId, 'not found in DB — removing stale cart item:', item.id)
      cartUpdates.push(
        prisma.cartItem.deleteMany({ where: { OR: [{ id: item.id }, { parentCartItemId: item.id }] } })
      )
      continue
    }

    // Fast path: cart item references a valid PENDING enrollment
    if (item.enrollmentId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { id: item.enrollmentId, status: 'PENDING' },
      })
      if (enrollment) {
        console.log('[cart/checkout] Fast path — found PENDING enrollment:', enrollment.id)
        enrollmentIds.push(enrollment.id)
        continue
      }
      console.log('[cart/checkout] enrollmentId', item.enrollmentId, 'is not PENDING — falling to slow path')
    }

    // Slow path: look up enrollment by student + class
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { studentId_classId: { studentId: item.studentId, classId: item.classId } },
    })
    console.log('[cart/checkout] Slow path — existing enrollment:', existingEnrollment?.id ?? 'none', 'status:', existingEnrollment?.status ?? 'N/A')

    if (existingEnrollment?.status === 'PENDING') {
      enrollmentIds.push(existingEnrollment.id)
      cartUpdates.push(
        prisma.cartItem.update({ where: { id: item.id }, data: { enrollmentId: existingEnrollment.id } })
      )

    } else if (existingEnrollment?.status === 'CONFIRMED' || existingEnrollment?.status === 'TRANSFERRED') {
      console.log('[cart/checkout] Enrollment already', existingEnrollment.status, '— removing stale cart item:', item.id)
      cartUpdates.push(
        prisma.cartItem.deleteMany({ where: { OR: [{ id: item.id }, { parentCartItemId: item.id }] } })
      )

    } else {
      const textbookChildren = await prisma.cartItem.findMany({
        where: { familyId, studentId: item.studentId, type: 'TEXTBOOK', parentCartItemId: item.id },
        select: { textbookId: true },
      })
      const textbookIds = textbookChildren.map(t => t.textbookId).filter(Boolean) as string[]

      console.log('[cart/checkout] Creating/re-activating enrollment for student', item.studentId, 'class', item.classId)
      const { enrollments, waitlists } = await createEnrollments(
        item.studentId, [item.classId], textbookIds, CURRENT_YEAR
      )
      console.log('[cart/checkout] createEnrollments result — enrollments:', enrollments.length, 'waitlists:', waitlists.length)

      if (enrollments[0]) {
        enrollmentIds.push(enrollments[0].id)
        cartUpdates.push(
          prisma.cartItem.update({ where: { id: item.id }, data: { enrollmentId: enrollments[0].id } })
        )
      } else if (waitlists[0]) {
        console.log('[cart/checkout] Class full — student waitlisted, removing cart item:', item.id)
        cartUpdates.push(
          prisma.cartItem.deleteMany({ where: { OR: [{ id: item.id }, { parentCartItemId: item.id }] } })
        )
      } else {
        console.error('[cart/checkout] createEnrollments returned empty — possible stale class ref or logic gap')
      }
    }
  }

  // ── Process EXAM_REGISTRATION items ──────────────────────────────────────────
  for (const item of examCartItems) {
    console.log('[cart/checkout] Processing exam item:', {
      id: item.id, studentId: item.studentId, examSessionId: item.examSessionId, examRegistrationId: item.examRegistrationId,
    })

    if (!item.studentId || !item.examSessionId) {
      console.log('[cart/checkout] Skipping exam item — missing studentId or examSessionId')
      continue
    }

    const examSession = await prisma.examSession.findUnique({ where: { id: item.examSessionId } })
    console.log('[cart/checkout] ExamSession lookup:', item.examSessionId, '→', examSession ? `found: ${examSession.examType} L${examSession.level}` : 'NOT FOUND')

    if (!examSession) {
      console.error('[cart/checkout] ExamSession', item.examSessionId, 'not found — removing stale cart item:', item.id)
      cartUpdates.push(prisma.cartItem.delete({ where: { id: item.id } }))
      continue
    }

    // Fast path: cart item already references a valid PENDING_PAYMENT registration
    if (item.examRegistrationId) {
      const reg = await prisma.examRegistration.findFirst({
        where: { id: item.examRegistrationId, status: 'PENDING_PAYMENT' },
      })
      if (reg) {
        console.log('[cart/checkout] Fast path — found PENDING_PAYMENT exam registration:', reg.id)
        examRegistrationIds.push(reg.id)
        continue
      }
      console.log('[cart/checkout] examRegistrationId', item.examRegistrationId, 'is not PENDING_PAYMENT — falling to slow path')
    }

    // Slow path: look up by examSession + student unique key
    const existing = await prisma.examRegistration.findUnique({
      where: { examSessionId_studentId: { examSessionId: item.examSessionId, studentId: item.studentId } },
    })
    console.log('[cart/checkout] Slow path — existing exam reg:', existing?.id ?? 'none', 'status:', existing?.status ?? 'N/A')

    if (existing?.status === 'PENDING_PAYMENT') {
      examRegistrationIds.push(existing.id)
      cartUpdates.push(prisma.cartItem.update({ where: { id: item.id }, data: { examRegistrationId: existing.id } }))

    } else if (existing?.status === 'PAID' || existing?.status === 'CONFIRMED') {
      console.log('[cart/checkout] ExamRegistration already', existing.status, '— removing stale cart item:', item.id)
      cartUpdates.push(prisma.cartItem.delete({ where: { id: item.id } }))

    } else {
      // null or CANCELLED — create / reactivate
      const student = await prisma.student.findUnique({
        where: { id: item.studentId },
        select: { name: true, nameEn: true, birthDate: true },
      })
      if (!student) {
        console.error('[cart/checkout] Student', item.studentId, 'not found — skipping exam item')
        continue
      }

      let reg: { id: string }
      if (existing?.status === 'CANCELLED') {
        reg = await prisma.examRegistration.update({
          where: { id: existing.id },
          data: { status: 'PENDING_PAYMENT', amount: examSession.fee },
        })
        console.log('[cart/checkout] Re-activated CANCELLED exam registration:', reg.id)
      } else {
        reg = await prisma.examRegistration.create({
          data: {
            examSessionId: item.examSessionId,
            studentId: item.studentId,
            status: 'PENDING_PAYMENT',
            amount: examSession.fee,
            studentNameZh: student.name,
            studentNameEn: student.nameEn ?? null,
            studentDob: student.birthDate ?? null,
          },
        })
        console.log('[cart/checkout] Created new exam registration:', reg.id)
      }

      examRegistrationIds.push(reg.id)
      cartUpdates.push(prisma.cartItem.update({ where: { id: item.id }, data: { examRegistrationId: reg.id } }))
    }
  }

  await Promise.all(cartUpdates)

  console.log('[cart/checkout] Returning enrollmentIds:', enrollmentIds, 'examRegistrationIds:', examRegistrationIds)
  return NextResponse.json({ success: true, data: { enrollmentIds, examRegistrationIds } })
}
