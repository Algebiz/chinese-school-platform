import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  academicYear: z.string().min(1),
  nextYear: z.string().min(1),
  reEnrollmentOpenDate: z.string().datetime(),
  newEnrollmentOpenDate: z.string().datetime(),
  volunteerDepositAmount: z.number().positive().optional(),
  volunteerClaimDeadline: z.string().datetime().optional(),
  volunteerDepositRequired: z.boolean().optional(),
})

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function GET() {
  const session = await verifyAdmin()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const config = await prisma.academicYearConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: config })
}

export async function POST(req: NextRequest) {
  const session = await verifyAdmin()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const { academicYear, nextYear, reEnrollmentOpenDate, newEnrollmentOpenDate, volunteerDepositAmount, volunteerClaimDeadline, volunteerDepositRequired } = result.data

  await prisma.academicYearConfig.updateMany({
    where: { academicYear: { not: academicYear } },
    data: { isActive: false },
  })

  const volunteerFields = {
    ...(volunteerDepositAmount !== undefined ? { volunteerDepositAmount } : {}),
    ...(volunteerClaimDeadline !== undefined ? { volunteerClaimDeadline: new Date(volunteerClaimDeadline) } : {}),
    ...(volunteerDepositRequired !== undefined ? { volunteerDepositRequired } : {}),
  }

  const config = await prisma.academicYearConfig.upsert({
    where: { academicYear },
    update: { nextYear, reEnrollmentOpenDate: new Date(reEnrollmentOpenDate), newEnrollmentOpenDate: new Date(newEnrollmentOpenDate), isActive: true, ...volunteerFields },
    create: { academicYear, nextYear, reEnrollmentOpenDate: new Date(reEnrollmentOpenDate), newEnrollmentOpenDate: new Date(newEnrollmentOpenDate), isActive: true, ...volunteerFields },
  })

  return NextResponse.json({ success: true, data: config })
}
