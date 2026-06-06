import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { captureOrder } from '@/lib/paypal'
import { prisma } from '@/lib/db'
import { createEnrollments } from '@/lib/enrollment-logic'
import { sendEnrollmentConfirmationByIds, sendExamRegistrationReceived } from '@/lib/email'

const schema = z.object({
  orderId: z.string().min(1),
  studentId: z.string().optional().default(''),
  classIds: z.array(z.string()).optional().default([]),
  textbookIds: z.array(z.string()).optional().default([]),
  academicYear: z.string().min(1),
  familyId: z.string().optional(),
  includesDeposit: z.boolean().optional().default(false),
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

    const { orderId, studentId, classIds, textbookIds, academicYear, familyId, includesDeposit, examRegistrationIds } = result.data

    // Capture the PayPal order
    const captureResult = await captureOrder(orderId)

    const capture = captureResult.purchase_units?.[0]?.payments?.captures?.[0]
    if (!capture || capture.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed', code: 'PAYMENT_FAILED' },
        { status: 402 }
      )
    }

    // Handle enrollment items
    if (classIds.length > 0 && studentId) {
      await createEnrollments(studentId, classIds, textbookIds, academicYear)

      await prisma.$transaction(async (tx) => {
        await tx.enrollment.updateMany({
          where: { studentId, classId: { in: classIds }, status: 'PENDING' },
          data: { status: 'CONFIRMED' },
        })

        const enrollments = await tx.enrollment.findMany({
          where: { studentId, classId: { in: classIds }, status: 'CONFIRMED' },
          include: { class: { select: { fee: true } } },
        })

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
    }

    // Handle exam registration items
    if (examRegistrationIds.length > 0) {
      await prisma.examRegistration.updateMany({
        where: { id: { in: examRegistrationIds }, status: 'PENDING_PAYMENT' },
        data: {
          status: 'PAID',
          paymentMethod: 'PAYPAL',
          paypalOrderId: orderId,
          paidAt: new Date(),
        },
      })

      // Send confirmation emails for each exam registration — non-fatal
      for (const examRegId of examRegistrationIds) {
        try {
          const reg = await prisma.examRegistration.findUnique({
            where: { id: examRegId },
            include: {
              examSession: true,
              student: {
                include: { family: { include: { users: { select: { email: true, name: true } } } } },
              },
            },
          })
          if (reg) {
            const parentUser = reg.student.family?.users[0]
            if (parentUser?.email) {
              const s = reg.examSession
              await sendExamRegistrationReceived(parentUser.email, {
                parentName: parentUser.name ?? '家长',
                studentName: reg.studentNameZh,
                examType: s.examType,
                level: s.level,
                examDate: s.examDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                location: s.location,
                locationZh: s.locationZh,
                fee: s.fee.toString(),
                registrationId: examRegId,
                academicYear: s.academicYear,
              })
            }
          }
        } catch (err) {
          console.error('Failed to send exam confirmation email for', examRegId, err)
        }
      }
    }

    // Handle volunteer deposit — non-fatal
    if (includesDeposit && familyId) {
      try {
        await prisma.volunteerDeposit.upsert({
          where: { familyId_academicYear: { familyId, academicYear } },
          create: {
            familyId,
            academicYear,
            amount: 100,
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: 'PAYPAL',
            paypalOrderId: orderId,
          },
          update: {
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: 'PAYPAL',
            paypalOrderId: orderId,
          },
        })
      } catch (err) {
        console.error('Failed to create/update volunteer deposit (PayPal):', err)
      }
    }

    // Clear cart items now that payment is confirmed — non-fatal
    if (familyId) {
      try {
        await prisma.cartItem.deleteMany({ where: { familyId } })
      } catch (err) {
        console.error('Failed to clear cart after PayPal payment:', err)
      }
    }

    // Enrollment confirmation email — non-fatal
    if (classIds.length > 0 && studentId) {
      try {
        await sendEnrollmentConfirmationByIds(studentId, classIds, textbookIds, 'PAYPAL', orderId, academicYear)
      } catch (err) {
        console.error('Failed to send enrollment confirmation email:', err)
      }
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
