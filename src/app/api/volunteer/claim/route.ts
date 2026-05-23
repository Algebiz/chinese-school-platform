import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { sendVolunteerClaimSubmitted } from '@/lib/email'

const schema = z.object({
  serviceId: z.string().min(1),
  description: z.string().min(50, '描述至少需要50个字符 / Description must be at least 50 characters'),
  photoUrl: z.string().url().optional().or(z.literal('')),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { serviceId, description, photoUrl } = result.data

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true, email: true, name: true },
    })

    if (!user?.familyId) {
      return NextResponse.json(
        { success: false, error: 'No family found', code: 'NO_FAMILY' },
        { status: 400 }
      )
    }

    const academicYear = await getCurrentAcademicYear()

    // Check deposit exists and is PAID
    const deposit = await prisma.volunteerDeposit.findUnique({
      where: { familyId_academicYear: { familyId: user.familyId, academicYear } },
    })

    if (!deposit || deposit.status !== 'PAID') {
      return NextResponse.json(
        { success: false, error: 'No paid deposit found for this year', code: 'NO_PAID_DEPOSIT' },
        { status: 400 }
      )
    }

    // Check no existing active claim
    const existingClaim = await prisma.volunteerClaim.findFirst({
      where: {
        depositId: deposit.id,
        status: { in: ['PENDING_REVIEW', 'APPROVED'] },
      },
    })

    if (existingClaim) {
      return NextResponse.json(
        { success: false, error: 'A claim is already pending or approved for this deposit', code: 'CLAIM_EXISTS' },
        { status: 400 }
      )
    }

    // Check claim deadline if set
    const yearConfig = await prisma.academicYearConfig.findFirst({ where: { isActive: true } })
    if (yearConfig?.volunteerClaimDeadline && new Date() > yearConfig.volunteerClaimDeadline) {
      return NextResponse.json(
        { success: false, error: 'Volunteer claim deadline has passed', code: 'DEADLINE_PASSED' },
        { status: 400 }
      )
    }

    // Verify service exists
    const service = await prisma.volunteerService.findUnique({
      where: { id: serviceId },
    })

    if (!service) {
      return NextResponse.json(
        { success: false, error: 'Volunteer service not found', code: 'SERVICE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Create claim and update deposit in transaction
    const claim = await prisma.$transaction(async (tx) => {
      const newClaim = await tx.volunteerClaim.create({
        data: {
          depositId: deposit.id,
          familyId: user.familyId!,
          serviceId,
          academicYear,
          description,
          photoUrl: photoUrl || null,
          status: 'PENDING_REVIEW',
        },
      })

      await tx.volunteerDeposit.update({
        where: { id: deposit.id },
        data: { status: 'CLAIM_PENDING' },
      })

      return newClaim
    })

    // Send email notifications — non-fatal
    try {
      await sendVolunteerClaimSubmitted(user.email, {
        parentName: user.name ?? '家长',
        serviceName: service.name,
        serviceNameZh: service.nameZh,
        academicYear,
      })
    } catch (err) {
      console.error('Failed to send volunteer claim submitted email:', err)
    }

    try {
      const adminEmail = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? ''
      if (adminEmail) {
        await sendVolunteerClaimSubmitted(adminEmail, {
          parentName: user.name ?? user.email,
          serviceName: service.name,
          serviceNameZh: service.nameZh,
          academicYear,
        })
      }
    } catch (err) {
      console.error('Failed to send admin notification:', err)
    }

    return NextResponse.json({ success: true, data: claim })
  } catch (error) {
    console.error('POST /api/volunteer/claim error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit claim', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
