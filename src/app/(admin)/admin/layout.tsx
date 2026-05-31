import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageToggle } from '@/components/LanguageToggle'
import { AdminNavLinks } from '@/components/AdminNavLinks'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  let unreadContactCount = 0
  let pendingExamCount = 0
  let pendingClaimsCount = 0
  try {
    unreadContactCount = await prisma.contactMessage.count({ where: { status: 'UNREAD' } })
    pendingExamCount = await prisma.examRegistration.count({ where: { status: 'PAID' } })
    pendingClaimsCount = await prisma.volunteerClaim.count({ where: { status: 'PENDING_REVIEW' } })
  } catch {
    // non-fatal
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
          <span className="font-bold text-red-400 shrink-0">
            管理后台 / Admin
          </span>

          <AdminNavLinks
            unreadContactCount={unreadContactCount}
            pendingExamCount={pendingExamCount}
            pendingClaimsCount={pendingClaimsCount}
            isSuperAdmin={isSuperAdmin}
          />

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <LanguageToggle />
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300">
              ← 家长门户
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
      <LegalFooter />
    </div>
  )
}
