import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createElement } from 'react'
import { render } from '@react-email/components'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@chineseschool.com'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://chinese-school-platform.vercel.app'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      // Return success to avoid revealing which emails are valid
      return NextResponse.json({ success: true })
    }

    const { email } = result.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    // Always return success — don't reveal whether the email exists
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Remove any existing reset tokens for this user, then create a fresh one
    await prisma.verificationToken.deleteMany({ where: { identifier: email } })

    const token = crypto.randomUUID()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    })

    const resetUrl = `${BASE_URL}/reset-password?token=${token}`
    const html = await render(
      createElement(PasswordResetEmail, {
        parentName: user.name ?? '家长',
        resetUrl,
      })
    )

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '重置密码 / Password Reset — Charlotte Chinese Academy',
      html,
    })
  } catch (err) {
    console.error('forgot-password error:', err)
    // Still return success to avoid leaking information
  }

  return NextResponse.json({ success: true })
}
