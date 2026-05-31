import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  examDate: z.string().optional(),
  maxScore: z.number().int().positive().optional(),
  description: z.string().optional(),
})

async function authorizeExam(userId: string, classId: string, examId: string) {
  const { authorized } = await verifyTeacherClassAccess(userId, classId)
  if (!authorized) return null
  const exam = await prisma.classExam.findFirst({ where: { id: examId, classId } })
  return exam
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string; examId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  const { classId, examId } = await params
  const exam = await authorizeExam(session!.user.id, classId, examId)
  if (!exam) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

  const fullExam = await prisma.classExam.findUnique({
    where: { id: examId },
    include: {
      results: {
        include: { student: { select: { id: true, name: true, nameEn: true } } },
        orderBy: { student: { name: 'asc' } },
      },
      class: { select: { name: true, nameEn: true } },
    },
  })

  return NextResponse.json({ success: true, data: fullExam })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; examId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  const { classId, examId } = await params
  const exam = await authorizeExam(session!.user.id, classId, examId)
  if (!exam) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
  if (exam.isPublished) {
    return NextResponse.json({ success: false, error: 'Cannot edit a published exam', code: 'ALREADY_PUBLISHED' }, { status: 400 })
  }

  const body = await req.json()
  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 })
  }

  const updated = await prisma.classExam.update({
    where: { id: examId },
    data: {
      ...(result.data.name ? { name: result.data.name } : {}),
      ...(result.data.nameZh ? { nameZh: result.data.nameZh } : {}),
      ...(result.data.examDate ? { examDate: new Date(result.data.examDate) } : {}),
      ...(result.data.maxScore ? { maxScore: result.data.maxScore } : {}),
      ...(result.data.description !== undefined ? { description: result.data.description || null } : {}),
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id } })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string; examId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  const { classId, examId } = await params
  const exam = await authorizeExam(session!.user.id, classId, examId)
  if (!exam) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })

  // Only allow delete if no scores have been entered
  const enteredCount = await prisma.classExamResult.count({
    where: { examId, score: { not: null } },
  })
  if (enteredCount > 0) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete exam with entered results', code: 'HAS_RESULTS' },
      { status: 409 }
    )
  }

  await prisma.classExam.delete({ where: { id: examId } })
  return NextResponse.json({ success: true })
}
