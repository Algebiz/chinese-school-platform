import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { getStudentStatuses } from '@/lib/student-status'
import { DashboardClient } from '@/components/portal/DashboardClient'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Phase 1: academic year + full user/family/students query — independent, run in parallel
  const [CURRENT_YEAR, user] = await Promise.all([
    getCurrentAcademicYear(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        familyId: true,
        family: {
          select: {
            students: {
              include: {
                enrollments: {
                  where: { status: { in: ['PENDING', 'CONFIRMED'] } },
                  include: {
                    class: { select: { id: true, name: true, nameEn: true, type: true, year: true, fee: true } },
                    textbooks: { include: { textbook: { select: { name: true } } } },
                  },
                  orderBy: { createdAt: 'asc' },
                },
                waitlists: {
                  include: { class: { select: { name: true, type: true, year: true } } },
                  orderBy: { position: 'asc' },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    }),
  ])

  const familyId = user?.familyId
  const students = user?.family?.students ?? []
  const studentIds = students.map((s) => s.id)

  // Phase 2: all queries that depend on Phase 1 results — run in parallel
  const [volunteerDeposit, classExamResults, examRegistrations, studentStatuses, firstEnrollments] =
    await Promise.all([
      familyId
        ? prisma.volunteerDeposit.findUnique({
            where: { familyId_academicYear: { familyId, academicYear: CURRENT_YEAR } },
          })
        : null,
      studentIds.length > 0
        ? prisma.classExamResult.findMany({
            where: {
              studentId: { in: studentIds },
              exam: { isPublished: true },
              score: { not: null },
            },
            include: {
              exam: {
                select: {
                  id: true,
                  name: true,
                  nameZh: true,
                  examDate: true,
                  maxScore: true,
                  class: { select: { name: true } },
                },
              },
              student: { select: { id: true, name: true } },
            },
            orderBy: { exam: { examDate: 'desc' } },
          })
        : [],
      studentIds.length > 0
        ? prisma.examRegistration.findMany({
            where: {
              studentId: { in: studentIds },
              status: { notIn: ['CANCELLED'] },
              examSession: { academicYear: CURRENT_YEAR },
            },
            include: {
              examSession: { select: { examType: true, level: true, examDate: true } },
              student: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      getStudentStatuses(studentIds, CURRENT_YEAR),
      studentIds.length > 0
        ? prisma.enrollment.findMany({
            where: { studentId: { in: studentIds }, status: 'CONFIRMED' },
            select: { studentId: true, class: { select: { year: true } } },
            orderBy: { createdAt: 'asc' },
          })
        : [],
    ])

  const studentsThisYear = students.map((s) => ({
    ...s,
    enrollments: s.enrollments.filter((e) => e.class.year === CURRENT_YEAR),
    waitlists: s.waitlists.filter((w) => w.class.year === CURRENT_YEAR),
  }))

  const totalConfirmed = studentsThisYear.reduce(
    (sum, s) => sum + s.enrollments.filter((e) => e.status === 'CONFIRMED').length,
    0
  )
  const pendingCount = studentsThisYear.flatMap((s) =>
    s.enrollments.filter((e) => e.status === 'PENDING')
  ).length
  const hasMultiplePending = studentsThisYear.some(
    (s) => s.enrollments.filter((e) => e.status === 'PENDING').length > 1
  )

  const firstYearByStudent: Record<string, string> = {}
  for (const e of firstEnrollments) {
    if (!firstYearByStudent[e.studentId]) firstYearByStudent[e.studentId] = e.class.year
  }

  const serializedStudents = studentsThisYear.map((s) => ({
    id: s.id,
    name: s.name,
    nameEn: s.nameEn,
    status: studentStatuses[s.id] ?? 'NEW',
    firstEnrollmentYear: firstYearByStudent[s.id] ?? null,
    enrollments: s.enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      class: {
        id: e.class.id,
        name: e.class.name,
        nameEn: e.class.nameEn ?? null,
        type: e.class.type,
        fee: e.class.fee.toString(),
      },
      textbooks: e.textbooks.map((et) => ({
        price: et.price.toString(),
        textbook: { name: et.textbook.name },
      })),
    })),
    waitlists: s.waitlists.map((w) => ({
      id: w.id,
      position: w.position,
      class: { name: w.class.name, type: w.class.type },
    })),
  }))

  return (
    <DashboardClient
      currentYear={CURRENT_YEAR}
      userName={user?.name ?? null}
      hasFamily={!!user?.familyId}
      studentCount={students.length}
      totalConfirmed={totalConfirmed}
      pendingCount={pendingCount}
      hasMultiplePending={hasMultiplePending}
      students={serializedStudents}
      volunteerDeposit={
        volunteerDeposit
          ? { status: volunteerDeposit.status, amount: volunteerDeposit.amount.toString() }
          : null
      }
      examRegistrations={examRegistrations.map((r) => ({
        id: r.id,
        status: r.status,
        studentName: r.student.name,
        examType: r.examSession.examType,
        level: r.examSession.level,
        examDate: r.examSession.examDate.toISOString(),
      }))}
      classExamResults={classExamResults.map((r) => ({
        id: r.id,
        score: r.score!,
        passed: r.passed ?? false,
        studentId: r.student.id,
        studentName: r.student.name,
        examName: r.exam.name,
        examNameZh: r.exam.nameZh,
        examDate: r.exam.examDate.toISOString(),
        maxScore: r.exam.maxScore,
        className: r.exam.class.name,
      }))}
    />
  )
}
