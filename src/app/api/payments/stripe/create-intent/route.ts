import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { calculateTotalFee } from '@/lib/enrollment-logic'

const schema = z.object({
  studentId: z.string().optional().default(''),
  classIds: z.array(z.string()).optional().default([]),
  textbookIds: z.array(z.string()).optional().default([]),
  academicYear: z.string().min(1),
  familyId: z.string().optional(),
  includesDeposit: z.boolean().optional().default(false),
  depositAmount: z.number().optional(),
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

    const { studentId, classIds, textbookIds, academicYear, familyId, includesDeposit, depositAmount: clientDepositAmount, examRegistrationIds } = result.data

    console.log('[create-intent] classIds:', classIds)
    console.log('[create-intent] examRegistrationIds:', examRegistrationIds)

    const { grandTotal, breakdown } = await calculateTotalFee(classIds, textbookIds)

    // Sum exam registration fees from DB (source of truth)
    let examTotal = 0
    if (examRegistrationIds.length > 0) {
      const examRegs = await prisma.examRegistration.findMany({
        where: { id: { in: examRegistrationIds }, status: 'PENDING_PAYMENT' },
        select: { amount: true, examSession: { select: { examType: true, level: true, fee: true } } },
      })
      for (const r of examRegs) {
        const fee = (r.amount ?? r.examSession.fee).toNumber()
        console.log('[create-intent] exam fee:', r.examSession.examType, r.examSession.level, fee)
        examTotal += fee
      }
    }

    const depositAmt = includesDeposit ? (clientDepositAmount ?? 100) : 0
    const totalWithAll = grandTotal.toNumber() + examTotal + depositAmt
    const amountCents = Math.round(totalWithAll * 100)
    console.log('[create-intent] enrollmentTotal:', grandTotal.toNumber(), 'examTotal:', examTotal, 'deposit:', depositAmt, 'total:', totalWithAll)

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
        examRegistrationIds: JSON.stringify(examRegistrationIds),
        academicYear,
        userId: session.user.id,
        includesDeposit: includesDeposit ? 'true' : 'false',
        familyId: familyId ?? '',
        depositAmount: depositAmt.toString(),
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
