import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CLAIM_PENDING', 'CLAIM_APPROVED', 'REFUNDED', 'FORFEITED', 'REFUND_FAILED']).optional(),
  amount: z.number().positive().optional(),
  paymentMethod: z.enum(['STRIPE', 'PAYPAL', 'OTHER']).nullable().optional(),
  paidAt: z.string().nullable().optional(),
  refundedAt: z.string().nullable().optional(),
  forfeitedAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

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
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { paidAt, refundedAt, forfeitedAt, ...rest } = result.data

    const updated = await prisma.volunteerDeposit.update({
      where: { id: depositId },
      data: {
        ...rest,
        ...(paidAt !== undefined ? { paidAt: paidAt ? new Date(paidAt) : null } : {}),
        ...(refundedAt !== undefined ? { refundedAt: refundedAt ? new Date(refundedAt) : null } : {}),
        ...(forfeitedAt !== undefined ? { forfeitedAt: forfeitedAt ? new Date(forfeitedAt) : null } : {}),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/volunteer/deposits/[depositId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update deposit', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { depositId } = await params

    const deposit = await prisma.volunteerDeposit.findUnique({
      where: { id: depositId },
      include: { claims: { select: { id: true, status: true } } },
    })

    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const hasBlockerClaim = deposit.claims.some((c) => c.status === 'APPROVED')
    if (hasBlockerClaim || deposit.status === 'REFUNDED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete deposit with approved claims or a refunded deposit',
          code: 'HAS_APPROVED_CLAIMS',
        },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.volunteerClaim.deleteMany({
        where: { depositId, status: { in: ['PENDING_REVIEW', 'REJECTED'] } },
      }),
      prisma.volunteerDeposit.delete({ where: { id: depositId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/volunteer/deposits/[depositId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete deposit', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
