import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { AdminExamsClient } from './AdminExamsClient'

export default async function AdminExamsPage() {
  const session = await auth()
  if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const CURRENT_YEAR = await getCurrentAcademicYear()

  const [sessions, registrations, paidCount] = await Promise.all([
    prisma.examSession.findMany({
      where: { academicYear: CURRENT_YEAR },
      include: {
        _count: { select: { registrations: { where: { status: { notIn: ['CANCELLED'] } } } } },
      },
      orderBy: [{ examDate: 'asc' }, { level: 'asc' }],
    }),
    prisma.examRegistration.findMany({
      where: { examSession: { academicYear: CURRENT_YEAR } },
      include: {
        examSession: { select: { examType: true, level: true, examDate: true, location: true, locationZh: true, academicYear: true } },
        student: {
          include: { family: { include: { users: { select: { name: true, email: true }, take: 1 } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.examRegistration.count({ where: { status: 'PAID' } }),
  ])

  const yctCount = registrations.filter((r) => r.examSession.examType === 'YCT').length
  const hskCount = registrations.filter((r) => r.examSession.examType === 'HSK').length
  const confirmedCount = registrations.filter((r) => r.status === 'CONFIRMED').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">考试管理 / Exam Management</h1>
        <p className="mt-1 text-sm text-gray-500">{CURRENT_YEAR} 学年 YCT / HSK 考试报名</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">总报名</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{registrations.length}</p>
          <p className="text-xs text-gray-500">Total registrations</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">待审核</p>
          <p className="mt-1 text-3xl font-bold text-amber-500">{paidCount}</p>
          <p className="text-xs text-gray-500">Pending review</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">已确认</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{confirmedCount}</p>
          <p className="text-xs text-gray-500">Confirmed</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">YCT / HSK</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{yctCount} / {hskCount}</p>
          <p className="text-xs text-gray-500">By exam type</p>
        </div>
      </div>

      <AdminExamsClient
        sessions={sessions.map((s) => ({
          id: s.id,
          examType: s.examType,
          level: s.level,
          examDate: s.examDate.toISOString(),
          registrationDeadline: s.registrationDeadline.toISOString(),
          locationEn: s.location,
          locationZh: s.locationZh,
          fee: s.fee.toString(),
          capacity: s.capacity,
          registeredCount: s._count.registrations,
          spotsRemaining: Math.max(0, s.capacity - s._count.registrations),
          academicYear: s.academicYear,
          isActive: s.isActive,
          notes: s.notes ?? null,
          notesZh: s.notesZh ?? null,
        }))}
        registrations={registrations.map((r) => {
          const parent = r.student.family?.users[0]
          return {
            id: r.id,
            examType: r.examSession.examType,
            level: r.examSession.level,
            examDate: r.examSession.examDate.toISOString(),
            studentNameZh: r.studentNameZh,
            studentNameEn: r.studentNameEn,
            parentName: parent?.name ?? null,
            parentEmail: parent?.email ?? null,
            status: r.status,
            paymentMethod: r.paymentMethod,
            amount: r.amount?.toString() ?? null,
            paidAt: r.paidAt?.toISOString() ?? null,
            confirmedAt: r.confirmedAt?.toISOString() ?? null,
            rejectedAt: r.rejectedAt?.toISOString() ?? null,
            rejectionReason: r.rejectionReason,
            notes: r.notes,
            createdAt: r.createdAt.toISOString(),
          }
        })}
        paidCount={paidCount}
      />
    </div>
  )
}
