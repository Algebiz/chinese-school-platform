import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'
import { sortByLastNamePinyin } from '@/lib/pinyin-sort'
import { ResultsEntryClient } from './ResultsEntryClient'

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ classId: string; examId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { classId, examId } = await params
  const { authorized } = await verifyTeacherClassAccess(session.user.id, classId)
  if (!authorized) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-800">无权访问 / Access denied</p>
      </div>
    )
  }

  const exam = await prisma.classExam.findFirst({
    where: { id: examId, classId },
    include: {
      class: { select: { name: true, nameEn: true } },
      results: {
        include: { student: { select: { id: true, name: true, nameEn: true } } },
      },
    },
  })

  if (!exam) {
    return <div className="text-center text-gray-500 py-12">考试不存在 / Exam not found</div>
  }

  // Get all confirmed enrolled students (in case some enrolled after exam creation)
  const allEnrollments = await prisma.enrollment.findMany({
    where: { classId, status: 'CONFIRMED' },
    include: { student: { select: { id: true, name: true, nameEn: true } } },
  })

  const sorted = sortByLastNamePinyin(allEnrollments, (e) => e.student.name)

  const resultMap = Object.fromEntries(exam.results.map((r) => [r.studentId, r]))

  const rows = sorted.map((e) => {
    const existing = resultMap[e.student.id]
    return {
      studentId: e.student.id,
      studentName: e.student.name,
      studentNameEn: e.student.nameEn,
      score: existing?.score ?? null,
      passed: existing?.passed ?? null,
      notes: existing?.notes ?? '',
    }
  })

  const enteredCount = rows.filter((r) => r.score !== null).length

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/teacher/classes" className="hover:text-gray-700">我的班级</Link>
          <span>/</span>
          <Link href={`/teacher/classes/${classId}`} className="hover:text-gray-700">{exam.class.name}</Link>
          <span>/</span>
          <span>{exam.nameZh}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{exam.nameZh}</h1>
        <p className="text-sm text-gray-500">
          {exam.name} · 满分 {exam.maxScore} 分 ·{' '}
          {exam.examDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          {exam.isPublished && (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              已发布 / Published
            </span>
          )}
        </p>
      </div>

      <ResultsEntryClient
        classId={classId}
        examId={examId}
        maxScore={exam.maxScore}
        isPublished={exam.isPublished}
        rows={rows}
        enteredCount={enteredCount}
        totalCount={rows.length}
      />
    </div>
  )
}
