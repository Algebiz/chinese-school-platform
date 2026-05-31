import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const search = new URL(req.url).searchParams.get('search') ?? ''

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {},
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
    take: 20,
  })

  return NextResponse.json({ success: true, data: users })
}
