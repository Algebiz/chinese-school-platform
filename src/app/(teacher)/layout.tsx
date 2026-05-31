import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'

async function logout() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role

  if (!session) redirect('/login')
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') redirect('/dashboard')

  const displayName = session.user?.name ?? session.user?.email ?? '教师'

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <span className="font-bold text-red-400 shrink-0">教师门户 / Teacher Portal</span>
          <div className="flex gap-4 ml-4">
            <Link href="/teacher/classes" className="text-sm text-gray-300 hover:text-white transition-colors">
              我的班级 / My Classes
            </Link>
            <Link href="/contact" className="text-sm text-gray-300 hover:text-white transition-colors">
              联系管理员 / Contact Admin
            </Link>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-400 max-w-[160px] truncate">
              {displayName}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-gray-600 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                退出 / Log out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>

      <LegalFooter />
    </div>
  )
}
