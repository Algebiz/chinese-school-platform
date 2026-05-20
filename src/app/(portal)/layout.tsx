import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'

async function logout() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const displayName = session.user?.name ?? session.user?.email ?? '家长'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation bar */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Left: school name + nav links */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex flex-col leading-tight">
              <span className="font-bold text-red-700 text-base">XX中文学校</span>
              <span className="text-xs text-gray-400">XX Chinese School</span>
            </Link>
            <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-red-700 transition-colors"
              >
                仪表盘 / Dashboard
              </Link>
              <Link
                href="/classes"
                className="text-gray-600 hover:text-red-700 transition-colors"
              >
                班级 / Classes
              </Link>
              <Link
                href="/enroll"
                className="text-gray-600 hover:text-red-700 transition-colors"
              >
                报名 / Enroll
              </Link>
            </div>
          </div>

          {/* Right: user name + logout */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500 max-w-[160px] truncate">
              {displayName}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                退出 / Log out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav links */}
        <div className="flex sm:hidden items-center gap-5 px-4 pb-2 text-sm font-medium">
          <Link href="/dashboard" className="text-gray-600 hover:text-red-700">
            Dashboard
          </Link>
          <Link href="/classes" className="text-gray-600 hover:text-red-700">
            Classes
          </Link>
          <Link href="/enroll" className="text-gray-600 hover:text-red-700">
            Enroll
          </Link>
        </div>
      </nav>

      {/* Page content */}
      {children}
    </div>
  )
}
