import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function verifyAdmin() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') return null
  return session
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdmin()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    const deposits = await prisma.volunteerDeposit.findMany({
      where: statusFilter ? { status: statusFilter as never } : undefined,
      include: {
        family: {
          include: {
            users: { select: { id: true, name: true, email: true } },
          },
        },
        claims: {
          include: {
            service: { select: { name: true, nameZh: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: deposits })
  } catch (error) {
    console.error('GET /api/admin/volunteer/deposits error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deposits', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
