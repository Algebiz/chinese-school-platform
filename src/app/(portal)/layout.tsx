import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'

async function logout() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const displayName = session.user?.name ?? session.user?.email ?? '家长'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation bar */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          {/* Left: logo + nav links */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 leading-tight">
              <img src="/logo.png" alt="CCA Logo" className="h-9 w-9 object-contain" />
              <div className="hidden md:flex flex-col">
                <span className="font-bold text-red-700 text-sm leading-tight">夏洛特中文学校</span>
                <span className="text-[10px] text-gray-400 leading-tight">Charlotte Chinese Academy</span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-1">
              {[
                { href: '/dashboard', zh: '仪表盘', en: 'Dashboard' },
                { href: '/classes',   zh: '班级',   en: 'Classes'   },
                { href: '/enroll',    zh: '报名',   en: 'Enroll'    },
                { href: '/exams',     zh: '考试报名', en: 'Exams'   },
                { href: '/contact',   zh: '联系我们', en: 'Contact' },
              ].map(({ href, zh, en }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center rounded-md px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 hover:text-red-700 transition-colors"
                >
                  <span className="text-sm font-medium leading-tight">{zh}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{en}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right: user name + logout */}
          <div className="flex items-center gap-2">
            <span className="hidden lg:block text-sm text-gray-500 max-w-[140px] truncate">
              {displayName}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                退出
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav links — scrollable row */}
        <div className="flex sm:hidden items-center gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/classes',   label: 'Classes'   },
            { href: '/enroll',    label: 'Enroll'    },
            { href: '/exams',     label: 'Exams'     },
            { href: '/contact',   label: 'Contact'   },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-md px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-700 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <div className="flex-1">
        {children}
      </div>

      <LegalFooter />
    </div>
  )
}
