import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const PAGE_SIZE = 20

async function verifySuperAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await verifySuperAdmin()
  if (!session) return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, createdAt: true, family: { select: { _count: { select: { students: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      users: users.map((u) => ({ ...u, studentCount: u.family?._count.students ?? 0, createdAt: u.createdAt.toISOString() })),
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  })
}
