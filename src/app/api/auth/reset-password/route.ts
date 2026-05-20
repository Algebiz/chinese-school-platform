import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { token, password } = result.data

    const record = await prisma.verificationToken.findUnique({ where: { token } })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link', code: 'INVALID_TOKEN' },
        { status: 400 }
      )
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.json(
        { success: false, error: 'Reset link has expired', code: 'TOKEN_EXPIRED' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email: record.identifier } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Account not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('reset-password error:', err)
    return NextResponse.json(
      { success: false, error: 'Reset failed', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
