import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const YEAR = '2025-2026'

function StatCard({ title, en, value }: { title: string; en: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{en}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-sm text-gray-500">{title}</p>
    </div>
  )
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    COMPLETED: { label: '已支付', cls: 'bg-green-100 text-green-700' },
    PENDING: { label: '待支付', cls: 'bg-yellow-100 text-yellow-700' },
    FAILED: { label: '失败', cls: 'bg-red-100 text-red-700' },
    REFUNDED: { label: '已退款', cls: 'bg-gray-100 text-gray-600' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
}

export default async function AdminDashboard() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [studentCount, enrollmentCount, pendingCount, revenue, classes, recent] = await Promise.all([
    prisma.student.count(),
    prisma.enrollment.count({
      where: { status: 'CONFIRMED', class: { year: YEAR } },
    }),
    prisma.enrollment.count({
      where: { status: 'PENDING', class: { year: YEAR } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'COMPLETED' },
    }),
    prisma.class.findMany({
      where: { year: YEAR },
      include: {
        teacher: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),
    prisma.enrollment.findMany({
      where: { class: { year: YEAR } },
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } },
        payments: { select: { status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  const totalRevenue = revenue._sum.amount?.toNumber() ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
        <p className="mt-1 text-sm text-gray-500">Admin Dashboard · {YEAR} 学年</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="学生总数" en="Total Students" value={studentCount} />
        <StatCard title="已确认报名" en="Confirmed Enrollments" value={enrollmentCount} />
        <StatCard title="待付款报名" en="Pending Payment" value={pendingCount} />
        <StatCard title="已收学费" en="Revenue Collected" value={`$${totalRevenue.toFixed(2)}`} />
      </div>

      {/* Capacity bars */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">班级容量 / Class Capacity</h2>
        <div className="space-y-3">
          {classes.map((cls) => {
            const enrolled = cls._count.enrollments
            const pct = cls.capacity === 0 ? 0 : Math.min(100, Math.round((enrolled / cls.capacity) * 100))
            const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#f59e0b' : '#22c55e'
            return (
              <div key={cls.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{cls.name}</span>
                  <span className="text-gray-500">
                    {enrolled}/{cls.capacity} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            )
          })}
          {classes.length === 0 && (
            <p className="text-sm text-gray-400">暂无班级数据 / No classes found</p>
          )}
        </div>
      </div>

      {/* Recent enrollments */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">最新报名记录 / Recent Enrollments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">学生</th>
                <th className="px-6 py-3">班级</th>
                <th className="px-6 py-3">支付状态</th>
                <th className="px-6 py-3">报名时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{e.student.name}</td>
                  <td className="px-6 py-3 text-gray-600">{e.class.name}</td>
                  <td className="px-6 py-3">
                    <PaymentBadge status={e.payments[0]?.status ?? 'PENDING'} />
                  </td>
                  <td className="px-6 py-3 text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    暂无数据 / No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
