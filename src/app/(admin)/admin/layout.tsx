import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageText } from '@/components/LanguageText'
import { AdminNavLinks } from '@/components/AdminNavLinks'
import { AvatarMenu } from '@/components/AvatarMenu'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const userName = session?.user?.name ?? session?.user?.email ?? 'Admin'
  const initials = getInitials(userName)

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
          <Link href="/admin" className="font-bold text-red-400 shrink-0 hover:text-red-300 transition-colors">
            <LanguageText zh="管理后台" en="Admin" />
          </Link>

          <AdminNavLinks
            unreadContactCount={unreadContactCount}
            pendingExamCount={pendingExamCount}
            pendingClaimsCount={pendingClaimsCount}
            isSuperAdmin={isSuperAdmin}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <AvatarMenu
              userName={userName}
              initials={initials}
              portalLink={{ href: '/dashboard', labelZh: '家长门户', labelEn: 'Parent Portal' }}
            />
          </div>
        </div>
      </nav>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
      <LegalFooter />
    </div>
  )
}
