import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const teachers = await prisma.teacher.findMany({
    include: {
      classes: {
        where: { year: '2025-2026' },
        select: { id: true, name: true, nameEn: true, type: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ success: true, data: teachers })
}
