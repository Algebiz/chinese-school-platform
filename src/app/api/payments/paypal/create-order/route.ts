import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createOrder } from '@/lib/paypal'
import { calculateTotalFee } from '@/lib/enrollment-logic'

const schema = z.object({
  studentId: z.string().min(1),
  classIds: z.array(z.string().min(1)).min(1),
  textbookIds: z.array(z.string()).optional().default([]),
  academicYear: z.string().min(1),
  familyId: z.string().optional(),
  includesDeposit: z.boolean().optional().default(false),
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

    const { studentId, classIds, textbookIds, academicYear, familyId, includesDeposit } = result.data
    const { grandTotal } = await calculateTotalFee(classIds, textbookIds)

    // Read deposit amount from config or default 100
    const depositAmt = includesDeposit ? 100 : 0
    const amount = grandTotal.toNumber() + depositAmt

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
