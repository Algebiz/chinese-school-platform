import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json() as {
    currentPassword: string
    newPassword: string
  }

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ success: false, error: 'All fields required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ success: false, error: 'New password must be at least 8 characters', code: 'TOO_SHORT' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  if (!user?.password) {
    return NextResponse.json({ success: false, error: 'No password set for this account', code: 'NO_PASSWORD' }, { status: 400 })
  }

  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    return NextResponse.json({
      success: false,
      error: '当前密码不正确 / Incorrect current password',
      code: 'WRONG_PASSWORD',
    }, { status: 400 })
  }

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  })

  return NextResponse.json({ success: true })
}
