import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CheckoutClient } from './CheckoutClient'

const CURRENT_YEAR = '2025-2026'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ enrollmentIds?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { enrollmentIds: param } = await searchParams
  const enrollmentIds = param ? param.split(',').filter(Boolean) : []

  if (enrollmentIds.length === 0) redirect('/portal/classes')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })

  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds }, status: 'PENDING' },
    include: {
      class: { select: { id: true, name: true, nameEn: true, fee: true } },
      student: { select: { id: true, name: true, familyId: true } },
    },
  })

  if (enrollments.length === 0) redirect('/portal/classes')

  // Verify all enrollments belong to the logged-in user's family
  const unauthorized = enrollments.some(
    (e) => e.student.familyId !== user?.familyId
  )
  if (unauthorized) redirect('/portal/dashboard')

  const student = enrollments[0].student
  const breakdown = enrollments.map((e) => ({
    classId: e.class.id,
    className: e.class.name,
    classNameEn: e.class.nameEn,
    fee: e.class.fee.toString(),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">支付报名费</h1>
          <p className="mt-1 text-sm text-gray-500">
            Checkout · {CURRENT_YEAR} 学年 / Academic Year
          </p>
        </div>
        <CheckoutClient
          data={{
            studentId: student.id,
            studentName: student.name,
            academicYear: CURRENT_YEAR,
            breakdown,
          }}
        />
      </div>
    </div>
  )
}
