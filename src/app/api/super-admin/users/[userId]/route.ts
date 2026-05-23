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

  let step = 'init'
  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Student-level records ────────────────────────────────────────────
      step = 'collect-student-ids'
      const studentIds = user.familyId
        ? (await tx.student.findMany({ where: { familyId: user.familyId }, select: { id: true } })).map((s) => s.id)
        : []

      if (studentIds.length > 0) {
        step = 'collect-enrollment-ids'
        const enrollmentIds = (
          await tx.enrollment.findMany({ where: { studentId: { in: studentIds } }, select: { id: true } })
        ).map((e) => e.id)

        // ExamRegistration — no cascade from Student
        step = 'delete-exam-registrations'
        await tx.examRegistration.deleteMany({ where: { studentId: { in: studentIds } } })

        // AdjustmentLog (student side) — no @relation cascade
        step = 'delete-adjustment-logs-student'
        await tx.adjustmentLog.deleteMany({ where: { studentId: { in: studentIds } } })

        // Payment — EnrollmentTextbook cascades automatically from Enrollment
        step = 'delete-payments'
        await tx.payment.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } })

        step = 'delete-enrollments'
        await tx.enrollment.deleteMany({ where: { studentId: { in: studentIds } } })

        step = 'delete-waitlists'
        await tx.waitlist.deleteMany({ where: { studentId: { in: studentIds } } })

        step = 'delete-next-class-overrides'
        await tx.studentNextClassOverride.deleteMany({ where: { studentId: { in: studentIds } } })

        step = 'delete-students'
        await tx.student.deleteMany({ where: { id: { in: studentIds } } })
      }

      // ── 2. Family-level records ─────────────────────────────────────────────
      if (user.familyId) {
        // VolunteerClaim must be deleted before VolunteerDeposit (FK: claim.depositId)
        step = 'delete-volunteer-claims'
        await tx.volunteerClaim.deleteMany({ where: { familyId: user.familyId } })

        step = 'delete-volunteer-deposits'
        await tx.volunteerDeposit.deleteMany({ where: { familyId: user.familyId } })

        // Delete family only if this user is the sole member
        step = 'check-family-siblings'
        const siblingCount = await tx.user.count({ where: { familyId: user.familyId, id: { not: userId } } })
        if (siblingCount === 0) {
          step = 'delete-family'
          await tx.family.delete({ where: { id: user.familyId } })
        }
      }

      // ── 3. User-level records ───────────────────────────────────────────────
      // AdjustmentLog (admin side) — no cascade; clean up logs where this user was the admin
      step = 'delete-adjustment-logs-admin'
      await tx.adjustmentLog.deleteMany({ where: { adminId: userId } })

      step = 'delete-verification-tokens'
      await tx.verificationToken.deleteMany({ where: { identifier: user.email } })

      // Account + Session have onDelete: Cascade from User — handled automatically
      step = 'delete-user'
      await tx.user.delete({ where: { id: userId } })
    })
  } catch (error) {
    console.error('Delete user error at step:', step, error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
