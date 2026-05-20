import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendWaitlistPromotion } from '@/lib/email'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ waitlistId: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const { waitlistId } = await params

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { id: waitlistId },
      include: {
        class: { select: { id: true, name: true, capacity: true } },
        student: {
          include: {
            family: { include: { users: { select: { name: true, email: true } } } },
          },
        },
      },
    })

    if (!waitlistEntry) {
      return NextResponse.json(
        { success: false, error: 'Waitlist entry not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify there is actually space
    const confirmedCount = await prisma.enrollment.count({
      where: { classId: waitlistEntry.classId, status: { in: ['PENDING', 'CONFIRMED'] } },
    })

    if (confirmedCount >= waitlistEntry.class.capacity) {
      return NextResponse.json(
        { success: false, error: 'Class is still full', code: 'CAPACITY_FULL' },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Create confirmed enrollment
      await tx.enrollment.create({
        data: {
          studentId: waitlistEntry.studentId,
          classId: waitlistEntry.classId,
          status: 'CONFIRMED',
        },
      })
      // Remove from waitlist
      await tx.waitlist.delete({ where: { id: waitlistId } })
      // Shift remaining positions
      await tx.waitlist.updateMany({
        where: { classId: waitlistEntry.classId, position: { gt: waitlistEntry.position } },
        data: { position: { decrement: 1 } },
      })
    })

    // Send promotion email (non-fatal)
    try {
      const parent = waitlistEntry.student.family?.users[0]
      if (parent?.email) {
        await sendWaitlistPromotion(parent.email, {
          parentName: parent.name ?? '家长',
          studentName: waitlistEntry.student.name,
          className: waitlistEntry.class.name,
          requiresPayment: false,
        })
      }
    } catch (err) {
      console.error('Failed to send promotion email:', err)
    }

    return NextResponse.json({ success: true, data: { promoted: true } })
  } catch (error) {
    console.error('Promote error:', error)
    return NextResponse.json(
      { success: false, error: 'Promotion failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
