import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getCurrentAcademicYear } from '@/lib/academic-year'
import { getStudentStatuses } from '@/lib/student-status'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import { PendingEnrollmentCard } from './PendingEnrollmentCard'

const CLASS_TYPE_LABEL: Record<string, string> = {
  CHINESE: '中文班',
  ARTS: '才艺班',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const CURRENT_YEAR = await getCurrentAcademicYear()

  const familyIdForDeposit = (await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { familyId: true },
  }))?.familyId

  const volunteerDeposit = familyIdForDeposit
    ? await prisma.volunteerDeposit.findUnique({
        where: { familyId_academicYear: { familyId: familyIdForDeposit, academicYear: CURRENT_YEAR } },
      })
    : null

  const myExamRegistrations = await prisma.examRegistration.findMany({
    where: {
      student: { family: { users: { some: { id: session.user.id } } } },
      status: { notIn: ['CANCELLED'] },
      examSession: { academicYear: CURRENT_YEAR },
    },
    include: {
      examSession: { select: { examType: true, level: true, examDate: true } },
      student: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

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
                  textbooks: {
                    include: { textbook: { select: { name: true } } },
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

  const studentStatuses = await getStudentStatuses(
    students.map((s) => s.id),
    CURRENT_YEAR
  )

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

  // Detect students with multiple pending enrollments (spec #5 warning)
  const studentsWithMultiplePending = studentsThisYear.filter(
    (s) => s.enrollments.filter((e) => e.status === 'PENDING').length > 1
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

      {/* Multiple-pending warning (spec #5) */}
      {studentsWithMultiplePending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            ⚠ 您有多个待付款的注册记录。请完成付款或取消不需要的注册。
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            You have multiple pending enrollments. Please complete payment or cancel any you no longer need.
          </p>
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
              href="/enroll"
              className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              开始报名 / Start Enrollment
            </Link>
          </div>
        ) : (
          studentsThisYear.map((student) => {
            const pendingForStudent = student.enrollments.filter((e) => e.status === 'PENDING')
            const confirmedForStudent = student.enrollments.filter((e) => e.status === 'CONFIRMED')

            return (
              <div key={student.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                {/* Student header */}
                {(() => {
                  const hasConfirmedLanguage = student.enrollments.some(
                    (e) => e.status === 'CONFIRMED' && e.class.type === 'CHINESE'
                  )
                  const hasConfirmedArts = student.enrollments.some(
                    (e) => e.status === 'CONFIRMED' && e.class.type === 'ARTS'
                  )
                  return (
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-gray-900">{student.name}</span>
                        {student.nameEn && (
                          <span className="text-sm text-gray-500">{student.nameEn}</span>
                        )}
                        <StudentStatusBadge status={studentStatuses[student.id] ?? 'NEW'} />
                      </div>
                      <div className="flex items-center gap-3">
                        {hasConfirmedLanguage && !hasConfirmedArts && (
                          <Link
                            href={`/enroll?studentId=${student.id}&artsOnly=true`}
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                          >
                            ➕ 添加才艺课 / Add Arts Class
                          </Link>
                        )}
                        <Link
                          href="/enroll"
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          + 添加课程 / Add class
                        </Link>
                      </div>
                    </div>
                  )
                })()}

                {student.enrollments.length === 0 && student.waitlists.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">
                    尚未报名任何课程 / No classes enrolled for {CURRENT_YEAR}
                  </p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {/* Pending enrollments — amber cards with cancel button */}
                    {pendingForStudent.map((enrollment) => {
                      const textbookTotal = enrollment.textbooks.reduce(
                        (sum, et) => sum + parseFloat(et.price.toString()),
                        0
                      )
                      const total = (parseFloat(enrollment.class.fee.toString()) + textbookTotal).toFixed(2)
                      return (
                        <div key={enrollment.id} className="px-5 py-3">
                          <PendingEnrollmentCard
                            enrollmentId={enrollment.id}
                            className={enrollment.class.name}
                            total={total}
                            textbookNames={enrollment.textbooks.map((et) => et.textbook.name)}
                          />
                        </div>
                      )
                    })}

                    {/* Confirmed enrollments — simple rows */}
                    {confirmedForStudent.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {enrollment.class.name}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">
                            {CLASS_TYPE_LABEL[enrollment.class.type] ?? enrollment.class.type}
                          </span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          已确认 / Confirmed
                        </span>
                      </div>
                    ))}

                    {/* Waitlists */}
                    {student.waitlists.map((w) => (
                      <div key={w.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{w.class.name}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {CLASS_TYPE_LABEL[w.class.type] ?? w.class.type}
                          </span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          候补 #{w.position} / Waitlist
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Exam registrations */}
      {myExamRegistrations.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
            <h2 className="font-semibold text-gray-900">考试报名 / Exam Registrations</h2>
            <Link href="/exams" className="text-xs text-red-600 hover:text-red-800 font-medium">
              查看全部 / View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {myExamRegistrations.map((r) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                PENDING_PAYMENT: { label: '待支付', color: 'bg-amber-100 text-amber-700' },
                PAID: { label: '待审核', color: 'bg-blue-100 text-blue-700' },
                CONFIRMED: { label: '已确认', color: 'bg-green-100 text-green-700' },
                REJECTED: { label: '未通过', color: 'bg-red-100 text-red-700' },
              }
              const badge = statusMap[r.status]
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{r.student.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {r.examSession.examType} Level {r.examSession.level}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(r.examSession.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    )}
                    {r.status === 'PENDING_PAYMENT' && (
                      <Link href={`/exam-checkout?registrationId=${r.id}`} className="text-xs text-red-600 hover:text-red-800 font-medium">
                        支付 →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Volunteer Deposit */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
          <h2 className="font-semibold text-gray-900">志愿服务押金 / Volunteer Deposit</h2>
          <Link href="/volunteer" className="text-xs text-red-600 hover:text-red-800 font-medium">
            查看详情 / View details →
          </Link>
        </div>
        <div className="px-5 py-4">
          {!volunteerDeposit ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">押金将在首次报名时收取（$100，可退）</p>
                <p className="text-xs text-gray-400">Deposit collected at first enrollment — refundable after volunteer service</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  volunteerDeposit.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                  volunteerDeposit.status === 'CLAIM_PENDING' ? 'bg-purple-100 text-purple-700' :
                  volunteerDeposit.status === 'CLAIM_APPROVED' ? 'bg-green-100 text-green-700' :
                  volunteerDeposit.status === 'REFUNDED' ? 'bg-green-100 text-green-700' :
                  volunteerDeposit.status === 'FORFEITED' ? 'bg-gray-100 text-gray-500' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {volunteerDeposit.status === 'PENDING' ? '待支付 / Pending' :
                   volunteerDeposit.status === 'PAID' ? '已支付 / Paid' :
                   volunteerDeposit.status === 'CLAIM_PENDING' ? '申请审核中 / Claim Under Review' :
                   volunteerDeposit.status === 'CLAIM_APPROVED' ? '已批准 / Approved' :
                   volunteerDeposit.status === 'REFUNDED' ? '已退款 / Refunded' :
                   '已没收 / Forfeited'}
                </span>
                <p className="mt-1 text-xs text-gray-400">
                  金额 / Amount: ${parseFloat(volunteerDeposit.amount.toString()).toFixed(2)}
                </p>
              </div>
              {volunteerDeposit.status === 'PAID' && (
                <Link href="/volunteer" className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
                  申请退款 / Claim Refund
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">快速操作 / Quick Actions</h2>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/classes"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            浏览班级 / Browse Classes
          </Link>
          <Link
            href="/enroll"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            为学生报名 / Enroll a Student
          </Link>
          <Link
            href="/exams"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            报名考试 / Register for Exam
          </Link>
          <Link
            href="/contact"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            联系学校 / Contact School
          </Link>
        </div>
      </div>
    </div>
  )
}
