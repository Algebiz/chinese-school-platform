import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CURRENT_YEAR = '2025-2026'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const academicYear = searchParams.get('academicYear') ?? CURRENT_YEAR

    const classes = await prisma.class.findMany({
      where: {
        year: academicYear,
        ...(type === 'CHINESE' || type === 'ARTS' ? { type } : {}),
      },
      include: {
        teacher: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            enrollments: { where: { status: 'CONFIRMED' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const data = classes.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      type: c.type,
      description: c.description,
      teacher: c.teacher,
      schedule: c.schedule,
      capacity: c.capacity,
      fee: c.fee.toString(),
      year: c.year,
      enrolledCount: c._count.enrollments,
      spotsRemaining: Math.max(0, c.capacity - c._count.enrollments),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Classes API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classes', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
