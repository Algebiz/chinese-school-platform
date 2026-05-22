import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createOrder } from '@/lib/paypal'

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

    if (!registration.student.family?.users.some((u) => u.id === session.user.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    if (registration.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { success: false, error: 'Registration is not pending payment', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const amount = parseFloat(registration.examSession.fee.toString())

    // custom_id is limited to 127 chars — store just the registrationId with a prefix
    const orderId = await createOrder(amount, 'USD', {
      examRegistrationId: registrationId,
      userId: session.user.id,
    })

    return NextResponse.json({ success: true, data: { orderId } })
  } catch (error) {
    console.error('PayPal exam-order error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create PayPal order', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
