import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameEn: z.string().optional(),
  birthDate: z.string().optional(),
  grade: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const result = studentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true },
    })
    if (!user?.familyId) {
      return NextResponse.json(
        { success: false, error: 'No family account found', code: 'NO_FAMILY' },
        { status: 400 }
      )
    }

    const { name, nameEn, birthDate, grade } = result.data
    const student = await prisma.student.create({
      data: {
        name,
        nameEn: nameEn ?? null,
        birthDate: birthDate ? new Date(birthDate) : null,
        grade: grade ?? null,
        familyId: user.familyId,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        nameEn: student.nameEn,
        birthDate: student.birthDate?.toISOString() ?? null,
        grade: student.grade,
      },
    })
  } catch (error) {
    console.error('Create student error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create student', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
