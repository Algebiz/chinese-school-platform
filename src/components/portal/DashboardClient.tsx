'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import { PendingEnrollmentCard } from '@/app/(portal)/dashboard/PendingEnrollmentCard'

export interface DashboardStudent {
  id: string
  name: string
  nameEn: string | null
  status: string
  enrollments: Array<{
    id: string
    status: string
    class: { id: string; name: string; type: string; fee: string }
    textbooks: Array<{ price: string; textbook: { name: string } }>
  }>
  waitlists: Array<{
    id: string
    position: number
    class: { name: string; type: string }
  }>
}

export interface DashboardProps {
  currentYear: string
  userName: string | null
  hasFamily: boolean
  studentCount: number
  totalConfirmed: number
  pendingCount: number
  hasMultiplePending: boolean
  students: DashboardStudent[]
  volunteerDeposit: { status: string; amount: string } | null
  examRegistrations: Array<{
    id: string
    status: string
    studentName: string
    examType: string
    level: number
    examDate: string
  }>
  classExamResults: Array<{
    id: string
    score: number
    passed: boolean
    studentId: string
    studentName: string
    examName: string
    examNameZh: string
    examDate: string
    maxScore: number
    className: string
  }>
}

export function DashboardClient({
  currentYear, userName, hasFamily, studentCount, totalConfirmed, pendingCount,
  hasMultiplePending, students, volunteerDeposit, examRegistrations, classExamResults,
}: DashboardProps) {
  const { t } = useLanguage()

  const classTypeLabel = (type: string) =>
    type === 'CHINESE' ? t('中文班', 'Chinese') : t('才艺班', 'Arts')

  const examStatusMap: Record<string, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: t('待支付', 'Pending Payment'), color: 'bg-amber-100 text-amber-700' },
    PAID:            { label: t('待审核', 'Pending Review'),  color: 'bg-blue-100 text-blue-700' },
    CONFIRMED:       { label: t('已确认', 'Confirmed'),       color: 'bg-green-100 text-green-700' },
    REJECTED:        { label: t('未通过', 'Rejected'),        color: 'bg-red-100 text-red-700' },
  }

  const depositStatusLabel: Record<string, string> = {
    PENDING:       t('待支付', 'Pending'),
    PAID:          t('已支付', 'Paid'),
    CLAIM_PENDING: t('申请审核中', 'Claim Under Review'),
    CLAIM_APPROVED:t('已批准', 'Approved'),
    REFUNDED:      t('已退款', 'Refunded'),
    FORFEITED:     t('已没收', 'Forfeited'),
    REFUND_FAILED: t('退款处理中', 'Refund Processing'),
  }

  // Group class exam results by student
  const examResultsByStudent: Record<string, typeof classExamResults> = {}
  for (const r of classExamResults) {
    if (!examResultsByStudent[r.studentId]) examResultsByStudent[r.studentId] = []
    examResultsByStudent[r.studentId].push(r)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t('你好，', 'Hello, ')}{userName ?? t('家长', 'Parent')} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t(`${currentYear} 学年注册状态`, `${currentYear} Academic Year Enrollment Status`)}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('学生人数', 'Students')}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{studentCount}</p>
          <p className="text-xs text-gray-500">{t('学生', 'Students')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('已确认报名', 'Confirmed')}</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{totalConfirmed}</p>
          <p className="text-xs text-gray-500">{t('已确认报名', 'Confirmed enrollments')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{t('待付款', 'Pending')}</p>
          <p className="mt-1 text-3xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-gray-500">{t('待付款', 'Pending payment')}</p>
        </div>
      </div>

      {/* Multiple-pending warning */}
      {hasMultiplePending && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            ⚠ {t('您有多个待付款的注册记录。请完成付款或取消不需要的注册。',
                   'You have multiple pending enrollments. Please complete payment or cancel any you no longer need.')}
          </p>
        </div>
      )}

      {/* Students & enrollments */}
      <div className="space-y-5">
        <h2 className="font-semibold text-gray-900 text-lg">
          {t('学生报名详情', 'Student Enrollment Details')}
        </h2>

        {!hasFamily || students.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-500">{t('尚未添加学生', 'No students added yet')}</p>
            <Link href="/enroll" className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
              {t('开始报名', 'Start Enrollment')}
            </Link>
          </div>
        ) : (
          students.map((student) => {
            const pending   = student.enrollments.filter((e) => e.status === 'PENDING')
            const confirmed = student.enrollments.filter((e) => e.status === 'CONFIRMED')
            const hasConfirmedChinese = confirmed.some((e) => e.class.type === 'CHINESE')
            const hasConfirmedArts    = confirmed.some((e) => e.class.type === 'ARTS')

            return (
              <div key={student.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-gray-900">{student.name}</span>
                    {student.nameEn && <span className="text-sm text-gray-500">{student.nameEn}</span>}
                    <StudentStatusBadge status={student.status as 'NEW' | 'RETURNING'} />
                  </div>
                  <div className="flex items-center gap-3">
                    {hasConfirmedChinese && !hasConfirmedArts && (
                      <Link
                        href={`/enroll?studentId=${student.id}&artsOnly=true`}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        ➕ {t('添加才艺课', 'Add Arts Class')}
                      </Link>
                    )}
                    <Link href="/enroll" className="text-xs font-medium text-gray-500 hover:text-gray-700">
                      + {t('添加课程', 'Add class')}
                    </Link>
                  </div>
                </div>

                {student.enrollments.length === 0 && student.waitlists.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">
                    {t(`尚未报名任何课程`, `No classes enrolled for ${currentYear}`)}
                  </p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pending.map((e) => {
                      const tbTotal = e.textbooks.reduce((sum, et) => sum + parseFloat(et.price), 0)
                      const total = (parseFloat(e.class.fee) + tbTotal).toFixed(2)
                      return (
                        <div key={e.id} className="px-5 py-3">
                          <PendingEnrollmentCard
                            enrollmentId={e.id}
                            className={e.class.name}
                            total={total}
                            textbookNames={e.textbooks.map((et) => et.textbook.name)}
                          />
                        </div>
                      )
                    })}

                    {confirmed.map((e) => (
                      <div key={e.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{e.class.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{classTypeLabel(e.class.type)}</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {t('已确认', 'Confirmed')}
                        </span>
                      </div>
                    ))}

                    {student.waitlists.map((w) => (
                      <div key={w.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{w.class.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{classTypeLabel(w.class.type)}</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {t('候补', 'Waitlist')} #{w.position}
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

      {/* Official exam registrations */}
      {examRegistrations.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
            <h2 className="font-semibold text-gray-900">{t('考试报名', 'Exam Registrations')}</h2>
            <Link href="/exams" className="text-xs text-red-600 hover:text-red-800 font-medium">
              {t('查看全部', 'View all')} →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {examRegistrations.map((r) => {
              const badge = examStatusMap[r.status]
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{r.studentName}</span>
                    <span className="ml-2 text-xs text-gray-500">{r.examType} Level {r.level}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                        {t('支付', 'Pay')} →
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
          <h2 className="font-semibold text-gray-900">{t('志愿服务押金', 'Volunteer Deposit')}</h2>
          <Link href="/volunteer" className="text-xs text-red-600 hover:text-red-800 font-medium">
            {t('查看详情', 'View details')} →
          </Link>
        </div>
        <div className="px-5 py-4">
          {!volunteerDeposit ? (
            <div>
              <p className="text-sm text-gray-700">
                {t('押金将在首次报名时收取（$100，可退）', 'A refundable $100 deposit is collected at first enrollment.')}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  volunteerDeposit.status === 'PAID'           ? 'bg-blue-100 text-blue-700' :
                  volunteerDeposit.status === 'CLAIM_PENDING'  ? 'bg-purple-100 text-purple-700' :
                  volunteerDeposit.status === 'CLAIM_APPROVED' ? 'bg-green-100 text-green-700' :
                  volunteerDeposit.status === 'REFUNDED'       ? 'bg-green-100 text-green-700' :
                  volunteerDeposit.status === 'FORFEITED'      ? 'bg-gray-100 text-gray-500' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {depositStatusLabel[volunteerDeposit.status] ?? volunteerDeposit.status}
                </span>
                <p className="mt-1 text-xs text-gray-400">
                  {t('金额', 'Amount')}: ${parseFloat(volunteerDeposit.amount).toFixed(2)}
                </p>
              </div>
              {volunteerDeposit.status === 'PAID' && (
                <Link href="/volunteer" className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">
                  {t('申请退款', 'Claim Refund')}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Class Exam Results */}
      {classExamResults.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
            <h2 className="font-semibold text-gray-900">📝 {t('班级考试成绩', 'Class Exam Results')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(examResultsByStudent).map(([studentId, results]) => (
              <div key={studentId} className="px-5 py-4">
                <p className="mb-2 font-medium text-gray-900">{results[0].studentName}</p>
                <div className="space-y-2">
                  {results.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{r.examNameZh} / {r.examName}</p>
                        <p className="text-xs text-gray-500">
                          {r.className} · {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-bold text-gray-900">{r.score} / {r.maxScore}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.passed ? `✅ ${t('通过', 'Passed')}` : `❌ ${t('未通过', 'Not Passed')}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold text-gray-900">{t('快速操作', 'Quick Actions')}</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/classes" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {t('浏览班级', 'Browse Classes')}
          </Link>
          <Link href="/enroll" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
            {t('为学生报名', 'Enroll a Student')}
          </Link>
          <Link href="/exams" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {t('报名考试', 'Register for Exam')}
          </Link>
          <Link href="/contact" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {t('联系学校', 'Contact School')}
          </Link>
        </div>
      </div>
    </div>
  )
}
