import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'
import { PortalNavLinks, PortalNavLinksMobile } from '@/components/PortalNavLinks'
import { PortalNavRight } from '@/components/portal/PortalNavRight'

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

          <PortalNavRight displayName={displayName} isAdmin={isAdmin} logout={logout} />
        </div>

        <PortalNavLinksMobile />
      </nav>

      <div className="flex-1">{children}</div>

      <LegalFooter />
    </div>
  )
}
