import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sortClasses } from '@/lib/class-order'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const academicYear = searchParams.get('academicYear') ?? await getCurrentAcademicYear()

    const classes = await prisma.class.findMany({
      where: {
        year: academicYear,
        ...(type === 'CHINESE' || type === 'ARTS' ? { type } : {}),
      },
      include: {
        teacher: {
          select: { id: true, name: true, nameEn: true, bioEn: true, bioZh: true, photoUrl: true },
        },
        _count: {
          select: {
            enrollments: { where: { status: 'CONFIRMED' } },
          },
        },
        textbooks: {
          where: { isActive: true },
          select: { id: true, name: true, nameZh: true, price: true, description: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    const data = sortClasses(classes.map((c) => ({
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
      textbooks: c.textbooks.map((t) => ({
        id: t.id,
        name: t.name,
        nameZh: t.nameZh,
        price: t.price.toString(),
        description: t.description,
      })),
    })))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Classes API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classes', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
