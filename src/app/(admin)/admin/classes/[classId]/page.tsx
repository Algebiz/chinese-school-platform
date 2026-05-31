import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { getStudentStatuses } from '@/lib/student-status'
import { ClassDetailClient } from './ClassDetailClient'
import type { EnrolledStudent, AvailableClass, CancelledRow } from './ClassDetailClient'
import { sortByLastNamePinyin } from '@/lib/pinyin-sort'
import { TextbookManager } from './TextbookManager'
import type { TextbookRow } from './TextbookManager'
import { EditClassButton } from './EditClassButton'
import type { EditableClass } from '@/components/admin/EditClassModal'

function fmtSchedule(s: unknown): string {
  if (!s || typeof s !== 'object') return '—'
  const o = s as Record<string, string>
  return [o.dayOfWeek, o.startTime && o.endTime ? `${o.startTime}–${o.endTime}` : '', o.room].filter(Boolean).join(' ')
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>
}) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { classId } = await params
  const YEAR = await getCurrentAcademicYear()

  const [cls, enrollments, allSameTypeClasses, pendingCount, cancelledCount, allTeachers, waitlistCount, cancelledLogs] = await Promise.all([
    prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { name: true } },
        textbooks: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.enrollment.findMany({
      where: { classId, status: 'CONFIRMED' },
      include: {
        student: {
          include: {
            family: {
              include: { users: { select: { name: true, email: true, phone: true } } },
            },
          },
        },
        textbooks: { include: { textbook: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.class.findMany({
      where: { year: YEAR, id: { not: classId } },
      include: {
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
    }),
    prisma.enrollment.count({ where: { classId, status: 'PENDING' } }),
    prisma.enrollment.count({ where: { classId, status: 'CANCELLED' } }),
    prisma.teacher.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, nameEn: true } }),
    prisma.waitlist.count({ where: { classId } }),
    prisma.adjustmentLog.findMany({
      where: { fromClassId: classId, toClassId: null },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!cls) notFound()

  // Build cancelled rows from adjustment logs
  const cancelledRows: CancelledRow[] = []
  if (cancelledLogs.length > 0) {
    const studentIds = [...new Set(cancelledLogs.map((l) => l.studentId))]
    const adminIds = [...new Set(cancelledLogs.map((l) => l.adminId))]
    const [cancelStudents, adminUsers] = await Promise.all([
      prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, name: true, nameEn: true },
      }),
      prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, name: true },
      }),
    ])
    const studentMap = Object.fromEntries(cancelStudents.map((s) => [s.id, s]))
    const adminMap = Object.fromEntries(adminUsers.map((u) => [u.id, u]))
    for (const log of cancelledLogs) {
      const student = studentMap[log.studentId]
      if (student) {
        cancelledRows.push({
          studentName: student.name,
          studentNameEn: student.nameEn,
          cancelledAt: log.createdAt.toISOString(),
          reason: log.reason,
          cancelledBy: adminMap[log.adminId]?.name ?? null,
        })
      }
    }
  }

  const studentStatuses = await getStudentStatuses(
    enrollments.map((e) => e.student.id),
    YEAR
  )

  const enrolledStudentsUnsorted: EnrolledStudent[] = enrollments.map((e) => {
    const parent = e.student.family?.users[0]
    return {
      enrollmentId: e.id,
      studentName: e.student.name,
      studentNameEn: e.student.nameEn,
      parentName: parent?.name ?? '—',
      phone: parent?.phone ?? null,
      email: parent?.email ?? '—',
      enrolledAt: e.createdAt.toISOString(),
      textbookNames: e.textbooks.map((et) => et.textbook.name),
      status: studentStatuses[e.student.id] ?? 'NEW',
    }
  })

  const enrolledStudents = sortByLastNamePinyin(
    enrolledStudentsUnsorted,
    (s) => s.studentName,
    (s) => s.studentNameEn
  )

  // Available classes: same type as current, with spots remaining info
  const availableClasses: AvailableClass[] = allSameTypeClasses
    .filter((c) => c.type === cls.type)
    .map((c) => ({
      id: c.id,
      name: c.name,
      spotsRemaining: Math.max(0, c.capacity - c._count.enrollments),
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            <a href="/admin/classes" className="hover:text-gray-700">班级管理</a>
            {' / '}
            {cls.name}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{cls.name}</h1>
          {cls.nameEn && <p className="text-sm text-gray-500">{cls.nameEn}</p>}
        </div>
        <EditClassButton
          cls={{
            id: cls.id,
            name: cls.name,
            nameEn: cls.nameEn,
            type: cls.type,
            teacherId: cls.teacherId,
            capacity: cls.capacity,
            fee: cls.fee.toString(),
            schedule: cls.schedule,
            description: cls.description,
            descriptionZh: cls.descriptionZh,
            isActive: cls.isActive,
            enrolledCount: enrollments.length,
          } satisfies EditableClass}
          teachers={allTeachers.map((t) => ({ id: t.id, name: t.name, nameEn: t.nameEn }))}
        />
      </div>

      {/* Class info card */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-400">老师 / Teacher</p>
          <p className="mt-1 font-medium">{cls.teacher?.name ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">时间 / Schedule</p>
          <p className="mt-1 font-medium text-sm">{fmtSchedule(cls.schedule)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">总名额 / Capacity</p>
          <p className="mt-1 font-medium">{cls.capacity}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">已报名 / Enrolled</p>
          <p className="mt-1 font-medium">
            {enrollments.length}
            <span className="ml-1 text-sm text-gray-400">
              / {cls.capacity} ({Math.max(0, cls.capacity - enrollments.length)} 余)
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {enrollments.length} 已确认
            {pendingCount > 0 && <span className="ml-1 text-amber-600">· {pendingCount} 待付款</span>}
            {cancelledCount > 0 && <span className="ml-1 text-gray-400">· {cancelledCount} 已取消</span>}
          </p>
        </div>
      </div>

      {/* Student table (client component) */}
      <div>
        <h2 className="mb-3 font-semibold text-gray-900">
          已报名学生 / Confirmed Students ({enrollments.length})
        </h2>
        <ClassDetailClient
          enrolledStudents={enrolledStudents}
          currentClassName={cls.name}
          availableClasses={availableClasses}
          waitlistCount={waitlistCount}
          cancelledRows={cancelledRows}
        />
      </div>

      {/* Textbook management — language classes only */}
      {cls.type === 'CHINESE' && (
        <div>
          <TextbookManager
            classId={classId}
            initialTextbooks={cls.textbooks.map((t): TextbookRow => ({
              id: t.id,
              name: t.name,
              nameZh: t.nameZh,
              description: t.description,
              descriptionZh: t.descriptionZh,
              price: t.price.toString(),
              isActive: t.isActive,
            }))}
          />
        </div>
      )}

      {/* Class Exams — read-only admin view */}
      <AdminClassExamsSection classId={classId} />
    </div>
  )
}

async function AdminClassExamsSection({ classId }: { classId: string }) {
  const exams = await prisma.classExam.findMany({
    where: { classId },
    include: {
      results: { select: { score: true, passed: true } },
    },
    orderBy: { examDate: 'desc' },
  })

  if (exams.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 font-semibold text-gray-900">
        班级考试 / Class Exams ({exams.length})
      </h2>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">考试名称</th>
              <th className="px-4 py-3 text-left">日期</th>
              <th className="px-4 py-3 text-left">满分</th>
              <th className="px-4 py-3 text-left">通过 / 总人数</th>
              <th className="px-4 py-3 text-left">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {exams.map((exam) => {
              const entered = exam.results.filter((r) => r.score !== null)
              const passed = entered.filter((r) => r.passed === true).length
              return (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{exam.nameZh}</p>
                    <p className="text-xs text-gray-400">{exam.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {exam.examDate.toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{exam.maxScore}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-green-700">{passed}</span>
                    <span className="text-gray-400"> / {exam.results.length}</span>
                  </td>
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
  )
}
