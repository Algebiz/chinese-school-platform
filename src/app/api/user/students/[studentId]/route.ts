import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { studentId } = await params

  // Verify student belongs to current user's family
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  })
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { familyId: true },
  })
  if (!user?.familyId || student?.familyId !== user.familyId) {
    return NextResponse.json({ success: false, error: 'Student not found', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { name, nameEn, birthDate, grade, notes } = await req.json() as {
    name?: string; nameEn?: string; birthDate?: string | null; grade?: string; notes?: string
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(name ? { name } : {}),
      ...(nameEn !== undefined ? { nameEn: nameEn || null } : {}),
      ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
      ...(grade !== undefined ? { grade: grade || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
    },
  })

  return NextResponse.json({
    success: true,
    data: { ...updated, birthDate: updated.birthDate?.toISOString() ?? null },
  })
}
