import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

const createSchema = z.object({
  name: z.string().min(1, 'Chinese name is required'),
  nameEn: z.string().min(1, 'English name is required'),
  birthDate: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  grade: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  familyId: z.string().min(1, 'Family account is required'),
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

  const family = await prisma.family.findUnique({ where: { id: data.familyId } })
  if (!family) {
    return NextResponse.json(
      { success: false, error: 'Family not found', code: 'FAMILY_NOT_FOUND' },
      { status: 404 }
    )
  }

  const student = await prisma.student.create({
    data: {
      name: data.name,
      nameEn: data.nameEn,
      birthDate: new Date(data.birthDate),
      gender: data.gender ?? null,
      grade: data.grade ?? null,
      notes: data.notes ?? null,
      familyId: data.familyId,
    },
  })

  return NextResponse.json({ success: true, data: { id: student.id } }, { status: 201 })
}
