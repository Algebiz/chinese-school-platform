import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Simple header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="CCA Logo" className="h-9 w-9 object-contain" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-red-700 text-sm">夏洛特中文学校</span>
              <span className="text-xs text-gray-400">Charlotte Chinese Academy</span>
            </div>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Portal
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-10">
        {children}
      </main>

      <LegalFooter />
    </div>
  )
}
