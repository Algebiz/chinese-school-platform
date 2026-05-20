import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.WEBFLOW_API_KEY) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const classes = await prisma.class.findMany({
    where: { year: '2025-2026' },
    include: {
      teacher: { select: { name: true } },
      _count: {
        select: { enrollments: { where: { status: 'CONFIRMED' } } },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })

  const data = classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    nameEn: cls.nameEn,
    type: cls.type,
    teacher: cls.teacher?.name ?? null,
    schedule: cls.schedule,
    fee: cls.fee.toString(),
    capacity: cls.capacity,
    spotsRemaining: Math.max(0, cls.capacity - cls._count.enrollments),
    isFull: cls._count.enrollments >= cls.capacity,
    description: cls.description,
    year: cls.year,
  }))

  return NextResponse.json({ success: true, data })
}
