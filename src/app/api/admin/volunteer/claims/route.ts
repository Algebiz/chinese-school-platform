import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendVolunteerClaimApproved } from '@/lib/email'

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

const createSchema = z.object({
  depositId: z.string().min(1),
  familyId: z.string().min(1),
  serviceId: z.string().min(1),
  description: z.string().min(1),
  photoUrl: z.string().nullable().optional(),
  status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).default('PENDING_REVIEW'),
  adminNotes: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const body = await req.json()
    const result = createSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { depositId, familyId, serviceId, description, photoUrl, status, adminNotes } = result.data

    const deposit = await prisma.volunteerDeposit.findUnique({
      where: { id: depositId },
      include: { family: { include: { users: { select: { email: true, name: true } } } } },
    })
    if (!deposit) {
      return NextResponse.json({ success: false, error: 'Deposit not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    if (!['PAID', 'CLAIM_PENDING'].includes(deposit.status)) {
      return NextResponse.json(
        { success: false, error: 'Deposit must be in PAID status to add a claim', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const claim = await prisma.$transaction(async (tx) => {
      const newClaim = await tx.volunteerClaim.create({
        data: {
          depositId,
          familyId,
          serviceId,
          description,
          photoUrl: photoUrl ?? null,
          status,
          adminNotes: adminNotes ?? null,
          academicYear: deposit.academicYear,
          reviewedAt: status !== 'PENDING_REVIEW' ? new Date() : null,
          reviewedBy: status !== 'PENDING_REVIEW' ? session.user.id : null,
        },
        include: { service: { select: { name: true, nameZh: true } } },
      })

      await tx.volunteerDeposit.update({
        where: { id: depositId },
        data: { status: status === 'APPROVED' ? 'CLAIM_APPROVED' : 'CLAIM_PENDING' },
      })

      return newClaim
    })

    if (status === 'APPROVED') {
      try {
        const parentUser = deposit.family.users[0]
        if (parentUser?.email) {
          await sendVolunteerClaimApproved(parentUser.email, {
            parentName: parentUser.name ?? '家长',
            serviceName: claim.service.name,
            serviceNameZh: claim.service.nameZh,
            academicYear: deposit.academicYear,
          })
        }
      } catch (err) {
        console.error('Failed to send claim approved email:', err)
      }
    }

    return NextResponse.json({ success: true, data: claim }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/volunteer/claims error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create claim', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
