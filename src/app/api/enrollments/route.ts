import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEnrollments } from '@/lib/enrollment-logic'
import { isReEnrollmentOpen } from '@/lib/re-enrollment-logic'

const enrollSchema = z.object({
  studentId: z.string().min(1),
  classIds: z.array(z.string().min(1)).min(1),
})

const CURRENT_YEAR = '2025-2026'
const PREVIOUS_YEAR = '2024-2025'

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
    const result = enrollSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { studentId, classIds } = result.data

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

    const { enrollments, waitlists } = await createEnrollments(studentId, classIds, CURRENT_YEAR)

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
