import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageToggle } from '@/components/LanguageToggle'
import { LanguageText } from '@/components/LanguageText'
import { PortalNavLinks, PortalHamburger } from '@/components/PortalNavLinks'
import { AvatarMenu } from '@/components/AvatarMenu'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user?.role === 'TEACHER') redirect('/teacher/classes')

  const userName = session.user?.name ?? session.user?.email ?? '用户'
  const initials = getInitials(userName)
  const role = session.user?.role as 'PARENT' | 'ADMIN' | 'SUPER_ADMIN'
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm relative">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: logo + desktop nav */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
              <img src="/logo.png" alt="CCA Logo" className="h-9 w-9 object-contain" />
              <LanguageText
                zh="夏洛特中文学校"
                en="Charlotte Chinese Academy"
                className="hidden md:block font-bold text-red-700 text-sm"
              />
            </Link>
            <PortalNavLinks />
          </div>

          {/* Right: hamburger (mobile) + toggle + divider + avatar */}
          <div className="flex items-center gap-2">
            <PortalHamburger />
            <LanguageToggle />
            <div className="hidden sm:block w-px h-5 bg-gray-200" />
            <AvatarMenu
              userName={userName}
              initials={initials}
              portalLink={isAdmin ? { href: '/admin', labelZh: '管理后台', labelEn: 'Admin Portal' } : undefined}
            />
          </div>
        </div>
      </nav>

      <div className="flex-1">{children}</div>
      <LegalFooter />
    </div>
  )
}
