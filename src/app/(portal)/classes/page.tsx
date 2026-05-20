import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ClassBrowser } from './ClassBrowser'
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

export default async function ClassesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const classes = await fetchClasses()
  const chineseClasses = classes.filter((c) => c.type === 'CHINESE')
  const artsClasses = classes.filter((c) => c.type === 'ARTS')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            欢迎，{session.user?.name ?? '家长'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome · {CURRENT_YEAR} 学年 / Academic Year
          </p>
        </div>

        <ClassBrowser chineseClasses={chineseClasses} artsClasses={artsClasses} />
      </div>
    </div>
  )
}
