import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyTeacherClassAccess } from '@/lib/teacher-auth'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  nameZh: z.string().min(1).optional(),
  description: z.string().optional(),
  descriptionZh: z.string().optional(),
  price: z.number().positive().optional(),
})

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

async function authorize(userId: string, role: string | undefined, classId: string) {
  if (isAdmin(role)) return true
  if (role === 'TEACHER') {
    const { authorized } = await verifyTeacherClassAccess(userId, classId)
    return authorized
  }
  return false
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; textbookId: string }> }
) {
  const session = await auth()
  const { classId, textbookId } = await params
  if (!await authorize(session?.user?.id ?? '', session?.user?.role, classId)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const body = await req.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const textbook = await prisma.textbook.findFirst({ where: { id: textbookId, classId } })
  if (!textbook) {
    return NextResponse.json({ success: false, error: 'Textbook not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const updated = await prisma.textbook.update({
    where: { id: textbookId },
    data: result.data,
  })

  return NextResponse.json({
    success: true,
    data: { id: updated.id, name: updated.name, nameZh: updated.nameZh, price: updated.price.toString() },
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string; textbookId: string }> }
) {
  const session = await auth()
  const { classId, textbookId } = await params
  if (!await authorize(session?.user?.id ?? '', session?.user?.role, classId)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const textbook = await prisma.textbook.findFirst({ where: { id: textbookId, classId } })
  if (!textbook) {
    return NextResponse.json({ success: false, error: 'Textbook not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  await prisma.textbook.update({ where: { id: textbookId }, data: { isActive: false } })

  return NextResponse.json({ success: true })
}
