import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { EnrollFlow } from './EnrollFlow'
import { getReturningStudentData } from '@/lib/re-enrollment-logic'
import type { ClassData } from '@/components/ClassCard'

async function fetchClasses(year: string): Promise<ClassData[]> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/classes?academicYear=${year}`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.success ? json.data : []
  } catch {
    return []
  }
}

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ classIds?: string; studentId?: string; artsOnly?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const CURRENT_YEAR = await getCurrentAcademicYear()
  const PREVIOUS_YEAR = CURRENT_YEAR.replace(/^(\d{4})-\d{4}$/, (_, a) => `${parseInt(a) - 1}-${a}`)

  const { classIds: classIdsParam, studentId: studentIdParam, artsOnly: artsOnlyParam } = await searchParams
  const preselectedClassIds = classIdsParam ? classIdsParam.split(',').filter(Boolean) : []
  const wantsArtsOnly = artsOnlyParam === 'true' && !!studentIdParam

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })

  const students = user?.familyId
    ? await prisma.student.findMany({
        where: { familyId: user.familyId },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const serializedStudents = students.map((s) => ({
    id: s.id,
    name: s.name,
    nameEn: s.nameEn,
    birthDate: s.birthDate?.toISOString() ?? null,
    grade: s.grade,
  }))

  // For arts-only flow: fetch the student's confirmed language class
  let confirmedLanguageClass: {
    id: string; name: string; nameEn: string | null; teacherName: string | null; schedule: string
  } | null = null
  let initialStudentId: string | null = null
  let initialStep: 1 | 3 = 1

  if (wantsArtsOnly && studentIdParam) {
    const studentBelongsToFamily = students.some((s) => s.id === studentIdParam)
    if (studentBelongsToFamily) {
      const confirmedEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: studentIdParam,
          status: 'CONFIRMED',
          class: { type: 'CHINESE', year: CURRENT_YEAR },
        },
        include: {
          class: {
            include: { teacher: { select: { name: true } } },
          },
        },
      })
      if (confirmedEnrollment) {
        const sched = confirmedEnrollment.class.schedule as Record<string, string> | null
        confirmedLanguageClass = {
          id: confirmedEnrollment.class.id,
          name: confirmedEnrollment.class.name,
          nameEn: confirmedEnrollment.class.nameEn,
          teacherName: confirmedEnrollment.class.teacher?.name ?? null,
          schedule: sched
            ? [sched.dayOfWeek, sched.startTime && sched.endTime ? `${sched.startTime}–${sched.endTime}` : ''].filter(Boolean).join(' ')
            : '',
        }
        initialStudentId = studentIdParam
        initialStep = 3
      }
    }
  }

  const [allClasses, ...returningInfoList] = await Promise.all([
    fetchClasses(CURRENT_YEAR),
    ...students.map((s) => getReturningStudentData(s.id, PREVIOUS_YEAR)),
  ])

  const returningStudentData: Record<string, ReturnType<typeof getReturningStudentData> extends Promise<infer T> ? T : never> = {}
  students.forEach((s, i) => {
    returningStudentData[s.id] = returningInfoList[i] as Awaited<ReturnType<typeof getReturningStudentData>>
  })

  const chineseClasses = allClasses.filter((c) => c.type === 'CHINESE')
  const artsClasses = allClasses.filter((c) => c.type === 'ARTS')

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">学生报名</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enrollment · {CURRENT_YEAR} 学年 / Academic Year
          </p>
        </div>
        <EnrollFlow
          initialStudents={serializedStudents}
          chineseClasses={chineseClasses}
          artsClasses={artsClasses}
          preselectedClassIds={preselectedClassIds}
          returningStudentData={returningStudentData}
          initialStudentId={initialStudentId}
          initialStep={initialStep}
          artsOnly={confirmedLanguageClass !== null}
          confirmedLanguageClass={confirmedLanguageClass}
        />
      </div>
    </div>
  )
}
