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

  const confirmedCount = await prisma.enrollment.count({
    where: { classId, status: 'CONFIRMED' },
  })
  if (confirmedCount > 0) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete class with confirmed enrollments', code: 'HAS_ENROLLMENTS' },
      { status: 409 }
    )
  }

  await prisma.$transaction(async (tx) => {
    const pendingIds = await tx.enrollment
      .findMany({ where: { classId, status: 'PENDING' }, select: { id: true } })
      .then((rows) => rows.map((r) => r.id))

    if (pendingIds.length > 0) {
      await tx.enrollmentTextbook.deleteMany({ where: { enrollmentId: { in: pendingIds } } })
      await tx.enrollment.deleteMany({ where: { id: { in: pendingIds } } })
    }

    await tx.waitlist.deleteMany({ where: { classId } })
    await tx.textbook.deleteMany({ where: { classId } })
    await tx.class.delete({ where: { id: classId } })
  })

  return NextResponse.json({ success: true })
}
