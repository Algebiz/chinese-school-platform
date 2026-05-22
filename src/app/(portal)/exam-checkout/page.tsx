import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExamCheckoutClient } from './ExamCheckoutClient'

export default async function ExamCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { registrationId } = await searchParams
  if (!registrationId) redirect('/exams')

  const registration = await prisma.examRegistration.findUnique({
    where: { id: registrationId },
    include: {
      examSession: true,
      student: {
        include: { family: { include: { users: { select: { id: true } } } } },
      },
    },
  })

  if (!registration) redirect('/exams')

  // Ownership check
  const isOwner = registration.student.family?.users.some((u) => u.id === session.user.id)
  if (!isOwner) redirect('/exams')

  if (registration.status !== 'PENDING_PAYMENT') {
    redirect('/exams')
  }

  const s = registration.examSession

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">支付考试报名费</h1>
        <p className="mt-1 text-sm text-gray-500">
          Exam Registration Checkout · {s.academicYear} 学年
        </p>
      </div>
      <ExamCheckoutClient
        data={{
          registrationId,
          examType: s.examType,
          level: s.level,
          examDate: s.examDate.toISOString(),
          location: s.location,
          locationZh: s.locationZh,
          fee: s.fee.toString(),
          studentName: registration.studentNameZh,
          academicYear: s.academicYear,
        }}
      />
    </div>
  )
}
