import Link from 'next/link'
import { auth } from '@/lib/auth'
import { ContactFormClient } from './ContactFormClient'
import { LegalFooter } from '@/components/LegalFooter'

export default async function ContactPage() {
  const session = await auth()
  const prefill = session?.user
    ? { name: session.user.name ?? '', email: session.user.email ?? '' }
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href={session ? '/dashboard' : '/'} className="flex items-center gap-2 leading-tight">
            <img src="/logo.png" alt="CCA Logo" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-red-700 text-base">夏洛特中文学校</span>
              <span className="text-xs text-gray-400">Charlotte Chinese Academy</span>
            </div>
          </Link>
          {session ? (
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← 返回仪表盘 / Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              登录 / Log in →
            </Link>
          )}
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">联系我们 / Contact Us</h1>
          <p className="mt-1 text-sm text-gray-500">有任何问题？请填写下方表单，我们将在2个工作日内回复您。</p>
          <p className="text-xs text-gray-400">Have a question? Fill out the form below and we'll respond within 2 business days.</p>
        </div>
        <ContactFormClient prefill={prefill} />
      </main>
      <LegalFooter />
    </div>
  )
}
