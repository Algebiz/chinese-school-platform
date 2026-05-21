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
