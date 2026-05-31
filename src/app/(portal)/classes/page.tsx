import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'
import { ClassBrowser } from './ClassBrowser'
import type { ClassData } from '@/components/ClassCard'
import { sortClasses } from '@/lib/class-order'
import { getCurrentAcademicYear } from '@/lib/academic-year'

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

export default async function ClassesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const CURRENT_YEAR = await getCurrentAcademicYear()
  const cookieStore = await cookies()
  const lang = cookieStore.get('preferredLanguage')?.value ?? 'zh'
  const t = (zh: string, en: string) => lang === 'zh' ? zh : en
  const classes = sortClasses(await fetchClasses(CURRENT_YEAR))
  const chineseClasses = classes.filter((c) => c.type === 'CHINESE')
  const artsClasses = classes.filter((c) => c.type === 'ARTS')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('欢迎，', 'Welcome, ')}{session.user?.name ?? t('家长', 'Parent')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t(`${CURRENT_YEAR} 学年`, `${CURRENT_YEAR} Academic Year`)}
          </p>
        </div>

        <ClassBrowser chineseClasses={chineseClasses} artsClasses={artsClasses} />
      </div>
    </div>
  )
}
