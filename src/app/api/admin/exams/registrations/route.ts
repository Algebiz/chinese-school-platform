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
  const examSessionId = searchParams.get('examSessionId')
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 50

  const where: Record<string, unknown> = {}
  if (examSessionId) where.examSessionId = examSessionId
  if (status) where.status = status

  const [total, registrations] = await Promise.all([
    prisma.examRegistration.count({ where }),
    prisma.examRegistration.findMany({
      where,
      include: {
        examSession: { select: { examType: true, level: true, examDate: true, location: true, locationZh: true, academicYear: true } },
        student: {
          include: { family: { include: { users: { select: { name: true, email: true, phone: true }, take: 1 } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      total,
      page,
      registrations: registrations.map((r) => {
        const parent = r.student.family?.users[0]
        return {
          id: r.id,
          examSessionId: r.examSessionId,
          examType: r.examSession.examType,
          level: r.examSession.level,
          examDate: r.examSession.examDate.toISOString(),
          location: `${r.examSession.locationZh} / ${r.examSession.location}`,
          academicYear: r.examSession.academicYear,
          studentId: r.studentId,
          studentNameZh: r.studentNameZh,
          studentNameEn: r.studentNameEn,
          studentDob: r.studentDob?.toISOString() ?? null,
          parentName: parent?.name ?? null,
          parentEmail: parent?.email ?? null,
          parentPhone: parent?.phone ?? null,
          status: r.status,
          paymentMethod: r.paymentMethod,
          amount: r.amount?.toString() ?? null,
          paidAt: r.paidAt?.toISOString() ?? null,
          confirmedAt: r.confirmedAt?.toISOString() ?? null,
          confirmedBy: r.confirmedBy,
          rejectedAt: r.rejectedAt?.toISOString() ?? null,
          rejectedBy: r.rejectedBy,
          rejectionReason: r.rejectionReason,
          notes: r.notes,
          createdAt: r.createdAt.toISOString(),
        }
      }),
    },
  })
}
