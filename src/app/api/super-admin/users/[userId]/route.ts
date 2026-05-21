import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { userId } = await params

  if (userId === session.user.id) {
    return NextResponse.json({ success: false, error: 'Cannot delete yourself', code: 'FORBIDDEN' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, familyId: true },
  })
  if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })

  // Guard: cannot delete the last SUPER_ADMIN
  if (user.role === 'SUPER_ADMIN') {
    const count = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (count <= 1) {
      return NextResponse.json({ success: false, error: 'Cannot delete the last SUPER_ADMIN', code: 'LAST_SUPER_ADMIN' }, { status: 400 })
    }
  }

  await prisma.$transaction(async (tx) => {
    // Collect student IDs for this family
    const studentIds = user.familyId
      ? (await tx.student.findMany({ where: { familyId: user.familyId }, select: { id: true } })).map((s) => s.id)
      : []

    if (studentIds.length > 0) {
      const enrollmentIds = (
        await tx.enrollment.findMany({ where: { studentId: { in: studentIds } }, select: { id: true } })
      ).map((e) => e.id)

      await tx.payment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } })
      await tx.enrollment.deleteMany({ where: { studentId: { in: studentIds } } })
      await tx.waitlist.deleteMany({ where: { studentId: { in: studentIds } } })
      await tx.studentNextClassOverride.deleteMany({ where: { studentId: { in: studentIds } } })
      await tx.student.deleteMany({ where: { id: { in: studentIds } } })
    }

    // Delete family only if this user is the sole member
    if (user.familyId) {
      const siblingCount = await tx.user.count({ where: { familyId: user.familyId, id: { not: userId } } })
      if (siblingCount === 0) {
        await tx.family.delete({ where: { id: user.familyId } })
      }
    }

    // Delete verification tokens
    await tx.verificationToken.deleteMany({ where: { identifier: user.email } })

    // Delete the user (Account + Session cascade automatically)
    await tx.user.delete({ where: { id: userId } })
  })

  return NextResponse.json({ success: true })
}
