import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { VolunteerClient } from './VolunteerClient'
import { LanguageText } from '@/components/LanguageText'

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>
          <LanguageText zh="志愿服务" en="Volunteer Service" />
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          {academicYear} · <LanguageText zh="完成1次志愿服务后可申请退还押金" en="Complete 1 volunteer service to claim your deposit refund" />
        </p>
      </div>
      <VolunteerClient deposit={depositForClient} services={services} academicYear={academicYear} />
    </div>
  )
}
