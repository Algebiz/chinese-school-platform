import Link from 'next/link'
import { auth } from '@/lib/auth'
import { ContactFormClient } from './ContactFormClient'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageToggle } from '@/components/LanguageToggle'
import { LanguageText } from '@/components/LanguageText'

export default async function ContactPage() {
  const session = await auth()
  const prefill = session?.user
    ? { name: session.user.name ?? '', email: session.user.email ?? '' }
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'white', borderBottom: '0.5px solid #E5E7EB', padding: '0 16px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={session ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.png" alt="CCA Logo" style={{ height: 32, width: 32, objectFit: 'contain' }} />
            <LanguageText zh="夏洛特中文学校" en="Charlotte Chinese Academy" className="font-bold text-red-700 text-sm" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <LanguageToggle />
            {session ? (
              <Link href="/dashboard" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
                ← <LanguageText zh="返回首页" en="Dashboard" />
              </Link>
            ) : (
              <Link href="/login" style={{ fontSize: 13, color: '#CC0000', textDecoration: 'none' }}>
                <LanguageText zh="登录" en="Log in" /> →
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '24px 16px' }}>
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
      </main>
      <LegalFooter />
    </div>
  )
}
