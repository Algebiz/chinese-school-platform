import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendClassChangeNotification } from '@/lib/email'

type Params = { params: Promise<{ classId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { classId } = await params
  const body = await req.json()

  const existing = await prisma.class.findUnique({
    where: { id: classId },
    include: { teacher: { select: { id: true, name: true } } },
  })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const teacherChanging = body.teacherId !== undefined && body.teacherId !== existing.teacherId

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.nameEn !== undefined) data.nameEn = body.nameEn || null
  if (body.type !== undefined) data.type = body.type
  if (body.teacherId !== undefined) data.teacherId = body.teacherId || null
  if (body.capacity !== undefined) data.capacity = parseInt(String(body.capacity))
  if (body.fee !== undefined) data.fee = parseFloat(String(body.fee))
  if (body.schedule !== undefined) data.schedule = body.schedule
  if (body.description !== undefined) data.description = body.description || null
  if (body.descriptionZh !== undefined) data.descriptionZh = body.descriptionZh || null
  if (body.isActive !== undefined) data.isActive = body.isActive

  const updated = await prisma.class.update({
    where: { id: classId },
    data,
    include: { teacher: { select: { name: true } } },
  })

  // Notify enrolled students of teacher change
  if (teacherChanging) {
    const oldTeacherName = existing.teacher?.name ?? 'Previous Teacher'
    const newTeacherName = updated.teacher?.name ?? 'New Teacher'

    const enrollments = await prisma.enrollment.findMany({
      where: { classId, status: 'CONFIRMED' },
      include: { student: { select: { name: true, familyId: true } } },
    })

    for (const enrollment of enrollments) {
      if (!enrollment.student.familyId) continue
      const parentUser = await prisma.user.findFirst({
        where: { familyId: enrollment.student.familyId },
        select: { name: true, email: true },
      })
      if (!parentUser?.email) continue
      try {
        await sendClassChangeNotification(parentUser.email, {
          parentName: parentUser.name ?? 'Parent',
          studentName: enrollment.student.name,
          fromClass: `${existing.name} (Teacher: ${oldTeacherName})`,
          toClass: `${updated.name} (Teacher: ${newTeacherName})`,
          reason: 'Teacher reassignment by school administration',
        })
      } catch (e) {
        console.error('Failed to send teacher change email:', e)
      }
    }
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { classId } = await params
  console.log('[delete-class] attempting:', classId)

  const existing = await prisma.class.findUnique({ where: { id: classId }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Class not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const confirmedCount = await prisma.enrollment.count({
    where: { classId, status: 'CONFIRMED' },
  })
  console.log('[delete-class] confirmed enrollment count:', confirmedCount)
  if (confirmedCount > 0) {
    return NextResponse.json(
      { success: false, error: '无法删除已有学生的班级 / Cannot delete class with enrolled students', code: 'HAS_ENROLLMENTS' },
      { status: 409 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      // All remaining enrollments are non-CONFIRMED (PENDING/CANCELLED/TRANSFERRED) —
      // they still hold a FK to this class (Enrollment.classId has no onDelete: Cascade)
      // and must be cleared before the class can be deleted.
      const enrollmentIds = await tx.enrollment
        .findMany({ where: { classId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id))
      const textbookIds = await tx.textbook
        .findMany({ where: { classId }, select: { id: true } })
        .then((rows) => rows.map((r) => r.id))
      console.log('[delete-class] non-confirmed enrollments:', enrollmentIds.length, 'textbooks:', textbookIds.length)

      // 1. Cart items referencing this class or its textbooks
      await tx.cartItem.deleteMany({
        where: {
          OR: [
            { classId },
            ...(textbookIds.length > 0 ? [{ textbookId: { in: textbookIds } }] : []),
          ],
        },
      })

      if (enrollmentIds.length > 0) {
        // 2. Enrollment ↔ textbook links
        await tx.enrollmentTextbook.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } })
        // Payment.enrollmentId also has no onDelete: Cascade — must clear before the enrollment
        await tx.payment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } })
        // 3. Enrollments (non-confirmed)
        await tx.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } })
      }

      // 4. Waitlist entries
      await tx.waitlist.deleteMany({ where: { classId } })

      // 5. Textbooks
      await tx.textbook.deleteMany({ where: { classId } })

      // 6. The class itself
      await tx.class.delete({ where: { id: classId } })
    })
  } catch (err) {
    console.error('[delete-class] failed:', classId, err)
    return NextResponse.json(
      { success: false, error: 'Failed to delete class, please try again', code: 'DELETE_FAILED' },
      { status: 500 }
    )
  }

  console.log('[delete-class] success:', classId)
  return NextResponse.json({ success: true })
}
