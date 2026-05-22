import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

const patchSchema = z.object({
  examType: z.enum(['YCT', 'HSK']).optional(),
  level: z.number().int().min(1).max(9).optional(),
  examDate: z.string().datetime().optional(),
  registrationDeadline: z.string().datetime().optional(),
  location: z.string().min(1).optional(),
  locationZh: z.string().min(1).optional(),
  fee: z.number().positive().optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  notesZh: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ examSessionId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { examSessionId } = await params
  const body = await req.json()
  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const data = result.data
  const updated = await prisma.examSession.update({
    where: { id: examSessionId },
    data: {
      ...(data.examType && { examType: data.examType }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.examDate && { examDate: new Date(data.examDate) }),
      ...(data.registrationDeadline && { registrationDeadline: new Date(data.registrationDeadline) }),
      ...(data.location && { location: data.location }),
      ...(data.locationZh && { locationZh: data.locationZh }),
      ...(data.fee !== undefined && { fee: data.fee }),
      ...(data.capacity !== undefined && { capacity: data.capacity }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...('notes' in data && { notes: data.notes }),
      ...('notesZh' in data && { notesZh: data.notesZh }),
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id } })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ examSessionId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { examSessionId } = await params

  const confirmedCount = await prisma.examRegistration.count({
    where: { examSessionId, status: 'CONFIRMED' },
  })
  if (confirmedCount > 0) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete session with confirmed registrations', code: 'HAS_CONFIRMED' },
      { status: 409 }
    )
  }

  // Cancel any pending/paid registrations, then delete the session
  await prisma.$transaction([
    prisma.examRegistration.updateMany({
      where: { examSessionId, status: { in: ['PENDING_PAYMENT', 'PAID'] } },
      data: { status: 'CANCELLED' },
    }),
    prisma.examSession.delete({ where: { id: examSessionId } }),
  ])

  return NextResponse.json({ success: true })
}
