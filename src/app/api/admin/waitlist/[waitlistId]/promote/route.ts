import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendWaitlistSpotAvailable } from '@/lib/email'

const NOTIFY_WINDOW_HOURS = 48
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://chinese-school-platform.vercel.app'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ waitlistId: string }> }
) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
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

    // Notify the parent — do NOT enroll directly. The parent must log in and
    // complete enrollment themselves; the spot is reserved only by the
    // notifyExpiry deadline (admin re-notifies or moves to the next student if missed).
    const notifiedAt = new Date()
    const notifyExpiry = new Date(notifiedAt.getTime() + NOTIFY_WINDOW_HOURS * 60 * 60 * 1000)

    await prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'NOTIFIED', notified: true, notifiedAt, notifyExpiry },
    })

    // Send spot-available email (non-fatal — the waitlist status change is the
    // source of truth and the parent dashboard also surfaces this notification)
    try {
      const parent = waitlistEntry.student.family?.users[0]
      if (parent?.email) {
        await sendWaitlistSpotAvailable(parent.email, {
          parentName: parent.name ?? '家长',
          studentName: waitlistEntry.student.name,
          className: waitlistEntry.class.name,
          expiryDate: notifyExpiry,
          enrollUrl: `${BASE_URL}/enroll`,
        })
      }
    } catch (err) {
      console.error('Failed to send waitlist spot-available email:', err)
    }

    // TODO: Add a cron job to check notifyExpiry and automatically move to the
    // next waitlisted student (mark this entry EXPIRED) when the deadline passes
    // without enrollment. For now, admin manually re-notifies or moves to next student.

    return NextResponse.json({ success: true, data: { notified: true, notifyExpiry: notifyExpiry.toISOString() } })
  } catch (error) {
    console.error('Promote error:', error)
    return NextResponse.json(
      { success: false, error: 'Promotion failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
