import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentsClient } from './StudentsClient'
import type { ReturningStudentRow, ChineseClassOption } from './StudentsClient'
import { CLASS_LEVEL_PROGRESSION } from '@/lib/class-levels'
import { sortClasses } from '@/lib/class-order'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export default async function AdminStudentsPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const CURRENT_YEAR = await getCurrentAcademicYear()
  const PREVIOUS_YEAR = CURRENT_YEAR.replace(/^(\d{4})-\d{4}$/, (_, a) => `${parseInt(a) - 1}-${a}`)
  const nextYear = CURRENT_YEAR

  // All students who had confirmed enrollments in the previous year
  const students = await prisma.student.findMany({
    where: {
      enrollments: { some: { status: 'CONFIRMED', class: { year: PREVIOUS_YEAR } } },
    },
    include: {
      enrollments: {
        where: { class: { year: PREVIOUS_YEAR }, status: 'CONFIRMED' },
        include: { class: { select: { id: true, name: true, nameEn: true, type: true } } },
      },
      nextClassOverrides: {
        where: { academicYear: nextYear },
        include: { class: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Current-year enrollment status for each student
  const currentEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      class: { year: CURRENT_YEAR },
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
    include: { class: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const currentEnrollmentMap = new Map<string, { status: string; className: string }>()
  for (const e of currentEnrollments) {
    if (!currentEnrollmentMap.has(e.studentId)) {
      currentEnrollmentMap.set(e.studentId, {
        status: e.status.toLowerCase(),
        className: e.class.name,
      })
    }
  }

  // All Chinese classes in the next year (for the override dropdown + suggested labels)
  const chineseClassesNextYear = sortClasses(await prisma.class.findMany({
    where: { year: nextYear, type: 'CHINESE' },
    select: { id: true, name: true, nameEn: true },
  }))
  const classNameMap = new Map(chineseClassesNextYear.map((c) => [c.id, c.name]))

  // Build rows
  const rows: ReturningStudentRow[] = students.map((student) => {
    const prevChinese = student.enrollments.find((e) => e.class.type === 'CHINESE')?.class ?? null

    // Compute suggested next classes from progression map
    const suggestedNames: string[] = []
    if (prevChinese?.nameEn && prevChinese.nameEn in CLASS_LEVEL_PROGRESSION) {
      const nextNames = CLASS_LEVEL_PROGRESSION[prevChinese.nameEn]
      for (const cls of chineseClassesNextYear) {
        if (cls.nameEn && nextNames.includes(cls.nameEn)) {
          suggestedNames.push(cls.name)
        }
      }
    }

    const override = student.nextClassOverrides[0] ?? null
    const curr = currentEnrollmentMap.get(student.id)

    return {
      studentId: student.id,
      studentName: student.name,
      previousChineseClass: prevChinese?.name ?? null,
      suggestedNextClasses: suggestedNames,
      adminOverrideClassId: override?.classId ?? null,
      adminOverrideClassName: override ? classNameMap.get(override.classId) ?? null : null,
      enrollmentStatus: (curr?.status as ReturningStudentRow['enrollmentStatus']) ?? 'none',
      currentYearClassName: curr?.className ?? null,
    }
  })

  const chineseClassOptions: ChineseClassOption[] = chineseClassesNextYear

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">学生管理 / Students</h1>
        <p className="mt-1 text-sm text-gray-500">
          老生续报管理 — {PREVIOUS_YEAR} 学年已报名学生，可为每人设置下学年推荐班级
        </p>
        <p className="text-xs text-gray-400">
          Returning student re-enrollment management — set next-year class overrides for {nextYear}
        </p>
      </div>
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
        <span>共 <strong>{rows.length}</strong> 名老生</span>
        <span>已报名 <strong className="text-green-600">{rows.filter((r) => r.enrollmentStatus === 'confirmed').length}</strong></span>
        <span>未报名 <strong className="text-gray-500">{rows.filter((r) => r.enrollmentStatus === 'none').length}</strong></span>
      </div>
      <StudentsClient rows={rows} chineseClassOptions={chineseClassOptions} currentYear={nextYear} />
    </div>
  )
}
