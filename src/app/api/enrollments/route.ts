import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createEnrollments, checkTimeConflict } from '@/lib/enrollment-logic'
import { isReEnrollmentOpen } from '@/lib/re-enrollment-logic'
import { getCurrentAcademicYear } from '@/lib/academic-year'

// ── Schemas ───────────────────────────────────────────────────────────────────

const singleSchema = z.object({
  studentId: z.string().min(1),
  classIds: z.array(z.string().min(1)).min(1),
  textbookIds: z.array(z.string()).optional().default([]),
})

const bulkSchema = z.object({
  enrollments: z.array(z.object({
    studentId: z.string().min(1),
    classIds: z.array(z.string().min(1)).min(1),
    textbookIds: z.array(z.string()).optional().default([]),
  })).min(1),
})

// ── Shared validation helpers ─────────────────────────────────────────────────

async function validateStudentOwnership(
  userId: string,
  studentIds: string[]
): Promise<{ ok: boolean; familyId?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { familyId: true } })
  if (!user?.familyId) return { ok: false }

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, familyId: true },
  })
  const allOwned = students.every(s => s.familyId === user.familyId) && students.length === studentIds.length
  return { ok: allOwned, familyId: user.familyId }
}

async function validateStudentEnrollment(
  studentId: string,
  classIds: string[],
  currentYear: string,
  previousYear: string
): Promise<{ error?: string; code?: string } | null> {
  // Block if student already has PENDING enrollments for any requested class
  const existingPending = await prisma.enrollment.findMany({
    where: { studentId, classId: { in: classIds }, status: 'PENDING' },
    include: { class: { select: { name: true } } },
  })
  if (existingPending.length > 0) {
    return {
      code: 'PENDING_EXISTS',
      error: `Already has a pending enrollment for ${existingPending.map(e => e.class.name).join(', ')}`,
    }
  }

  // Block if already confirmed in any requested class
  const alreadyConfirmed = await prisma.enrollment.findFirst({
    where: { studentId, classId: { in: classIds }, status: 'CONFIRMED' },
    include: { class: { select: { name: true } } },
  })
  if (alreadyConfirmed) {
    return { code: 'ALREADY_ENROLLED', error: `Already enrolled in ${alreadyConfirmed.class.name}` }
  }

  // Check for schedule conflicts
  for (const classId of classIds) {
    const conflict = await checkTimeConflict(studentId, classId, currentYear)
    if (conflict.hasConflict) {
      return {
        code: 'TIME_CONFLICT',
        error: `Schedule conflict with ${conflict.conflictingClass?.name ?? 'another class'}`,
      }
    }
  }

  // Check enrollment window
  const [window, previousEnrollment] = await Promise.all([
    isReEnrollmentOpen(currentYear),
    prisma.enrollment.findFirst({
      where: { studentId, status: 'CONFIRMED', class: { year: previousYear } },
    }),
  ])
  const isReturning = !!previousEnrollment

  if (isReturning && !window.returningStudentsCanEnroll) {
    const openDate = window.reEnrollmentOpenDate?.toLocaleDateString('en-US') ?? '(TBD)'
    return {
      code: 'ENROLLMENT_NOT_OPEN',
      error: `Re-enrollment opens on ${openDate}`,
    }
  }
  if (!isReturning && !window.newStudentsCanEnroll) {
    const newDate = window.newEnrollmentOpenDate?.toLocaleDateString('en-US') ?? '(TBD)'
    return {
      code: 'ENROLLMENT_NOT_OPEN',
      error: `New student enrollment opens on ${newDate}`,
    }
  }

  return null
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const CURRENT_YEAR = await getCurrentAcademicYear()
    const PREVIOUS_YEAR = CURRENT_YEAR.replace(/^(\d{4})-\d{4}$/, (_, a) => `${parseInt(a) - 1}-${a}`)

    const body = await req.json()

    // ── Bulk multi-student path ──────────────────────────────────────────────
    if (body.enrollments !== undefined) {
      const parsed = bulkSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
      }

      const studentIds = [...new Set(parsed.data.enrollments.map(e => e.studentId))]
      const { ok } = await validateStudentOwnership(session.user.id, studentIds)
      if (!ok) {
        return NextResponse.json({ success: false, error: 'One or more students not found in your family', code: 'FORBIDDEN' }, { status: 403 })
      }

      // Validate each student independently
      const errors: Array<{ studentId: string; studentName: string; error: string; code: string }> = []

      for (const item of parsed.data.enrollments) {
        const validationError = await validateStudentEnrollment(item.studentId, item.classIds, CURRENT_YEAR, PREVIOUS_YEAR)
        if (validationError) {
          const student = await prisma.student.findUnique({ where: { id: item.studentId }, select: { name: true } })
          errors.push({
            studentId: item.studentId,
            studentName: student?.name ?? item.studentId,
            error: validationError.error ?? 'Validation failed',
            code: validationError.code ?? 'UNKNOWN',
          })
        }
      }

      if (errors.length > 0) {
        return NextResponse.json({ success: false, errors }, { status: 409 })
      }

      // All valid — create all enrollments
      const allEnrollmentIds: string[] = []
      for (const item of parsed.data.enrollments) {
        const { enrollments } = await createEnrollments(item.studentId, item.classIds, item.textbookIds ?? [], CURRENT_YEAR)
        allEnrollmentIds.push(...enrollments.map(e => e.id))
      }

      return NextResponse.json({ success: true, enrollmentIds: allEnrollmentIds })
    }

    // ── Single student path (backwards compatible) ───────────────────────────
    const result = singleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const { studentId, classIds, textbookIds } = result.data

    const { ok } = await validateStudentOwnership(session.user.id, [studentId])
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Student not found in your family', code: 'FORBIDDEN' }, { status: 403 })
    }

    const validationError = await validateStudentEnrollment(studentId, classIds, CURRENT_YEAR, PREVIOUS_YEAR)
    if (validationError) {
      return NextResponse.json({ success: false, ...validationError }, { status: 409 })
    }

    const { enrollments, waitlists } = await createEnrollments(studentId, classIds, textbookIds ?? [], CURRENT_YEAR)

    return NextResponse.json({
      success: true,
      data: {
        enrollments: enrollments.map(e => ({ id: e.id, classId: e.classId, status: e.status })),
        waitlists: waitlists.map(w => ({ id: w.id, classId: w.classId, position: w.position })),
      },
    })
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json({ success: false, error: 'Enrollment failed', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
