import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { processDepositRefund } from '@/lib/refund'
import { sendVolunteerRefundProcessed } from '@/lib/email'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const session = await auth()
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { depositId } = await params

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

    if (deposit.status !== 'CLAIM_APPROVED' && deposit.status !== 'REFUND_FAILED') {
      return NextResponse.json(
        { success: false, error: 'Deposit must be CLAIM_APPROVED to process refund', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const result = await processDepositRefund(depositId, session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, code: 'REFUND_FAILED' },
        { status: 500 }
      )
    }

    try {
      const parentUser = deposit.family.users[0]
      if (parentUser?.email) {
        await sendVolunteerRefundProcessed(parentUser.email, {
          parentName: parentUser.name ?? '家长',
          amount: deposit.amount.toNumber(),
          refundMethod: (result.refundMethod ?? 'stripe') as 'stripe' | 'paypal',
          refundId: result.refundId ?? '',
          academicYear: deposit.academicYear,
        })
      }
    } catch (err) {
      console.error('Failed to send refund processed email:', err)
    }

    return NextResponse.json({ success: true, refundId: result.refundId })
  } catch (error) {
    console.error('POST /api/admin/volunteer/deposits/[depositId]/refund error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process refund', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
