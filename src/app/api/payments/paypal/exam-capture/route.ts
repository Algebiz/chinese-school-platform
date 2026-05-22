import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { captureOrder } from '@/lib/paypal'
import { prisma } from '@/lib/db'
import { sendExamRegistrationReceived } from '@/lib/email'

const schema = z.object({
  orderId: z.string().min(1),
  registrationId: z.string().min(1),
})

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

    const { orderId, registrationId } = result.data

    const registration = await prisma.examRegistration.findUnique({
      where: { id: registrationId },
      include: {
        examSession: true,
        student: {
          include: { family: { include: { users: { select: { id: true, email: true, name: true } } } } },
        },
      },
    })

    if (!registration) {
      return NextResponse.json({ success: false, error: 'Registration not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    if (!registration.student.family?.users.some((u) => u.id === session.user.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const captureResult = await captureOrder(orderId)
    const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0]
    if (!capture || capture.status !== 'COMPLETED') {
      return NextResponse.json({ success: false, error: 'Payment not completed', code: 'PAYMENT_FAILED' }, { status: 402 })
    }

    await prisma.examRegistration.update({
      where: { id: registrationId },
      data: {
        status: 'PAID',
        paymentMethod: 'PAYPAL',
        paypalOrderId: orderId,
        paidAt: new Date(),
      },
    })

    // Send confirmation email — non-fatal
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
          registrationId,
          academicYear: s.academicYear,
        })
      }
    } catch (err) {
      console.error('Failed to send exam registration email:', err)
    }

    return NextResponse.json({ success: true, data: { orderId: captureResult.id, status: captureResult.status } })
  } catch (error) {
    console.error('PayPal exam-capture error:', error)
    return NextResponse.json({ success: false, error: 'Failed to capture PayPal order', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
