import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExamRegisterClient } from './ExamRegisterClient'
import { LanguageText } from '@/components/LanguageText'

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
    <div className="max-w-5xl mx-auto p-6">
      <div style={{ marginBottom: 28 }}>
        <Link href="/exams" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>
          ← <LanguageText zh="返回考试列表" en="Back to Exams" />
        </Link>
        <h1 style={{ marginTop: 12, fontSize: 22, fontWeight: 500, color: '#111827' }}>
          <LanguageText zh="考试报名" en="Register for Exam" />
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>
          {examSession.academicYear}
        </p>
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
