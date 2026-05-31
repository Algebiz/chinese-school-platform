import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'
import { sendClassExamResultNotification } from '@/lib/email'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string; examId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  const { classId, examId } = await params
  const { authorized } = await verifyTeacherClassAccess(session!.user.id, classId)
  if (!authorized) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

  const exam = await prisma.classExam.findFirst({
    where: { id: examId, classId },
    include: { class: { select: { name: true, nameEn: true } } },
  })
  if (!exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })
  if (exam.isPublished) {
    return NextResponse.json({ success: false, error: 'Already published', code: 'ALREADY_PUBLISHED' }, { status: 400 })
  }

  const results = await prisma.classExamResult.findMany({
    where: { examId },
    include: {
      student: {
        include: { family: { include: { users: { select: { email: true, name: true }, take: 1 } } } },
      },
    },
  })

  const totalStudents = results.length
  const enteredResults = results.filter((r) => r.score !== null)
  const missingCount = totalStudents - enteredResults.length

  // Mark as published
  await prisma.classExam.update({ where: { id: examId }, data: { isPublished: true } })

  // Send emails for all results that have scores
  const academicYear = await getCurrentAcademicYear()
  let notifiedCount = 0
  for (const r of enteredResults) {
    const parent = r.student.family?.users[0]
    if (!parent?.email) continue
    try {
      await sendClassExamResultNotification(parent.email, {
        parentName: parent.name ?? '家长',
        studentName: r.student.name,
        examName: exam.name,
        examNameZh: exam.nameZh,
        className: exam.class.nameEn ?? exam.class.name,
        examDate: exam.examDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        score: r.score!,
        maxScore: exam.maxScore,
        passed: r.passed ?? false,
        notes: r.notes ?? undefined,
        academicYear,
      })
      notifiedCount++
    } catch {
      // non-fatal — continue sending to other parents
    }
  }

  return NextResponse.json({
    success: true,
    data: { published: true, notified: notifiedCount, missingCount },
  })
}
