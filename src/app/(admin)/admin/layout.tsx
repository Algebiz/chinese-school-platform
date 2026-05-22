import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LegalFooter } from '@/components/LegalFooter'

const NAV = [
  { href: '/admin', label: '仪表盘', en: 'Dashboard' },
  { href: '/admin/classes', label: '班级管理', en: 'Classes' },
  { href: '/admin/teachers', label: '教师管理', en: 'Teachers' },
  { href: '/admin/students', label: '学生管理', en: 'Students' },
  { href: '/admin/waitlist', label: '候补名单', en: 'Waitlist' },
  { href: '/admin/export', label: '数据导出', en: 'Export' },
  { href: '/admin/enrollment-settings', label: '注册设置', en: 'Settings' },
  { href: '/admin/contact', label: '联系消息', en: 'Messages' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  let unreadContactCount = 0
  try {
    unreadContactCount = await prisma.contactMessage.count({ where: { status: 'UNREAD' } })
  } catch {
    // non-fatal
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <span className="font-bold text-red-400">管理后台 / Admin</span>
          <div className="flex gap-4 ml-4 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 text-sm text-gray-300 hover:text-white transition-colors"
              >
                {item.label}
                {item.href === '/admin/contact' && unreadContactCount > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                    {unreadContactCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/super-admin"
                className="flex items-center gap-1 rounded-md bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
              >
                ⚙ 超级管理员
              </Link>
            )}
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
