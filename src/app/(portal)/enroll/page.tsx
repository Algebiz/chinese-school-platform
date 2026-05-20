import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EnrollFlow } from './EnrollFlow'
import type { ClassData } from '@/components/ClassCard'

const CURRENT_YEAR = '2025-2026'

async function fetchClasses(): Promise<ClassData[]> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/classes?academicYear=${CURRENT_YEAR}`, {
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
  searchParams: Promise<{ classIds?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { classIds: classIdsParam } = await searchParams
  const preselectedClassIds = classIdsParam ? classIdsParam.split(',').filter(Boolean) : []

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

  const allClasses = await fetchClasses()
  const chineseClasses = allClasses.filter((c) => c.type === 'CHINESE')
  const artsClasses = allClasses.filter((c) => c.type === 'ARTS')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
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
        />
      </div>
    </div>
  )
}
