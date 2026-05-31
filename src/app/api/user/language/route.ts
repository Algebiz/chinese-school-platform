import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) {
    const cookieStore = await cookies()
    return NextResponse.json({ language: cookieStore.get('preferredLanguage')?.value ?? 'zh' })
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredLanguage: true },
  })
  return NextResponse.json({ language: user?.preferredLanguage ?? 'zh' })
}

export async function PATCH(req: NextRequest) {
  const { language } = await req.json()
  if (language !== 'zh' && language !== 'en') {
    return NextResponse.json({ success: false, error: 'Invalid language' }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set('preferredLanguage', language, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  })

  const session = await auth()
  if (session?.user?.id) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredLanguage: language },
    })
  }

  return NextResponse.json({ success: true })
}
