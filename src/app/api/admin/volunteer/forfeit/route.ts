import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendVolunteerDepositForfeited } from '@/lib/email'

const schema = z.object({
  depositIds: z.array(z.string().min(1)).min(1),
  reason: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden — SUPER_ADMIN only', code: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { depositIds, reason } = result.data

    let forfeited = 0

    for (const depositId of depositIds) {
      const deposit = await prisma.volunteerDeposit.findUnique({
        where: { id: depositId },
        include: {
          family: {
            include: { users: { select: { email: true, name: true } } },
          },
        },
      })

      if (!deposit || deposit.status !== 'PAID') continue

      await prisma.volunteerDeposit.update({
        where: { id: depositId },
        data: {
          status: 'FORFEITED',
          forfeitedAt: new Date(),
        },
      })

      forfeited++

      try {
        const parentUser = deposit.family.users[0]
        if (parentUser?.email) {
          await sendVolunteerDepositForfeited(parentUser.email, {
            parentName: parentUser.name ?? '家长',
            amount: deposit.amount.toNumber(),
            academicYear: deposit.academicYear,
            reason: reason ?? null,
          })
        }
      } catch (err) {
        console.error('Failed to send deposit forfeited email:', err)
      }
    }

    return NextResponse.json({ success: true, data: { forfeited } })
  } catch (error) {
    console.error('POST /api/admin/volunteer/forfeit error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to forfeit deposits', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
