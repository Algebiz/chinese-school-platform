import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'
import { getCurrentAcademicYear } from '@/lib/academic-year'

const createSchema = z.object({
  name: z.string().min(1),
  nameZh: z.string().min(1),
  examDate: z.string().min(1),
  maxScore: z.number().int().positive().default(100),
  description: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  const { classId } = await params
  const { authorized } = await verifyTeacherClassAccess(session!.user.id, classId)
  if (!authorized) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

  const exams = await prisma.classExam.findMany({
    where: { classId },
    include: { results: { select: { score: true } } },
    orderBy: { examDate: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: exams.map((e) => ({
      id: e.id,
      name: e.name,
      nameZh: e.nameZh,
      examDate: e.examDate.toISOString(),
      maxScore: e.maxScore,
      isPublished: e.isPublished,
      totalStudents: e.results.length,
      enteredCount: e.results.filter((r) => r.score !== null).length,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  const { classId } = await params
  const { authorized } = await verifyTeacherClassAccess(session!.user.id, classId)
  if (!authorized) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 })
  }

  const academicYear = await getCurrentAcademicYear()

  // Get all confirmed enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { classId, status: 'CONFIRMED' },
    select: { studentId: true },
  })

  const exam = await prisma.classExam.create({
    data: {
      classId,
      name: result.data.name,
      nameZh: result.data.nameZh,
      examDate: new Date(result.data.examDate),
      maxScore: result.data.maxScore ?? 100,
      description: result.data.description || null,
      academicYear,
      createdBy: session!.user.id,
    },
  })

  // Auto-create blank result records for all enrolled students
  if (enrollments.length > 0) {
    await prisma.classExamResult.createMany({
      data: enrollments.map((e) => ({
        examId: exam.id,
        studentId: e.studentId,
        enteredBy: session!.user.id,
      })),
    })
  }

  return NextResponse.json({ success: true, data: { id: exam.id } }, { status: 201 })
}
