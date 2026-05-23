import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { familyId: true },
    })

    if (!user?.familyId) {
      return NextResponse.json({ success: true, data: null })
    }

    const academicYear = await getCurrentAcademicYear()

    const deposit = await prisma.volunteerDeposit.findUnique({
      where: { familyId_academicYear: { familyId: user.familyId, academicYear } },
      include: {
        claims: {
          include: { service: { select: { name: true, nameZh: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return NextResponse.json({ success: true, data: deposit })
  } catch (error) {
    console.error('GET /api/volunteer/deposit error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deposit', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
