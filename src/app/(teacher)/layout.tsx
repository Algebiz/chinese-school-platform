import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LegalFooter } from '@/components/LegalFooter'
import { LanguageToggle } from '@/components/LanguageToggle'
import { LanguageText } from '@/components/LanguageText'
import { TeacherNavLinks } from '@/components/TeacherNavLinks'
import { AvatarMenu } from '@/components/AvatarMenu'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role

  if (!session) redirect('/login')
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') redirect('/dashboard')

  const userName = session.user?.name ?? session.user?.email ?? '教师'
  const initials = getInitials(userName)

  // Check if this teacher user has a family so we can show the parent portal link
  let hasFamily = false
  if (role === 'TEACHER' && session.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { familyId: true },
      })
      hasFamily = !!user?.familyId
    } catch {
      // non-fatal
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <Link href="/teacher/classes" className="font-bold text-red-400 shrink-0 hover:text-red-300 transition-colors">
            <LanguageText zh="教师门户" en="Teacher Portal" />
          </Link>

          <TeacherNavLinks />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LanguageToggle />
            {hasFamily && (
              <>
                <div className="w-px h-5 bg-gray-700" />
                <Link
                  href="/dashboard"
                  className="text-xs text-gray-300 hover:text-white transition-colors whitespace-nowrap"
                >
                  <LanguageText zh="家长门户" en="Parent Portal" /> ↗
                </Link>
              </>
            )}
            <div className="w-px h-5 bg-gray-700" />
            <AvatarMenu
              userName={userName}
              initials={initials}
              portalLink={hasFamily ? { href: '/dashboard', labelZh: '家长门户', labelEn: 'Parent Portal' } : undefined}
            />
          </div>
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        {children}
      </main>

      <LegalFooter />
    </div>
  )
}
