import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

const schema = z.object({ registrationId: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { registrationId } = result.data

    const registration = await prisma.examRegistration.findUnique({
      where: { id: registrationId },
      include: {
        examSession: true,
        student: { include: { family: { include: { users: { select: { id: true } } } } } },
      },
    })

    if (!registration) {
      return NextResponse.json({ success: false, error: 'Registration not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Verify ownership
    if (!registration.student.family?.users.some((u) => u.id === session.user.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    if (registration.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { success: false, error: 'Registration is not pending payment', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const amount = registration.examSession.fee
    const amountCents = Math.round(parseFloat(amount.toString()) * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        examRegistrationId: registrationId,
        userId: session.user.id,
      },
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: amountCents,
        examType: registration.examSession.examType,
        level: registration.examSession.level,
        fee: amount.toString(),
      },
    })
  } catch (error) {
    console.error('Stripe exam-intent error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create payment intent', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
