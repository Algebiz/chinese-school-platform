import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendVolunteerClaimApproved, sendVolunteerClaimRejected } from '@/lib/email'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('APPROVE') }),
  z.object({ action: z.literal('REJECT'), rejectionReason: z.string().min(1) }),
  z.object({
    action: z.literal('UPDATE'),
    serviceId: z.string().optional(),
    description: z.string().min(1).optional(),
    photoUrl: z.string().nullable().optional(),
    status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).optional(),
    rejectionReason: z.string().nullable().optional(),
    adminNotes: z.string().nullable().optional(),
  }),
])

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { claimId } = await params
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const claim = await prisma.volunteerClaim.findUnique({
      where: { id: claimId },
      include: {
        deposit: true,
        service: { select: { name: true, nameZh: true } },
        family: {
          include: { users: { select: { email: true, name: true } } },
        },
      },
    })

    if (!claim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const parentUser = claim.family.users[0]
    const { action } = result.data

    if (action === 'APPROVE') {
      await prisma.$transaction(async (tx) => {
        await tx.volunteerClaim.update({
          where: { id: claimId },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
          },
        })
        await tx.volunteerDeposit.update({
          where: { id: claim.depositId },
          data: { status: 'CLAIM_APPROVED' },
        })
      })

      try {
        if (parentUser?.email) {
          await sendVolunteerClaimApproved(parentUser.email, {
            parentName: parentUser.name ?? '家长',
            serviceName: claim.service.name,
            serviceNameZh: claim.service.nameZh,
            academicYear: claim.academicYear,
          })
        }
      } catch (err) {
        console.error('Failed to send claim approved email:', err)
      }
    } else if (action === 'REJECT') {
      const { rejectionReason } = result.data

      await prisma.$transaction(async (tx) => {
        await tx.volunteerClaim.update({
          where: { id: claimId },
          data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
            rejectionReason,
          },
        })
        await tx.volunteerDeposit.update({
          where: { id: claim.depositId },
          data: { status: 'PAID' },
        })
      })

      try {
        if (parentUser?.email) {
          await sendVolunteerClaimRejected(parentUser.email, {
            parentName: parentUser.name ?? '家长',
            serviceName: claim.service.name,
            serviceNameZh: claim.service.nameZh,
            rejectionReason,
            academicYear: claim.academicYear,
          })
        }
      } catch (err) {
        console.error('Failed to send claim rejected email:', err)
      }
    } else {
      // action === 'UPDATE' — full field edit
      const { serviceId, description, photoUrl, status: newStatus, rejectionReason, adminNotes } = result.data
      const prevStatus = claim.status
      const isApproving = newStatus === 'APPROVED' && prevStatus !== 'APPROVED'
      const isRejecting = newStatus === 'REJECTED' && prevStatus !== 'REJECTED'

      await prisma.$transaction(async (tx) => {
        await tx.volunteerClaim.update({
          where: { id: claimId },
          data: {
            ...(serviceId !== undefined ? { serviceId } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(photoUrl !== undefined ? { photoUrl } : {}),
            ...(newStatus !== undefined ? { status: newStatus } : {}),
            ...(rejectionReason !== undefined ? { rejectionReason } : {}),
            ...(adminNotes !== undefined ? { adminNotes } : {}),
            ...(newStatus && newStatus !== prevStatus
              ? { reviewedAt: new Date(), reviewedBy: session.user.id }
              : {}),
          },
        })

        if (isApproving) {
          await tx.volunteerDeposit.update({
            where: { id: claim.depositId },
            data: { status: 'CLAIM_APPROVED' },
          })
        } else if (isRejecting) {
          await tx.volunteerDeposit.update({
            where: { id: claim.depositId },
            data: { status: 'PAID' },
          })
        }
      })

      if (isApproving) {
        try {
          if (parentUser?.email) {
            await sendVolunteerClaimApproved(parentUser.email, {
              parentName: parentUser.name ?? '家长',
              serviceName: claim.service.name,
              serviceNameZh: claim.service.nameZh,
              academicYear: claim.academicYear,
            })
          }
        } catch (err) {
          console.error('Failed to send claim approved email (UPDATE):', err)
        }
      } else if (isRejecting && rejectionReason) {
        try {
          if (parentUser?.email) {
            await sendVolunteerClaimRejected(parentUser.email, {
              parentName: parentUser.name ?? '家长',
              serviceName: claim.service.name,
              serviceNameZh: claim.service.nameZh,
              rejectionReason,
              academicYear: claim.academicYear,
            })
          }
        } catch (err) {
          console.error('Failed to send claim rejected email (UPDATE):', err)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/admin/volunteer/claims/[claimId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update claim', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { claimId } = await params

    const claim = await prisma.volunteerClaim.findUnique({
      where: { id: claimId },
      include: { deposit: { select: { id: true, status: true } } },
    })

    if (!claim) {
      return NextResponse.json({ success: false, error: 'Claim not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const shouldResetDeposit =
      claim.status === 'APPROVED' && claim.deposit.status === 'CLAIM_APPROVED'

    if (shouldResetDeposit) {
      await prisma.$transaction([
        prisma.volunteerClaim.delete({ where: { id: claimId } }),
        prisma.volunteerDeposit.update({
          where: { id: claim.depositId },
          data: { status: 'PAID' },
        }),
      ])
    } else {
      await prisma.volunteerClaim.delete({ where: { id: claimId } })
    }

    return NextResponse.json({ success: true, depositReset: shouldResetDeposit })
  } catch (error) {
    console.error('DELETE /api/admin/volunteer/claims/[claimId] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete claim', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
