import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createOrder } from '@/lib/paypal'
import { prisma } from '@/lib/db'
import { calculateTotalFee } from '@/lib/enrollment-logic'

const schema = z.object({
  studentId: z.string().optional().default(''),
  classIds: z.array(z.string()).optional().default([]),
  textbookIds: z.array(z.string()).optional().default([]),
  academicYear: z.string().min(1),
  familyId: z.string().optional(),
  includesDeposit: z.boolean().optional().default(false),
  examRegistrationIds: z.array(z.string()).optional().default([]),
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

    const { studentId, classIds, textbookIds, academicYear, familyId, includesDeposit, examRegistrationIds } = result.data
    const { grandTotal } = await calculateTotalFee(classIds, textbookIds)

    // Sum exam registration fees from DB
    let examTotal = 0
    if (examRegistrationIds.length > 0) {
      const examRegs = await prisma.examRegistration.findMany({
        where: { id: { in: examRegistrationIds }, status: 'PENDING_PAYMENT' },
        select: { amount: true, examSession: { select: { fee: true } } },
      })
      examTotal = examRegs.reduce((sum, r) => sum + (r.amount ?? r.examSession.fee).toNumber(), 0)
    }

    const depositAmt = includesDeposit ? 100 : 0
    const amount = grandTotal.toNumber() + examTotal + depositAmt

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    const orderId = await createOrder(amount, 'USD', {
      studentId,
      classIds,
      textbookIds,
      examRegistrationIds,
      academicYear,
      userId: session.user.id,
      familyId: familyId ?? '',
      includesDeposit: includesDeposit ? 'true' : 'false',
    })

    return NextResponse.json({ success: true, data: { orderId } })
  } catch (error) {
    console.error('PayPal create-order error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create PayPal order', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
