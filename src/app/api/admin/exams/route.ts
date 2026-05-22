import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const academicYear = searchParams.get('academicYear')

  const sessions = await prisma.examSession.findMany({
    where: academicYear ? { academicYear } : undefined,
    include: {
      _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
    },
    orderBy: [{ examDate: 'asc' }, { level: 'asc' }],
  })

  return NextResponse.json({
    success: true,
    data: sessions.map((s) => ({
      id: s.id,
      examType: s.examType,
      level: s.level,
      examDate: s.examDate.toISOString(),
      registrationDeadline: s.registrationDeadline.toISOString(),
      location: s.location,
      locationZh: s.locationZh,
      fee: s.fee.toString(),
      capacity: s.capacity,
      registeredCount: s._count.registrations,
      spotsRemaining: Math.max(0, s.capacity - s._count.registrations),
      academicYear: s.academicYear,
      isActive: s.isActive,
      notes: s.notes,
      notesZh: s.notesZh,
    })),
  })
}

const createSchema = z.object({
  examType: z.enum(['YCT', 'HSK']),
  level: z.number().int().min(1).max(9),
  examDate: z.string().datetime(),
  registrationDeadline: z.string().datetime(),
  location: z.string().min(1),
  locationZh: z.string().min(1),
  fee: z.number().min(0),
  capacity: z.number().int().positive(),
  academicYear: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  notes: z.string().optional(),
  notesZh: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const data = result.data
  const examSession = await prisma.examSession.create({
    data: {
      examType: data.examType,
      level: data.level,
      examDate: new Date(data.examDate),
      registrationDeadline: new Date(data.registrationDeadline),
      location: data.location,
      locationZh: data.locationZh,
      fee: data.fee,
      capacity: data.capacity,
      academicYear: data.academicYear,
      isActive: data.isActive,
      notes: data.notes,
      notesZh: data.notesZh,
    },
  })

  return NextResponse.json({ success: true, data: { id: examSession.id } }, { status: 201 })
}
