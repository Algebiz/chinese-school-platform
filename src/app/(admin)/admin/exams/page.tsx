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

  const [sessions, registrations, paidCount, classExams] = await Promise.all([
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
    prisma.classExam.findMany({
      where: { academicYear: CURRENT_YEAR },
      include: {
        class: { select: { name: true, nameEn: true } },
        results: { select: { score: true, passed: true } },
      },
      orderBy: { examDate: 'desc' },
    }),
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
        academicYear={CURRENT_YEAR}
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
            examSessionId: r.examSessionId,
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

      {/* Class Exams overview */}
      {classExams.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-gray-900">
            班级考试 / Class Exams — {CURRENT_YEAR}
            <span className="ml-2 text-sm font-normal text-gray-400">({classExams.length} 场)</span>
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">班级 / Class</th>
                  <th className="px-4 py-3 text-left">考试名称</th>
                  <th className="px-4 py-3 text-left">日期</th>
                  <th className="px-4 py-3 text-left">总人数</th>
                  <th className="px-4 py-3 text-left">通过</th>
                  <th className="px-4 py-3 text-left">未通过</th>
                  <th className="px-4 py-3 text-left">待录入</th>
                  <th className="px-4 py-3 text-left">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classExams.map((exam) => {
                  const entered = exam.results.filter((r) => r.score !== null)
                  const passed = entered.filter((r) => r.passed === true).length
                  const failed = entered.filter((r) => r.passed === false).length
                  const pending = exam.results.length - entered.length
                  return (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{exam.class.name}</p>
                        {exam.class.nameEn && <p className="text-xs text-gray-400">{exam.class.nameEn}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{exam.nameZh}</p>
                        <p className="text-xs text-gray-400">{exam.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{exam.examDate.toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-3 text-gray-700">{exam.results.length}</td>
                      <td className="px-4 py-3 font-medium text-green-700">{passed}</td>
                      <td className="px-4 py-3 font-medium text-red-600">{failed}</td>
                      <td className="px-4 py-3 text-amber-600">{pending}</td>
                      <td className="px-4 py-3">
                        {exam.isPublished ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">已发布</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">草稿</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
