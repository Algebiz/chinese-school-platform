import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEnrollments, checkTimeConflict } from '@/lib/enrollment-logic'
import { isReEnrollmentOpen } from '@/lib/re-enrollment-logic'
import { getCurrentAcademicYear } from '@/lib/academic-year'

const enrollSchema = z.object({
  studentId: z.string().min(1),
  classIds: z.array(z.string().min(1)).min(1),
  textbookIds: z.array(z.string()).optional().default([]),
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

    const CURRENT_YEAR = await getCurrentAcademicYear()
    const PREVIOUS_YEAR = CURRENT_YEAR.replace(/^(\d{4})-\d{4}$/, (_, a) => `${parseInt(a) - 1}-${a}`)

    const body = await req.json()
    const result = enrollSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { studentId, classIds, textbookIds } = result.data

    // Verify the student belongs to the logged-in user's family
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true },
    })
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { familyId: true },
    })

    if (!user?.familyId || student?.familyId !== user.familyId) {
      return NextResponse.json(
        { success: false, error: 'Student not found in your family', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Block if student already has PENDING enrollments for any requested class
    const existingPending = await prisma.enrollment.findMany({
      where: { studentId, classId: { in: classIds }, status: 'PENDING' },
      include: { class: { select: { name: true } } },
    })
    if (existingPending.length > 0) {
      const classNames = existingPending.map((e) => e.class.name).join(', ')
      return NextResponse.json(
        {
          success: false,
          code: 'PENDING_EXISTS',
          error: `This student already has a pending enrollment for ${classNames}. Please complete or cancel it before enrolling again.`,
          pendingEnrollmentIds: existingPending.map((e) => e.id),
        },
        { status: 409 }
      )
    }

    // Block if student is already confirmed in any of the requested classes
    const alreadyConfirmed = await prisma.enrollment.findFirst({
      where: { studentId, classId: { in: classIds }, status: 'CONFIRMED' },
      include: { class: { select: { name: true } } },
    })
    if (alreadyConfirmed) {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_ENROLLED',
          error: `Student is already enrolled in ${alreadyConfirmed.class.name}.`,
        },
        { status: 409 }
      )
    }

    // Block if any requested class has a schedule conflict with existing enrollments
    for (const classId of classIds) {
      const conflict = await checkTimeConflict(studentId, classId, CURRENT_YEAR)
      if (conflict.hasConflict) {
        return NextResponse.json(
          {
            success: false,
            code: 'TIME_CONFLICT',
            error: `Schedule conflict with existing class: ${conflict.conflictingClass?.name ?? 'another class'}`,
            conflictingClassName: conflict.conflictingClass?.name,
          },
          { status: 409 }
        )
      }
    }

    // Check enrollment window
    const [window, previousEnrollment] = await Promise.all([
      isReEnrollmentOpen(CURRENT_YEAR),
      prisma.enrollment.findFirst({
        where: { studentId, status: 'CONFIRMED', class: { year: PREVIOUS_YEAR } },
      }),
    ])
    const isReturning = !!previousEnrollment

    if (isReturning && !window.returningStudentsCanEnroll) {
      const openDate = window.reEnrollmentOpenDate?.toLocaleDateString('en-US') ?? '(TBD)'
      const newDate = window.newEnrollmentOpenDate?.toLocaleDateString('en-US') ?? '(TBD)'
      return NextResponse.json(
        {
          success: false,
          error: `老生优先报名开放于 ${openDate}，新生报名开放于 ${newDate}。/ Re-enrollment opens on ${openDate}. New student enrollment opens on ${newDate}.`,
          code: 'ENROLLMENT_NOT_OPEN',
        },
        { status: 403 }
      )
    }

    if (!isReturning && !window.newStudentsCanEnroll) {
      const newDate = window.newEnrollmentOpenDate?.toLocaleDateString('en-US') ?? '(TBD)'
      return NextResponse.json(
        {
          success: false,
          error: `新生报名开放于 ${newDate}。/ Enrollment for new students opens on ${newDate}.`,
          code: 'ENROLLMENT_NOT_OPEN',
        },
        { status: 403 }
      )
    }

    const { enrollments, waitlists } = await createEnrollments(studentId, classIds, textbookIds, CURRENT_YEAR)

    return NextResponse.json({
      success: true,
      data: {
        enrollments: enrollments.map((e) => ({
          id: e.id,
          classId: e.classId,
          status: e.status,
        })),
        waitlists: waitlists.map((w) => ({
          id: w.id,
          classId: w.classId,
          position: w.position,
        })),
      },
    })
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json(
      { success: false, error: 'Enrollment failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
