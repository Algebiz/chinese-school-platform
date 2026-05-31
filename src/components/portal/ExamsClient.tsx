'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export interface ExamSessionData {
  id: string
  examType: string
  level: number
  examDate: string
  location: string
  locationZh: string
  fee: string
  capacity: number
  registeredCount: number
  registrationDeadline: string
  notesZh: string | null
  isActive: boolean
}

export interface StudentExamData {
  id: string
  name: string
  nameEn: string | null
  examRegistrations: Array<{
    id: string
    examSessionId: string
    status: string
    examSession: { id: string; examType: string; level: number }
  }>
}

interface Props {
  currentYear: string
  sessions: ExamSessionData[]
  myStudents: StudentExamData[]
}

export function ExamsClient({ currentYear, sessions, myStudents }: Props) {
  const { t } = useLanguage()
  const now = new Date()

  const statusLabel: Record<string, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: t('待支付', 'Pending Payment'),            color: 'bg-amber-100 text-amber-700' },
    PAID:            { label: t('已支付，待审核', 'Paid, Pending Review'), color: 'bg-blue-100 text-blue-700' },
    CONFIRMED:       { label: t('已确认', 'Confirmed'),                   color: 'bg-green-100 text-green-700' },
    REJECTED:        { label: t('未通过', 'Rejected'),                    color: 'bg-red-100 text-red-700' },
    CANCELLED:       { label: t('已取消', 'Cancelled'),                   color: 'bg-gray-100 text-gray-500' },
  }

  function isRegistered(sessionId: string) {
    return myStudents.some((s) =>
      s.examRegistrations.some((r) => r.examSessionId === sessionId && r.status !== 'CANCELLED')
    )
  }

  function getMyRegistration(sessionId: string) {
    for (const student of myStudents) {
      const reg = student.examRegistrations.find((r) => r.examSessionId === sessionId && r.status !== 'CANCELLED')
      if (reg) return { reg, student }
    }
    return null
  }

  const yctSessions = sessions.filter((s) => s.examType === 'YCT')
  const hskSessions = sessions.filter((s) => s.examType === 'HSK')

  function SessionCard({ s }: { s: ExamSessionData }) {
    const deadline = new Date(s.registrationDeadline)
    const examDate = new Date(s.examDate)
    const isOpen = deadline >= now
    const spotsLeft = Math.max(0, s.capacity - s.registeredCount)
    const isFull = spotsLeft === 0
    const registered = isRegistered(s.id)
    const myReg = getMyRegistration(s.id)
    const deadlineDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900">{s.examType} Level {s.level}</span>
              {!isOpen && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {t('报名已截止', 'Closed')}
                </span>
              )}
              {isOpen && isFull && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                  {t('已满', 'Full')}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>📅 {examDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>📍 {s.locationZh} / {s.location}</p>
              <p>💰 {t('报名费', 'Fee')}: <span className="font-medium">${parseFloat(s.fee).toFixed(2)}</span></p>
              {isOpen && (
                <p className="text-xs text-gray-400">
                  {t('截止日期', 'Deadline')}:{' '}
                  {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {deadlineDays <= 7 && deadlineDays > 0 && (
                    <span className="ml-1 text-amber-600 font-medium">
                      （{deadlineDays} {t('天', 'days')} {t('剩余', 'left')}）
                    </span>
                  )}
                </p>
              )}
              {!isFull && isOpen && (
                <p className="text-xs text-gray-400">{t('剩余名额', 'Spots left')}: {spotsLeft}</p>
              )}
              {s.notesZh && <p className="text-xs text-gray-400 italic">{s.notesZh}</p>}
            </div>
          </div>

          <div className="shrink-0">
            {registered && myReg ? (
              <div className="text-right">
                <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusLabel[myReg.reg.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[myReg.reg.status]?.label ?? myReg.reg.status}
                </span>
                <p className="mt-1 text-xs text-gray-400">{myReg.student.name}</p>
                {myReg.reg.status === 'PENDING_PAYMENT' && (
                  <Link href={`/exam-checkout?registrationId=${myReg.reg.id}`}
                    className="mt-2 block rounded-md bg-amber-500 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-amber-600 transition-colors">
                    {t('完成支付', 'Pay Now')}
                  </Link>
                )}
              </div>
            ) : isOpen && !isFull ? (
              <Link href={`/exams/register?sessionId=${s.id}`}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                {t('报名', 'Register')}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('考试报名', 'Exam Registration')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {currentYear} · {t('YCT 和 HSK 等级考试', 'YCT and HSK Proficiency Exams')}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-500">{t('暂无开放的考试场次', 'No exam sessions currently available')}</p>
        </div>
      ) : (
        <>
          {yctSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('YCT 考试', 'YCT Exams')}</h2>
              <p className="mb-4 text-sm text-gray-500">
                {t('青少年汉语考试 — 针对非母语学习者', 'Youth Chinese Test — for non-native learners')}
              </p>
              <div className="space-y-3">
                {yctSessions.map((s) => <SessionCard key={s.id} s={s} />)}
              </div>
            </section>
          )}
          {hskSessions.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('HSK 考试', 'HSK Exams')}</h2>
              <p className="mb-4 text-sm text-gray-500">
                {t('汉语水平考试 — 国际中文能力标准', 'Hanyu Shuiping Kaoshi — international Chinese proficiency')}
              </p>
              <div className="space-y-3">
                {hskSessions.map((s) => <SessionCard key={s.id} s={s} />)}
              </div>
            </section>
          )}
        </>
      )}

      {myStudents.some((s) => s.examRegistrations.some((r) => r.status !== 'CANCELLED')) && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('我的报名记录', 'My Registrations')}</h2>
          <div className="space-y-2">
            {myStudents.flatMap((student) =>
              student.examRegistrations
                .filter((r) => r.status !== 'CANCELLED')
                .map((reg) => (
                  <div key={reg.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{student.name}</span>
                      <span className="ml-2 text-gray-500">{reg.examSession.examType} Level {reg.examSession.level}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel[reg.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[reg.status]?.label ?? reg.status}
                      </span>
                      {reg.status === 'PENDING_PAYMENT' && (
                        <Link href={`/exam-checkout?registrationId=${reg.id}`} className="text-xs font-medium text-red-600 hover:text-red-800">
                          {t('完成支付', 'Pay Now')} →
                        </Link>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}
