import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const createSchema = z.object({
  name: z.string().min(1),
  nameZh: z.string().min(1),
  description: z.string().optional(),
  descriptionZh: z.string().optional(),
  price: z.number().positive(),
})

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { classId } = await params
  const textbooks = await prisma.textbook.findMany({
    where: { classId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: textbooks.map((t) => ({
      id: t.id,
      name: t.name,
      nameZh: t.nameZh,
      description: t.description,
      descriptionZh: t.descriptionZh,
      price: t.price.toString(),
      isActive: t.isActive,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { classId } = await params
  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, type: true } })
  if (!cls) {
    return NextResponse.json({ success: false, error: 'Class not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  if (cls.type !== 'CHINESE') {
    return NextResponse.json({ success: false, error: 'Textbooks only for language classes', code: 'INVALID_CLASS_TYPE' }, { status: 400 })
  }

  const body = await req.json()
  const result = createSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const textbook = await prisma.textbook.create({
    data: { classId, ...result.data },
  })

  return NextResponse.json({
    success: true,
    data: { id: textbook.id, name: textbook.name, nameZh: textbook.nameZh, price: textbook.price.toString() },
  })
}
