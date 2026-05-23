import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sortClasses } from '@/lib/class-order'
import { getCurrentAcademicYear } from '@/lib/academic-year'

function StatCard({
  title,
  en,
  value,
  accent,
}: {
  title: string
  en: string
  value: string | number
  accent?: 'amber'
}) {
  return (
    <div className={`rounded-lg border p-5 ${accent === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{en}</p>
      <p className={`mt-1 text-2xl font-bold ${accent === 'amber' ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
      <p className="mt-0.5 text-sm text-gray-500">{title}</p>
    </div>
  )
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    CONFIRMED:   { label: '已支付',  cls: 'bg-green-100 text-green-700' },
    PENDING:     { label: '待支付',  cls: 'bg-amber-100 text-amber-700' },
    CANCELLED:   { label: '已取消',  cls: 'bg-gray-100 text-gray-500' },
    TRANSFERRED: { label: '已转班',  cls: 'bg-blue-100 text-blue-700' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
}

export default async function AdminDashboard() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const YEAR = await getCurrentAcademicYear()
  const PREVIOUS_YEAR = YEAR.replace(/^(\d{4})-\d{4}$/, (_, a) => `${parseInt(a) - 1}-${a}`)

  const [studentCount, enrollmentCount, pendingCount, revenue, classes, recent, returningStudentCount, pendingExamCount, pendingVolunteerClaimsCount] = await Promise.all([
    // Students who have at least one CONFIRMED enrollment this year
    prisma.student.count({
      where: { enrollments: { some: { status: 'CONFIRMED', class: { year: YEAR } } } },
    }),
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
    }).then(sortClasses),
    prisma.enrollment.findMany({
      where: { class: { year: YEAR }, status: { not: 'CANCELLED' } },
      include: {
        student: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    // Students confirmed in YEAR who also had confirmed enrollment in PREVIOUS_YEAR
    prisma.student.count({
      where: {
        AND: [
          { enrollments: { some: { status: 'CONFIRMED', class: { year: YEAR } } } },
          { enrollments: { some: { status: 'CONFIRMED', class: { year: PREVIOUS_YEAR } } } },
        ],
      },
    }),
    prisma.examRegistration.count({ where: { status: 'PAID' } }),
    prisma.volunteerClaim.count({ where: { status: 'PENDING_REVIEW' } }),
  ])

  const totalRevenue = revenue._sum.amount?.toNumber() ?? 0
  const newStudentCount = studentCount - returningStudentCount

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
        <StatCard title="新生" en="New Students" value={newStudentCount} />
        <StatCard title="老生" en="Returning Students" value={returningStudentCount} />
        <StatCard title="待确认考试报名" en="Pending Exam Confirmations" value={pendingExamCount} accent="amber" />
        <StatCard title="待审核志愿申请" en="Pending Volunteer Claims" value={pendingVolunteerClaimsCount} accent="amber" />
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
                <th className="px-6 py-3">状态 / Status</th>
                <th className="px-6 py-3">报名时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{e.student.name}</td>
                  <td className="px-6 py-3 text-gray-600">{e.class.name}</td>
                  <td className="px-6 py-3">
                    <EnrollmentStatusBadge status={e.status} />
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
