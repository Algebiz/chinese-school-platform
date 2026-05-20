import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
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
    const { total, breakdown } = await calculateTotalFee(classIds)
    const amountCents = Math.round(total.toNumber() * 100)

    if (amountCents <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount', code: 'INVALID_AMOUNT' },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        studentId,
        classIds: JSON.stringify(classIds),
        academicYear,
        userId: session.user.id,
      },
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: amountCents,
        breakdown: breakdown.map((b) => ({
          classId: b.classId,
          className: b.className,
          fee: b.fee.toString(),
        })),
      },
    })
  } catch (error) {
    console.error('Stripe create-intent error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
