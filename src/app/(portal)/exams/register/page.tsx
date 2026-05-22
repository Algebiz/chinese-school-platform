import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExamRegisterClient } from './ExamRegisterClient'

export default async function ExamRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { sessionId } = await searchParams
  if (!sessionId) redirect('/exams')

  const examSession = await prisma.examSession.findUnique({ where: { id: sessionId } })
  if (!examSession || !examSession.isActive) redirect('/exams')

  if (examSession.registrationDeadline < new Date()) redirect('/exams')

  const students = await prisma.student.findMany({
    where: { family: { users: { some: { id: session.user.id } } } },
    select: {
      id: true,
      name: true,
      nameEn: true,
      enrollments: {
        where: { status: 'CONFIRMED', class: { year: examSession.academicYear } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <Link href="/exams" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回考试列表 / Back to Exams
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">考试报名 / Register for Exam</h1>
        <p className="mt-1 text-sm text-gray-500">{examSession.academicYear} 学年</p>
      </div>
      <ExamRegisterClient
        session={{
          id: examSession.id,
          examType: examSession.examType,
          level: examSession.level,
          examDate: examSession.examDate.toISOString(),
          location: examSession.location,
          locationZh: examSession.locationZh,
          fee: examSession.fee.toString(),
          registrationDeadline: examSession.registrationDeadline.toISOString(),
        }}
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          nameEn: s.nameEn,
          hasConfirmedEnrollment: s.enrollments.length > 0,
        }))}
      />
    </div>
  )
}
