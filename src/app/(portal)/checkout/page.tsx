import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { CheckoutClient } from './CheckoutClient'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ enrollmentIds?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const CURRENT_YEAR = await getCurrentAcademicYear()

  const { enrollmentIds: param } = await searchParams
  const enrollmentIds = param ? param.split(',').filter(Boolean) : []

  if (enrollmentIds.length === 0) redirect('/classes')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })

  // ── Volunteer deposit check ──────────────────────────────────────────────────
  const familyId = user?.familyId
  const yearConfig = await prisma.academicYearConfig.findFirst({ where: { isActive: true } })
  const depositRequired = yearConfig?.volunteerDepositRequired ?? true
  const depositAmount = yearConfig?.volunteerDepositAmount?.toNumber() ?? 100

  let includesDeposit = false
  if (depositRequired && familyId) {
    const existingDeposit = await prisma.volunteerDeposit.findUnique({
      where: { familyId_academicYear: { familyId, academicYear: CURRENT_YEAR } },
    })
    // Only add deposit if family has no deposit yet OR deposit is still PENDING (not paid)
    includesDeposit = !existingDeposit || existingDeposit.status === 'PENDING'
  }

  // Fetch without status filter to detect cancelled enrollments
  const rawEnrollments = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds } },
    select: { id: true, status: true, student: { select: { familyId: true } } },
  })

  const unauthorized = rawEnrollments.some((e) => e.student.familyId !== user?.familyId)
  if (unauthorized) redirect('/dashboard')

  const hasCancelled = rawEnrollments.some((e) => e.status === 'CANCELLED')
  if (hasCancelled) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-lg font-semibold text-red-800">此注册已被取消</p>
            <p className="mt-2 text-sm text-red-600">
              This enrollment has been cancelled. Please enroll again.
            </p>
            <Link
              href="/enroll"
              className="mt-5 inline-block rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              重新报名 / Enroll Again
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds }, status: 'PENDING' },
    include: {
      class: { select: { id: true, name: true, nameEn: true, fee: true } },
      student: { select: { id: true, name: true, familyId: true } },
      textbooks: {
        include: { textbook: { select: { id: true, name: true, nameZh: true } } },
      },
    },
  })

  if (enrollments.length === 0) redirect('/classes')

  const student = enrollments[0].student

  const tuitionItems = enrollments.map((e) => ({
    type: 'tuition' as const,
    classId: e.class.id,
    className: e.class.name,
    classNameEn: e.class.nameEn,
    fee: e.class.fee.toString(),
  }))

  const textbookItems = enrollments.flatMap((e) =>
    e.textbooks.map((et) => ({
      type: 'textbook' as const,
      classId: e.class.id,
      className: e.class.name,
      classNameEn: e.class.nameEn,
      textbookId: et.textbookId,
      textbookName: et.textbook.name,
      textbookNameZh: et.textbook.nameZh,
      fee: et.price.toString(),
    }))
  )

  const breakdown = [...tuitionItems, ...textbookItems]
  const textbookIds = textbookItems.map((t) => t.textbookId)
  const classIds = tuitionItems.map((t) => t.classId)

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
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
            familyId: student.familyId,
            academicYear: CURRENT_YEAR,
            classIds,
            textbookIds,
            breakdown,
            includesDeposit,
            depositAmount,
          }}
        />
      </div>
    </div>
  )
}
