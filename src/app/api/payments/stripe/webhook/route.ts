import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { sendEnrollmentConfirmationByIds, sendExamRegistrationReceived } from '@/lib/email'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata.examRegistrationId) {
        await handleExamPaymentSucceeded(pi)
      } else {
        await handlePaymentSucceeded(pi)
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
    }
  } catch (err) {
    console.error(`Webhook handler error [${event.type}]:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { studentId, classIds: classIdsJson, textbookIds: textbookIdsJson, academicYear } = paymentIntent.metadata
  if (!studentId || !classIdsJson || !academicYear) return

  const classIds = JSON.parse(classIdsJson) as string[]
  const textbookIds = textbookIdsJson ? (JSON.parse(textbookIdsJson) as string[]) : []

  await prisma.$transaction(async (tx) => {
    // Promote PENDING → CONFIRMED
    await tx.enrollment.updateMany({
      where: { studentId, classId: { in: classIds }, status: 'PENDING' },
      data: { status: 'CONFIRMED' },
    })

    // Fetch confirmed enrollments with fees
    const enrollments = await tx.enrollment.findMany({
      where: { studentId, classId: { in: classIds }, status: 'CONFIRMED' },
      include: { class: { select: { fee: true } } },
    })

    // Create one Payment record per enrollment (idempotent)
    for (const enrollment of enrollments) {
      const exists = await tx.payment.findFirst({
        where: { enrollmentId: enrollment.id, stripeIntentId: paymentIntent.id },
      })
      if (!exists) {
        await tx.payment.create({
          data: {
            enrollmentId: enrollment.id,
            amount: enrollment.class.fee,
            method: 'STRIPE',
            status: 'COMPLETED',
            stripeIntentId: paymentIntent.id,
            paidAt: new Date(),
          },
        })
      }
    }
  })

  // Send confirmation email — non-fatal if it fails
  try {
    await sendEnrollmentConfirmationByIds(studentId, classIds, textbookIds, 'STRIPE', paymentIntent.id, academicYear)
  } catch (err) {
    console.error('Failed to send confirmation email:', err)
  }
}

async function handleExamPaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { examRegistrationId } = paymentIntent.metadata
  if (!examRegistrationId) return

  const registration = await prisma.examRegistration.update({
    where: { id: examRegistrationId },
    data: {
      status: 'PAID',
      paymentMethod: 'STRIPE',
      stripePaymentIntentId: paymentIntent.id,
      paidAt: new Date(),
    },
    include: {
      examSession: true,
      student: {
        include: { family: { include: { users: { select: { email: true, name: true } } } } },
      },
    },
  })

  try {
    const parentUser = registration.student.family?.users[0]
    if (parentUser?.email) {
      const s = registration.examSession
      await sendExamRegistrationReceived(parentUser.email, {
        parentName: parentUser.name ?? '家长',
        studentName: registration.studentNameZh,
        examType: s.examType,
        level: s.level,
        examDate: s.examDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        location: s.location,
        locationZh: s.locationZh,
        fee: s.fee.toString(),
        registrationId: examRegistrationId,
        academicYear: s.academicYear,
      })
    }
  } catch (err) {
    console.error('Failed to send exam registration email:', err)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { studentId, classIds: classIdsJson } = paymentIntent.metadata
  if (!studentId || !classIdsJson) return

  const classIds = JSON.parse(classIdsJson) as string[]

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, classId: { in: classIds }, status: 'PENDING' },
    include: { class: { select: { fee: true } } },
  })

  for (const enrollment of enrollments) {
    const exists = await prisma.payment.findFirst({
      where: { enrollmentId: enrollment.id, stripeIntentId: paymentIntent.id },
    })
    if (!exists) {
      await prisma.payment.create({
        data: {
          enrollmentId: enrollment.id,
          amount: enrollment.class.fee,
          method: 'STRIPE',
          status: 'FAILED',
          stripeIntentId: paymentIntent.id,
        },
      })
    }
  }
}
