import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: {
          select: {
            enrollments: { where: { status: 'CONFIRMED' } },
            waitlists: true,
          },
        },
      },
    })

    if (!cls) {
      return NextResponse.json(
        { success: false, error: 'Class not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const { _count, fee, ...rest } = cls

    return NextResponse.json({
      success: true,
      data: {
        ...rest,
        fee: fee.toString(),
        enrolledCount: _count.enrollments,
        spotsRemaining: Math.max(0, rest.capacity - _count.enrollments),
        waitlistCount: _count.waitlists,
      },
    })
  } catch (error) {
    console.error('Class detail API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch class', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
