import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendClassChangeNotification } from '@/lib/email'

const schema = z.object({
  newClassId: z.string().min(1),
  reason: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
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

    const { newClassId, reason } = result.data

    // Fetch current enrollment with all context needed for email
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        class: true,
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

    const newClass = await prisma.class.findUnique({
      where: { id: newClassId },
      select: { id: true, name: true, capacity: true },
    })

    if (!newClass) {
      return NextResponse.json(
        { success: false, error: 'Target class not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    let outcome: 'ENROLLED' | 'WAITLISTED'

    await prisma.$transaction(async (tx) => {
      // Mark old enrollment as TRANSFERRED
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: 'TRANSFERRED' },
      })

      // Check target class capacity
      const confirmedCount = await tx.enrollment.count({
        where: { classId: newClassId, status: { in: ['PENDING', 'CONFIRMED'] } },
      })

      if (confirmedCount < newClass.capacity) {
        // Space available — create confirmed enrollment
        await tx.enrollment.create({
          data: {
            studentId: enrollment.studentId,
            classId: newClassId,
            status: 'CONFIRMED',
          },
        })
        outcome = 'ENROLLED'
      } else {
        // Class full — add to waitlist
        const position = (await tx.waitlist.count({ where: { classId: newClassId } })) + 1
        await tx.waitlist.create({
          data: { studentId: enrollment.studentId, classId: newClassId, position },
        })
        outcome = 'WAITLISTED'
      }

      // Audit log
      await tx.adjustmentLog.create({
        data: {
          studentId: enrollment.studentId,
          adminId: session.user.id,
          fromClassId: enrollment.classId,
          toClassId: newClassId,
          reason: reason ?? 'Admin transfer',
        },
      })
    })

    // Send notification email (non-fatal)
    try {
      const parent = enrollment.student.family?.users[0]
      if (parent?.email) {
        await sendClassChangeNotification(parent.email, {
          parentName: parent.name ?? '家长',
          studentName: enrollment.student.name,
          fromClass: enrollment.class.name,
          toClass: newClass.name,
          reason: reason ?? '管理员调班 / Admin transfer',
        })
      }
    } catch (err) {
      console.error('Failed to send class-change email:', err)
    }

    return NextResponse.json({
      success: true,
      data: { outcome: outcome! },
    })
  } catch (error) {
    console.error('Transfer error:', error)
    return NextResponse.json(
      { success: false, error: 'Transfer failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
