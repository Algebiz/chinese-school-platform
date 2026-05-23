import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendUnenrollmentNotification, sendWaitlistPromotion } from '@/lib/email'

const schema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const session = await auth()
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { enrollmentId } = await params
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }
    const { reason } = result.data

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: { select: { id: true, name: true, year: true } },
        student: {
          include: {
            family: { include: { users: { select: { name: true, email: true } } } },
          },
        },
      },
    })

    if (!enrollment || enrollment.status !== 'CONFIRMED') {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found or not confirmed', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const firstWaitlistEntry = await prisma.$transaction(async (tx) => {
      // Cancel the enrollment
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'CANCELLED' },
      })

      // Audit log — toClassId = null marks this as unenrollment (not transfer)
      await tx.adjustmentLog.create({
        data: {
          studentId: enrollment.studentId,
          adminId: session.user.id,
          fromClassId: enrollment.classId,
          toClassId: null,
          reason,
        },
      })

      // Check waitlist
      const waitlistEntry = await tx.waitlist.findFirst({
        where: { classId: enrollment.classId },
        orderBy: { position: 'asc' },
        include: {
          student: {
            include: {
              family: { include: { users: { select: { name: true, email: true } } } },
            },
          },
        },
      })

      if (waitlistEntry) {
        await tx.waitlist.update({
          where: { id: waitlistEntry.id },
          data: { notified: true },
        })
      }

      return waitlistEntry ?? null
    })

    // Send cancellation email to parent (non-fatal)
    try {
      const parent = enrollment.student.family?.users[0]
      if (parent?.email) {
        await sendUnenrollmentNotification(parent.email, {
          parentName: parent.name ?? '家长',
          studentName: enrollment.student.name,
          className: enrollment.class.name,
          reason,
          cancelledAt: new Date(),
          academicYear: enrollment.class.year,
        })
      }
    } catch (err) {
      console.error('Failed to send unenrollment email:', err)
    }

    // Notify first waitlist student (non-fatal)
    if (firstWaitlistEntry) {
      try {
        const waitlistParent = firstWaitlistEntry.student.family?.users[0]
        if (waitlistParent?.email) {
          await sendWaitlistPromotion(waitlistParent.email, {
            parentName: waitlistParent.name ?? '家长',
            studentName: firstWaitlistEntry.student.name,
            className: enrollment.class.name,
            requiresPayment: true,
          })
        }
      } catch (err) {
        console.error('Failed to send waitlist promotion email:', err)
      }
    }

    return NextResponse.json({
      success: true,
      waitlistNotified: !!firstWaitlistEntry,
      waitlistStudentName: firstWaitlistEntry?.student.name,
    })
  } catch (error) {
    console.error('Unenroll error:', error)
    return NextResponse.json(
      { success: false, error: 'Unenrollment failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
