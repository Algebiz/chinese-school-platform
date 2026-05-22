import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isAdmin(role?: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session?.user?.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim()

  const families = await prisma.family.findMany({
    where: search
      ? {
          users: {
            some: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        }
      : undefined,
    include: {
      users: { select: { name: true, email: true }, take: 1 },
      _count: { select: { students: true } },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: families.map((f) => ({
      familyId: f.id,
      parentName: f.users[0]?.name ?? null,
      email: f.users[0]?.email ?? '',
      studentCount: f._count.students,
    })),
  })
}
