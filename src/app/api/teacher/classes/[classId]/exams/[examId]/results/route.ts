import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'

const schema = z.object({
  studentId: z.string(),
  score: z.number().int().min(0).nullable(),
  passed: z.boolean().nullable(),
  notes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
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

  // Verify exam belongs to this class
  const exam = await prisma.classExam.findFirst({ where: { id: examId, classId } })
  if (!exam) return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 })

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 })
  }

  const { studentId, score, passed, notes } = result.data

  const updated = await prisma.classExamResult.upsert({
    where: { examId_studentId: { examId, studentId } },
    update: {
      score,
      passed,
      notes: notes ?? null,
      enteredBy: session!.user.id,
      enteredAt: new Date(),
    },
    create: {
      examId,
      studentId,
      score,
      passed,
      notes: notes ?? null,
      enteredBy: session!.user.id,
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id } })
}
