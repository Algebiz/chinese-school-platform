import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, nameEn, email, phone, bioEn, bioZh, photoUrl } = body

  if (!name?.trim() || !nameEn?.trim()) {
    return NextResponse.json({ success: false, error: 'name and nameEn are required' }, { status: 400 })
  }

  const existing = await prisma.teacher.findFirst({ where: { name: name.trim() } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'A teacher with this name already exists', code: 'DUPLICATE_NAME' }, { status: 409 })
  }

  const teacher = await prisma.teacher.create({
    data: {
      name: name.trim(),
      nameEn: nameEn.trim(),
      email: email || null,
      phone: phone || null,
      bioEn: bioEn || null,
      bioZh: bioZh || null,
      photoUrl: photoUrl || null,
    },
  })

  return NextResponse.json({ success: true, data: teacher }, { status: 201 })
}
