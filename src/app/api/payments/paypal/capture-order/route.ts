import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { captureOrder } from '@/lib/paypal'
import { prisma } from '@/lib/db'
import { createEnrollments } from '@/lib/enrollment-logic'
import { sendEnrollmentConfirmationByIds } from '@/lib/email'

const schema = z.object({
  orderId: z.string().min(1),
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

    const { orderId, studentId, classIds, academicYear } = result.data

    // Capture the PayPal order
    const captureResult = await captureOrder(orderId)

    const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0]
    if (!capture || capture.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed', code: 'PAYMENT_FAILED' },
        { status: 402 }
      )
    }

    // Ensure enrollment records exist (skips duplicates automatically)
    await createEnrollments(studentId, classIds, academicYear)

    await prisma.$transaction(async (tx) => {
      // Promote PENDING → CONFIRMED
      await tx.enrollment.updateMany({
        where: { studentId, classId: { in: classIds }, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      })

      // Fetch confirmed enrollments with class fees
      const enrollments = await tx.enrollment.findMany({
        where: { studentId, classId: { in: classIds }, status: 'CONFIRMED' },
        include: { class: { select: { fee: true } } },
      })

      // Create one Payment record per enrollment (idempotent)
      for (const enrollment of enrollments) {
        const exists = await tx.payment.findFirst({
          where: { enrollmentId: enrollment.id, paypalOrderId: orderId },
        })
        if (!exists) {
          await tx.payment.create({
            data: {
              enrollmentId: enrollment.id,
              amount: enrollment.class.fee,
              method: 'PAYPAL',
              status: 'COMPLETED',
              paypalOrderId: orderId,
              paidAt: new Date(),
            },
          })
        }
      }
    })

    // Non-fatal email
    try {
      await sendEnrollmentConfirmationByIds(studentId, classIds, 'PAYPAL', orderId)
    } catch (err) {
      console.error('Failed to send confirmation email:', err)
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: captureResult.id,
        status: captureResult.status,
        captureId: capture.id,
        amount: capture.amount,
      },
    })
  } catch (error) {
    console.error('PayPal capture-order error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to capture PayPal order', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
