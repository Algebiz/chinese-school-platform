import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { teacherId } = await params
  const body = await req.json()
  const { nameEn, bioEn, bioZh, photoUrl } = body as {
    nameEn?: string
    bioEn?: string
    bioZh?: string
    photoUrl?: string
  }

  const teacher = await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      ...(nameEn !== undefined ? { nameEn: nameEn || null } : {}),
      ...(bioEn !== undefined ? { bioEn: bioEn || null } : {}),
      ...(bioZh !== undefined ? { bioZh: bioZh || null } : {}),
      ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
    },
  })

  return NextResponse.json({ success: true, data: teacher })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { teacherId } = await params

  const activeClasses = await prisma.class.count({
    where: { teacherId, year: '2025-2026' },
  })
  if (activeClasses > 0) {
    return NextResponse.json(
      { success: false, error: 'Please reassign this teacher\'s classes first', code: 'HAS_CLASSES' },
      { status: 409 }
    )
  }

  await prisma.teacher.delete({ where: { id: teacherId } })
  return NextResponse.json({ success: true })
}
