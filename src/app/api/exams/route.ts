import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const now = new Date()

    const [sessions, myStudents] = await Promise.all([
      prisma.examSession.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
        },
        orderBy: [{ examDate: 'asc' }, { level: 'asc' }],
      }),
      prisma.student.findMany({
        where: {
          family: { users: { some: { id: session.user.id } } },
        },
        select: { id: true },
      }),
    ])

    const studentIds = myStudents.map((s) => s.id)

    const myRegistrations = studentIds.length > 0
      ? await prisma.examRegistration.findMany({
          where: { studentId: { in: studentIds } },
          include: {
            examSession: { select: { examType: true, level: true, examDate: true } },
            student: { select: { name: true, nameEn: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          examType: s.examType,
          level: s.level,
          examDate: s.examDate.toISOString(),
          registrationDeadline: s.registrationDeadline.toISOString(),
          location: s.location,
          locationZh: s.locationZh,
          fee: s.fee.toString(),
          capacity: s.capacity,
          spotsRemaining: Math.max(0, s.capacity - s._count.registrations),
          isOpen: s.registrationDeadline >= now,
          notes: s.notes,
          notesZh: s.notesZh,
          academicYear: s.academicYear,
        })),
        myRegistrations: myRegistrations.map((r) => ({
          id: r.id,
          examSessionId: r.examSessionId,
          studentId: r.studentId,
          studentName: r.student.name,
          studentNameEn: r.student.nameEn,
          status: r.status,
          examType: r.examSession.examType,
          level: r.examSession.level,
          examDate: r.examSession.examDate.toISOString(),
          paidAt: r.paidAt?.toISOString() ?? null,
          confirmedAt: r.confirmedAt?.toISOString() ?? null,
          amount: r.amount?.toString() ?? null,
        })),
      },
    })
  } catch (error) {
    console.error('GET /api/exams error:', error)
    return NextResponse.json({ success: false, error: 'Server error', code: 'SERVER_ERROR' }, { status: 500 })
  }
}
