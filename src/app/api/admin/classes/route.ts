import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, nameEn, type, teacherId, year, schedule, capacity, fee, description, descriptionZh } = body

  if (!name?.trim() || !nameEn?.trim() || !type || !teacherId || !year || !capacity || fee === undefined || fee === '') {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
  }

  if (!['CHINESE', 'ARTS'].includes(type)) {
    return NextResponse.json({ success: false, error: 'Invalid class type' }, { status: 400 })
  }

  const cls = await prisma.class.create({
    data: {
      name: name.trim(),
      nameEn: nameEn.trim(),
      type,
      teacherId,
      year,
      schedule: schedule ?? {},
      capacity: parseInt(String(capacity)),
      fee: parseFloat(String(fee)),
      description: description?.trim() || null,
      descriptionZh: descriptionZh?.trim() || null,
      isActive: true,
    },
    include: { teacher: { select: { name: true } } },
  })

  return NextResponse.json({ success: true, data: cls }, { status: 201 })
}
