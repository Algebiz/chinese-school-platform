import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'

const patchSchema = z.object({
  description: z.string().optional(),
  descriptionZh: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { classId } = await params
  const { authorized } = await verifyTeacherClassAccess(session!.user.id, classId)
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Access denied', code: 'FORBIDDEN' }, { status: 403 })
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teacher: { select: { name: true, nameEn: true } },
      textbooks: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!cls) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: cls })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  const role = session?.user?.role
  if (role !== 'TEACHER' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { classId } = await params
  const { authorized } = await verifyTeacherClassAccess(session!.user.id, classId)
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Access denied', code: 'FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json()
  const result = patchSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 })
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data: {
      ...(result.data.description !== undefined ? { description: result.data.description || null } : {}),
      ...(result.data.descriptionZh !== undefined ? { descriptionZh: result.data.descriptionZh || null } : {}),
      ...(result.data.notes !== undefined ? { notes: result.data.notes || null } : {}),
    },
  })

  return NextResponse.json({ success: true, data: { id: updated.id } })
}
