import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  role: z.enum(['PARENT', 'ADMIN', 'SUPER_ADMIN']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { userId } = await params

  if (userId === session.user.id) {
    return NextResponse.json({ success: false, error: 'Cannot change your own role', code: 'FORBIDDEN' }, { status: 400 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const { role: newRole } = result.data

  // Guard: cannot demote the last SUPER_ADMIN
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!target) return NextResponse.json({ success: false, error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })

  if (target.role === 'SUPER_ADMIN' && newRole !== 'SUPER_ADMIN') {
    const count = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } })
    if (count <= 1) {
      return NextResponse.json({ success: false, error: 'Cannot demote the last SUPER_ADMIN', code: 'LAST_SUPER_ADMIN' }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: { role: newRole }, select: { id: true, email: true, role: true } })
  return NextResponse.json({ success: true, data: updated })
}
