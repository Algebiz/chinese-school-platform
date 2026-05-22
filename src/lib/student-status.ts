import { prisma } from '@/lib/db'

export type StudentStatus = 'NEW' | 'RETURNING'

function getPreviousYear(currentYear: string): string {
  const [start, end] = currentYear.split('-').map(Number)
  return `${start - 1}-${end - 1}`
}

export async function getStudentStatus(
  studentId: string,
  currentYear: string
): Promise<StudentStatus> {
  const previousYear = getPreviousYear(currentYear)
  const prev = await prisma.enrollment.findFirst({
    where: { studentId, status: 'CONFIRMED', class: { year: previousYear } },
  })
  return prev ? 'RETURNING' : 'NEW'
}

export async function getStudentStatuses(
  studentIds: string[],
  currentYear: string
): Promise<Record<string, StudentStatus>> {
  if (studentIds.length === 0) return {}
  const previousYear = getPreviousYear(currentYear)
  const prevEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'CONFIRMED',
      class: { year: previousYear },
    },
    select: { studentId: true },
  })
  const returningIds = new Set(prevEnrollments.map((e) => e.studentId))
  return Object.fromEntries(
    studentIds.map((id) => [id, returningIds.has(id) ? 'RETURNING' : 'NEW'])
  )
}
