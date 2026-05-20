import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createOrder } from '@/lib/paypal'
import { calculateTotalFee } from '@/lib/enrollment-logic'

const schema = z.object({
  studentId: z.string().min(1),
  classIds: z.array(z.string().min(1)).min(1),
  academicYear: z.string().min(1),
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

    const { studentId, classIds, academicYear } = result.data
    const { total } = await calculateTotalFee(classIds)
    const amount = total.toNumber()

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    const orderId = await createOrder(amount, 'USD', {
      studentId,
      classIds,
      academicYear,
      userId: session.user.id,
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
