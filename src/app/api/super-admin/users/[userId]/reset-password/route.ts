import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@chineseschool.com'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://chinese-school-platform.vercel.app'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { userId } = await params
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (!user) return NextResponse.json({ success: false, error: 'User not found', code: 'NOT_FOUND' }, { status: 404 })

  // Remove existing tokens, create fresh one
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } })
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 60 * 60 * 1000)
  await prisma.verificationToken.create({ data: { identifier: user.email, token, expires } })

  const resetUrl = `${BASE_URL}/reset-password?token=${token}`
  const html = await render(createElement(PasswordResetEmail, { parentName: user.name ?? '用户', resetUrl }))

  await resend.emails.send({
    from: FROM,
    to: user.email,
    subject: '重置密码 / Password Reset — Charlotte Chinese Academy',
    html,
  })

  return NextResponse.json({ success: true })
}
