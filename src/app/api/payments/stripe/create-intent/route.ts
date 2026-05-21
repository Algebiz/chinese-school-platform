import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { calculateTotalFee } from '@/lib/enrollment-logic'

const schema = z.object({
  studentId: z.string().min(1),
  classIds: z.array(z.string().min(1)).min(1),
  textbookIds: z.array(z.string()).optional().default([]),
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

    const { studentId, classIds, textbookIds, academicYear } = result.data
    const { grandTotal, breakdown } = await calculateTotalFee(classIds, textbookIds)
    const amountCents = Math.round(grandTotal.toNumber() * 100)

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
        textbookIds: JSON.stringify(textbookIds),
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
        breakdown: breakdown.map((b) =>
          b.type === 'tuition'
            ? { type: 'tuition', classId: b.classId, className: b.className, fee: b.fee.toString() }
            : { type: 'textbook', textbookId: b.textbookId, textbookName: b.textbookName, classId: b.classId, fee: b.fee.toString() }
        ),
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
