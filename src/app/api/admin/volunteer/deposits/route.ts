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

const createSchema = z.object({
  familyId: z.string().min(1),
  academicYear: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(['PENDING', 'PAID', 'CLAIM_APPROVED', 'REFUNDED', 'FORFEITED']),
  paymentMethod: z.enum(['STRIPE', 'PAYPAL', 'OTHER']).nullable().optional(),
  paidAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    const deposits = await prisma.volunteerDeposit.findMany({
      where: statusFilter ? { status: statusFilter as never } : undefined,
      include: {
        family: {
          include: {
            users: { select: { id: true, name: true, email: true } },
          },
        },
        claims: {
          include: {
            service: { select: { name: true, nameZh: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: deposits })
  } catch (error) {
    console.error('GET /api/admin/volunteer/deposits error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deposits', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

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

    const { familyId, academicYear, amount, status, paymentMethod, paidAt, notes } = result.data

    const existing = await prisma.volunteerDeposit.findUnique({
      where: { familyId_academicYear: { familyId, academicYear } },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A deposit already exists for this family and academic year', code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    const deposit = await prisma.volunteerDeposit.create({
      data: {
        familyId,
        academicYear,
        amount,
        status,
        paymentMethod: paymentMethod as never ?? null,
        paidAt: paidAt ? new Date(paidAt) : (status === 'PAID' ? new Date() : null),
        notes: notes ?? null,
      },
      include: {
        family: { include: { users: { select: { id: true, name: true, email: true } } } },
        claims: { include: { service: { select: { name: true, nameZh: true } } } },
      },
    })

    return NextResponse.json({ success: true, data: deposit }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/volunteer/deposits error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create deposit', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
