import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendVolunteerRefundProcessed } from '@/lib/email'

const schema = z.object({
  refundNotes: z.string().optional(),
})

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { depositId } = await params
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { refundNotes } = result.data

    const deposit = await prisma.volunteerDeposit.findUnique({
      where: { id: depositId },
      include: {
        family: {
          include: { users: { select: { email: true, name: true } } },
        },
      },
    })

    if (!deposit) {
      return NextResponse.json(
        { success: false, error: 'Deposit not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (deposit.status !== 'CLAIM_APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Deposit must be CLAIM_APPROVED to mark as refunded', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const updated = await prisma.volunteerDeposit.update({
      where: { id: depositId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundedBy: session.user.id,
        refundNotes: refundNotes ?? null,
      },
    })

    try {
      const parentUser = deposit.family.users[0]
      if (parentUser?.email) {
        await sendVolunteerRefundProcessed(parentUser.email, {
          parentName: parentUser.name ?? '家长',
          amount: deposit.amount.toNumber(),
          refundNotes: refundNotes ?? null,
          academicYear: deposit.academicYear,
        })
      }
    } catch (err) {
      console.error('Failed to send refund processed email:', err)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/volunteer/deposits/[depositId]/refund error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark refund', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
