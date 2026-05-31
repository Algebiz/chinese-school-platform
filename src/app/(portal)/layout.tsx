import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageToggle } from '@/components/LanguageToggle'
import { PortalNavLinks, PortalNavLinksMobile } from '@/components/PortalNavLinks'

async function logout() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user?.role === 'TEACHER') redirect('/teacher/classes')

  const displayName = session.user?.name ?? session.user?.email ?? '家长'
  const isAdmin = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
            <PortalNavLinks />
          </div>

          {/* Right: toggle + admin switcher + username + logout */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md border border-[#CC0000] px-3 py-1.5 text-sm font-medium text-[#CC0000] bg-white hover:bg-[#CC0000] hover:text-white transition-colors whitespace-nowrap"
              >
                管理后台 / Admin ↗
              </Link>
            )}
            <span className="hidden lg:block text-sm text-gray-500 max-w-[140px] truncate">
              {displayName}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                退出 / Log out
              </button>
            </form>
          </div>
        </div>

        <PortalNavLinksMobile />
      </nav>

      <div className="flex-1">{children}</div>
      <LegalFooter />
    </div>
  )
}
