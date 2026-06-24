import Link from 'next/link'
import { auth } from '@/lib/auth'
import { ContactFormClient } from './ContactFormClient'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageText } from '@/components/LanguageText'
import { PortalNavLinks, PortalHamburger } from '@/components/PortalNavLinks'
import { AvatarMenu } from '@/components/AvatarMenu'
import { CartIcon } from '@/components/CartIcon'
import { CartProvider } from '@/lib/cart/CartContext'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export default async function ContactPage() {
  const session = await auth()
  const prefill = session?.user
    ? { name: session.user.name ?? '', email: session.user.email ?? '' }
    : null

  const userName = session?.user?.name ?? session?.user?.email ?? ''
  const initials = userName ? getInitials(userName) : ''
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isTeacher = role === 'TEACHER'

  return (
    <CartProvider>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Full portal navbar — same structure as portal layout */}
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm relative">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: logo + nav links (links only shown when logged in) */}
          <div className="flex items-center gap-4">
            <Link href={session ? '/dashboard' : '/'} className="flex shrink-0 items-center gap-2">
              <img src="/logo.png" alt="CCA Logo" className="h-9 w-9 object-contain" />
              <span className="hidden md:flex md:flex-col md:leading-tight">
                <span className="font-sora font-bold text-[#1a1a1a] text-sm">
                  Charlotte Chinese Academy
                </span>
                <span className="text-xs text-gray-500">
                  夏洛特中文学校
                </span>
              </span>
            </Link>
            {session && <PortalNavLinks />}
          </div>

          {/* Right: hamburger + toggle + cart + divider + avatar/login */}
          <div className="flex items-center gap-2">
            {session && <PortalHamburger />}
            {session && <CartIcon />}
            <div className="hidden sm:block w-px h-5 bg-gray-200" />
            {session ? (
              <AvatarMenu
                userName={userName}
                initials={initials}
                portalLink={
                  isAdmin ? { href: '/admin', labelZh: '管理后台', labelEn: 'Admin Portal' } :
                  isTeacher ? { href: '/teacher/classes', labelZh: '教师门户', labelEn: 'Teacher Portal' } :
                  undefined
                }
              />
            ) : (
              <Link
                href="/login"
                style={{ fontSize: 13, color: '#CC0000', textDecoration: 'none', fontWeight: 500 }}
              >
                <LanguageText zh="登录" en="Log in" /> →
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>
              <LanguageText zh="联系我们" en="Contact Us" />
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              <LanguageText
                zh="有任何问题？请填写下方表单，我们将在2个工作日内回复您。"
                en="Have a question? Fill out the form and we'll respond within 2 business days."
              />
            </p>
          </div>
          <ContactFormClient prefill={prefill} />
        </div>
      </main>

      <LegalFooter />
    </div>
    </CartProvider>
  )
}
