import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { VolunteerClient } from './VolunteerClient'

export default async function VolunteerPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const academicYear = await getCurrentAcademicYear()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })

  const [deposit, services] = await Promise.all([
    user?.familyId
      ? prisma.volunteerDeposit.findUnique({
          where: { familyId_academicYear: { familyId: user.familyId, academicYear } },
          include: {
            claims: {
              include: { service: { select: { name: true, nameZh: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        })
      : null,
    prisma.volunteerService.findMany({
      where: { academicYear, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Serialize Decimal to number for client component
  const depositForClient = deposit
    ? {
        ...deposit,
        amount: deposit.amount.toNumber(),
        claims: deposit.claims.map((c) => ({
          ...c,
          submittedAt: c.submittedAt.toISOString(),
          reviewedAt: c.reviewedAt?.toISOString() ?? null,
        })),
        paidAt: deposit.paidAt?.toISOString() ?? null,
        refundedAt: deposit.refundedAt?.toISOString() ?? null,
        forfeitedAt: deposit.forfeitedAt?.toISOString() ?? null,
      }
    : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">志愿服务 / Volunteer Service</h1>
        <p className="mt-1 text-sm text-gray-500">
          {academicYear} 学年 · 完成1次志愿服务后可申请退还押金 / Complete 1 volunteer service to claim your deposit refund
        </p>
      </div>
      <VolunteerClient deposit={depositForClient} services={services} academicYear={academicYear} />
    </div>
  )
}
