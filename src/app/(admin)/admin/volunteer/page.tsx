import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { AdminVolunteerClient } from './AdminVolunteerClient'

export default async function AdminVolunteerPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const academicYear = await getCurrentAcademicYear()

  const [deposits, pendingClaims, services] = await Promise.all([
    prisma.volunteerDeposit.findMany({
      include: {
        family: {
          include: { users: { select: { id: true, name: true, email: true } } },
        },
        claims: {
          include: { service: { select: { name: true, nameZh: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.volunteerClaim.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.volunteerService.findMany({
      where: { academicYear },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const stats = {
    total: deposits.length,
    paid: deposits.filter((d) => d.status === 'PAID').length,
    claimPending: deposits.filter((d) => d.status === 'CLAIM_PENDING').length,
    claimApproved: deposits.filter((d) => d.status === 'CLAIM_APPROVED').length,
    refunded: deposits.filter((d) => d.status === 'REFUNDED').length,
    forfeited: deposits.filter((d) => d.status === 'FORFEITED').length,
  }

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">志愿服务管理 / Volunteer Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          {academicYear} 学年 · {pendingClaims} 待审核申请 / {pendingClaims} pending claims
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {[
          { label: '总押金', en: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: '已支付', en: 'Paid', value: stats.paid, color: 'text-blue-600' },
          { label: '申请中', en: 'Claim Pending', value: stats.claimPending, color: 'text-purple-600' },
          { label: '待退款', en: 'Approved', value: stats.claimApproved, color: 'text-green-600' },
          { label: '已退款', en: 'Refunded', value: stats.refunded, color: 'text-green-600' },
          { label: '已没收', en: 'Forfeited', value: stats.forfeited, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.en} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.en}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <AdminVolunteerClient
        deposits={deposits as never}
        services={services}
        isSuperAdmin={isSuperAdmin}
        academicYear={academicYear}
      />
    </div>
  )
}
