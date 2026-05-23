import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentsClient } from './StudentsClient'
import type { StudentRow } from './StudentsClient'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { getStudentStatuses } from '@/lib/student-status'
import { sortByLastNamePinyin } from '@/lib/pinyin-sort'

export default async function AdminStudentsPage() {
  const session = await auth()
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN'))
    redirect('/dashboard')

  const CURRENT_YEAR = await getCurrentAcademicYear()

  const students = await prisma.student.findMany({
    where: {
      enrollments: { some: { status: 'CONFIRMED', class: { year: CURRENT_YEAR } } },
    },
    include: {
      enrollments: {
        where: { class: { year: CURRENT_YEAR }, status: 'CONFIRMED' },
        include: { class: { select: { name: true, type: true } } },
      },
      examRegistrations: {
        where: { status: 'CONFIRMED' },
        select: { id: true },
      },
      family: {
        include: {
          users: { select: { name: true, email: true }, take: 1 },
        },
      },
    },
  })

  const statuses = await getStudentStatuses(students.map((s) => s.id), CURRENT_YEAR)

  const sortedStudents = sortByLastNamePinyin(students, (s) => s.name, (s) => s.nameEn)

  const rows: StudentRow[] = sortedStudents.map((student) => {
    const parent = student.family?.users[0] ?? null
    return {
      studentId: student.id,
      studentName: student.name,
      studentNameEn: student.nameEn,
      birthDate: student.birthDate?.toISOString() ?? null,
      gender: student.gender ?? null,
      grade: student.grade ?? null,
      notes: student.notes ?? null,
      familyId: student.familyId,
      parentName: parent?.name ?? null,
      parentEmail: parent?.email ?? null,
      enrolledClasses: student.enrollments.map((e) => ({
        enrollmentId: e.id,
        name: e.class.name,
        type: e.class.type,
        enrolledAt: e.createdAt.toISOString(),
      })),
      status: statuses[student.id] ?? 'NEW',
      hasConfirmedExamRegs: student.examRegistrations.length > 0,
    }
  })

  const newCount = rows.filter((r) => r.status === 'NEW').length
  const returningCount = rows.filter((r) => r.status === 'RETURNING').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">学生管理 / Students</h1>
        <p className="mt-1 text-sm text-gray-500">
          {CURRENT_YEAR} 学年已报名学生 — 已确认报名（含新生和老生）
        </p>
        <p className="text-xs text-gray-400">
          Student Management — confirmed enrollments for {CURRENT_YEAR}
        </p>
      </div>
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
        <span>
          共 <strong>{rows.length}</strong> 名学生
        </span>
        <span>
          新生 <strong className="text-green-600">{newCount}</strong>
        </span>
        <span>
          老生 <strong className="text-blue-600">{returningCount}</strong>
        </span>
      </div>
      <StudentsClient rows={rows} />
    </div>
  )
}
