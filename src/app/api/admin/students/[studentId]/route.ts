import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  birthDate: z.string().nullable().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  grade: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { studentId } = await params
  const body = await req.json()
  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const data = result.data
  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
      ...('birthDate' in data && {
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      }),
      ...('gender' in data && { gender: data.gender }),
      ...('grade' in data && { grade: data.grade }),
      ...('notes' in data && { notes: data.notes }),
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id } })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { studentId } = await params

  const [confirmedEnrollments, confirmedExamRegs] = await Promise.all([
    prisma.enrollment.count({ where: { studentId, status: 'CONFIRMED' } }),
    prisma.examRegistration.count({ where: { studentId, status: 'CONFIRMED' } }),
  ])

  if (confirmedEnrollments > 0 || confirmedExamRegs > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Cannot delete student with confirmed enrollments or exam registrations',
        code: 'HAS_CONFIRMED',
      },
      { status: 409 }
    )
  }

  await prisma.$transaction([
    prisma.studentNextClassOverride.deleteMany({ where: { studentId } }),
    prisma.waitlist.deleteMany({ where: { studentId } }),
    prisma.adjustmentLog.deleteMany({ where: { studentId } }),
    prisma.payment.deleteMany({ where: { enrollment: { studentId } } }),
    prisma.enrollment.deleteMany({ where: { studentId } }),
    prisma.examRegistration.deleteMany({ where: { studentId } }),
    prisma.student.delete({ where: { id: studentId } }),
  ])

  return NextResponse.json({ success: true })
}
