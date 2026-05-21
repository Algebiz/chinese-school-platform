import Link from 'next/link'

const NAV = [
  { href: '/admin', label: '仪表盘', en: 'Dashboard' },
  { href: '/admin/classes', label: '班级管理', en: 'Classes' },
  { href: '/admin/students', label: '学生管理', en: 'Students' },
  { href: '/admin/waitlist', label: '候补名单', en: 'Waitlist' },
  { href: '/admin/export', label: '数据导出', en: 'Export' },
  { href: '/admin/enrollment-settings', label: '注册设置', en: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <span className="font-bold text-red-400">管理后台 / Admin</span>
          <div className="flex gap-4 ml-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-300 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto">
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-300">
              ← 家长门户
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
