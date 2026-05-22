import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const take = 20
  const skip = (page - 1) * take

  const where = status && status !== 'ALL'
    ? { status: status as 'UNREAD' | 'READ' | 'REPLIED' }
    : {}

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.contactMessage.count({ where }),
  ])

  return NextResponse.json({ success: true, data: { messages, total, page } })
}
