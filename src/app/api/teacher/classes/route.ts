import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session!.user.id },
  })
  if (!teacher) {
    return NextResponse.json({ success: false, error: 'No teacher profile linked', code: 'NO_TEACHER_PROFILE' }, { status: 404 })
  }

  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id, isActive: true },
    include: {
      _count: {
        select: { enrollments: { where: { status: 'CONFIRMED' } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: classes.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      type: c.type,
      year: c.year,
      schedule: c.schedule,
      capacity: c.capacity,
      fee: c.fee.toString(),
      enrolledCount: c._count.enrollments,
    })),
  })
}
