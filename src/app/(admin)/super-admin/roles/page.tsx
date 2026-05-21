import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { DemoteButton } from './DemoteButton'

export default async function RolesPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/admin')

  const [superAdminCount, adminCount, parentCount, elevated] = await Promise.all([
    prisma.user.count({ where: { role: 'SUPER_ADMIN' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'PARENT' } }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const total = superAdminCount + adminCount + parentCount

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">角色管理 / Role Management</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage user roles across the system</p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Users" value={total} color="gray" />
        <StatCard label="Super Admins" value={superAdminCount} color="red" />
        <StatCard label="Admins" value={adminCount} color="blue" />
        <StatCard label="Parents" value={parentCount} color="green" />
      </div>

      {/* Elevated users table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">管理员账号 / Admin Accounts</h2>
          <p className="text-xs text-gray-400">All ADMIN and SUPER_ADMIN users — {elevated.length} total</p>
        </div>
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left font-medium text-gray-500">用户 / User</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">角色 / Role</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">加入时间 / Joined</th>
              <th className="px-5 py-3 text-left font-medium text-gray-500">操作 / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {elevated.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{u.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-5 py-3 text-gray-500">
                  {u.createdAt.toLocaleDateString('zh-CN')}
                </td>
                <td className="px-5 py-3">
                  {u.id === session.user.id ? (
                    <span className="text-xs text-gray-400 italic">（当前用户）</span>
                  ) : (
                    <DemoteButton
                      userId={u.id}
                      userName={u.name ?? u.email}
                      currentRole={u.role}
                      superAdminCount={superAdminCount}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'gray' | 'red' | 'blue' | 'green' }) {
  const colors = {
    gray:  'bg-gray-50  border-gray-200  text-gray-700',
    red:   'bg-red-50   border-red-200   text-red-700',
    blue:  'bg-blue-50  border-blue-200  text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium">{label}</p>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'SUPER_ADMIN') return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">SUPER_ADMIN</span>
  if (role === 'ADMIN') return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">ADMIN</span>
  return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">PARENT</span>
}
