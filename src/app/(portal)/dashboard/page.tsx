import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const CURRENT_YEAR = '2025-2026'

const CLASS_TYPE_LABEL: Record<string, string> = {
  CHINESE: '中文班',
  ARTS: '才艺班',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        已确认 / Confirmed
      </span>
    )
  }
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        待付款 / Pending payment
      </span>
    )
  }
  return null
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      familyId: true,
      family: {
        select: {
          students: {
            include: {
              enrollments: {
                where: { status: { in: ['PENDING', 'CONFIRMED'] } },
                include: {
                  class: {
                    select: { id: true, name: true, type: true, year: true, fee: true },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
              waitlists: {
                include: {
                  class: { select: { name: true, type: true, year: true } },
                },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  const students = user?.family?.students ?? []

  // Filter to current academic year only
  const studentsThisYear = students.map((s) => ({
    ...s,
    enrollments: s.enrollments.filter((e) => e.class.year === CURRENT_YEAR),
    waitlists: s.waitlists.filter((w) => w.class.year === CURRENT_YEAR),
  }))

  const totalConfirmed = studentsThisYear.reduce(
    (sum, s) => sum + s.enrollments.filter((e) => e.status === 'CONFIRMED').length,
    0
  )
  const pendingEnrollments = studentsThisYear.flatMap((s) =>
    s.enrollments.filter((e) => e.status === 'PENDING')
  )

  const hasFamily = !!user?.familyId

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          你好，{user?.name ?? '家长'} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {CURRENT_YEAR} 学年注册状态 / {CURRENT_YEAR} Academic Year Enrollment Status
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">学生人数</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{students.length}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">已确认报名</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{totalConfirmed}</p>
          <p className="text-xs text-gray-500">Confirmed enrollments</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">待付款</p>
          <p className="mt-1 text-3xl font-bold text-amber-500">{pendingEnrollments.length}</p>
          <p className="text-xs text-gray-500">Pending payment</p>
        </div>
      </div>

      {/* Pending payment banner */}
      {pendingEnrollments.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            ⚠ 您有 {pendingEnrollments.length} 个报名等待付款
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            You have {pendingEnrollments.length} enrollment(s) awaiting payment. Complete payment to secure your spot.
          </p>
          <Link
            href={`/portal/checkout?enrollmentIds=${pendingEnrollments.map((e) => e.id).join(',')}`}
            className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            完成付款 / Complete Payment →
          </Link>
        </div>
      )}

      {/* Students & enrollments */}
      <div className="space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">
          学生报名详情 / Student Enrollment Details
        </h2>

        {!hasFamily || students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-500">尚未添加学生 / No students added yet</p>
            <Link
              href="/portal/enroll"
              className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              开始报名 / Start Enrollment
            </Link>
          </div>
        ) : (
          studentsThisYear.map((student) => (
            <div key={student.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              {/* Student header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div>
                  <span className="font-semibold text-gray-900">{student.name}</span>
                  {student.nameEn && (
                    <span className="ml-2 text-sm text-gray-500">{student.nameEn}</span>
                  )}
                </div>
                <Link
                  href="/portal/enroll"
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  + 添加课程 / Add class
                </Link>
              </div>

              {/* Enrollments */}
              {student.enrollments.length === 0 && student.waitlists.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">
                  尚未报名任何课程 / No classes enrolled for {CURRENT_YEAR}
                </p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {student.enrollments.map((enrollment) => (
                    <li key={enrollment.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {enrollment.class.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {CLASS_TYPE_LABEL[enrollment.class.type] ?? enrollment.class.type}
                        </span>
                      </div>
                      <StatusBadge status={enrollment.status} />
                    </li>
                  ))}
                  {student.waitlists.map((w) => (
                    <li key={w.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{w.class.name}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {CLASS_TYPE_LABEL[w.class.type] ?? w.class.type}
                        </span>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        候补 #{w.position} / Waitlist
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">快速操作 / Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/portal/classes"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            浏览班级 / Browse Classes
          </Link>
          <Link
            href="/portal/enroll"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            为学生报名 / Enroll a Student
          </Link>
        </div>
      </div>
    </div>
  )
}
