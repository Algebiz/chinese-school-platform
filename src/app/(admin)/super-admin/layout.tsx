import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

const NAV = [
  { href: '/super-admin/users', label: '用户管理', en: 'User Management' },
  { href: '/super-admin/roles', label: '角色管理', en: 'Role Management' },
  { href: '/super-admin/settings', label: '系统设置', en: 'System Settings' },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/admin')

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-slate-900 text-white shrink-0">
        {/* Logo area */}
        <div className="border-b border-slate-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold tracking-wide">SA</span>
            <div>
              <p className="text-sm font-semibold leading-tight">超级管理员</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
          <p className="mt-2 truncate text-xs text-slate-500">{session.user.email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <span>{item.label}</span>
              <span className="text-xs text-slate-500">{item.en}</span>
            </Link>
          ))}
        </nav>

        {/* Back links */}
        <div className="border-t border-slate-700 px-3 py-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors">
            ← 管理后台 / Admin Panel
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors">
            ← 家长门户 / Parent Portal
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="border-b border-gray-200 bg-white px-8 py-4 flex items-center gap-3">
          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">SUPER ADMIN</span>
          <span className="text-sm text-gray-500">夏洛特中文学校 / Charlotte Chinese Academy</span>
        </header>
        <main className="px-8 py-6">{children}</main>
      </div>
    </div>
  )
}
