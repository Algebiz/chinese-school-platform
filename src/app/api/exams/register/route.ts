import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  examSessionId: z.string().min(1),
  studentId: z.string().min(1),
  notes: z.string().max(500).optional(),
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

    const { examSessionId, studentId, notes } = result.data

    // Verify exam session exists and is open
    const examSession = await prisma.examSession.findUnique({ where: { id: examSessionId } })
    if (!examSession || !examSession.isActive) {
      return NextResponse.json({ success: false, error: 'Exam session not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const now = new Date()
    if (examSession.registrationDeadline < now) {
      return NextResponse.json(
        { success: false, error: 'Registration deadline has passed', code: 'DEADLINE_PASSED' },
        { status: 400 }
      )
    }

    // Verify student belongs to this user's family
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { family: { include: { users: { select: { id: true } } } } },
    })
    if (!student || !student.family?.users.some((u) => u.id === session.user.id)) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Student must have at least one CONFIRMED class enrollment in the exam session's academic year
    const confirmedEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'CONFIRMED',
        class: { year: examSession.academicYear },
      },
    })
    if (!confirmedEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Student must have a confirmed class enrollment to register for exams', code: 'NO_CONFIRMED_ENROLLMENT' },
        { status: 400 }
      )
    }

    // Check capacity
    const registeredCount = await prisma.examRegistration.count({
      where: { examSessionId, status: { notIn: ['CANCELLED'] } },
    })
    if (registeredCount >= examSession.capacity) {
      return NextResponse.json(
        { success: false, error: 'Exam session is full', code: 'CAPACITY_FULL' },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await prisma.examRegistration.findUnique({
      where: { examSessionId_studentId: { examSessionId, studentId } },
    })
    if (existing) {
      if (existing.status === 'CANCELLED') {
        // Allow re-registration after cancellation — update existing record
        const updated = await prisma.examRegistration.update({
          where: { id: existing.id },
          data: {
            status: 'PENDING_PAYMENT',
            paymentMethod: null,
            stripePaymentIntentId: null,
            paypalOrderId: null,
            paidAt: null,
            amount: null,
            confirmedAt: null,
            confirmedBy: null,
            rejectedAt: null,
            rejectedBy: null,
            rejectionReason: null,
            notes: notes ?? null,
            studentNameZh: student.name,
            studentNameEn: student.nameEn ?? null,
            studentDob: student.birthDate ?? null,
          },
        })
        return NextResponse.json({ success: true, data: { registrationId: updated.id } })
      }
      return NextResponse.json(
        { success: false, error: 'Already registered for this exam', code: 'ALREADY_REGISTERED' },
        { status: 400 }
      )
    }

    const registration = await prisma.examRegistration.create({
      data: {
        examSessionId,
        studentId,
        status: 'PENDING_PAYMENT',
        studentNameZh: student.name,
        studentNameEn: student.nameEn ?? null,
        studentDob: student.birthDate ?? null,
        notes: notes ?? null,
        amount: examSession.fee,
      },
    })

    return NextResponse.json({ success: true, data: { registrationId: registration.id } })
  } catch (error) {
    console.error('POST /api/exams/register error:', error)
    return NextResponse.json({ success: false, error: 'Server error', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
