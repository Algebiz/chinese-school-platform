'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { badge, iconBox, CARD, CARD_HEADER, ROW } from '@/lib/design'

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

const STATUS_CONFIG: Record<string, { zh: string; en: string; color: 'amber' | 'blue' | 'green' | 'red' | 'gray' }> = {
  PENDING_PAYMENT: { zh: '待支付', en: 'Pending Payment', color: 'amber' },
  PAID:            { zh: '已支付，待审核', en: 'Paid, Pending Review', color: 'blue' },
  CONFIRMED:       { zh: '已确认', en: 'Confirmed', color: 'green' },
  REJECTED:        { zh: '未通过', en: 'Rejected', color: 'red' },
  CANCELLED:       { zh: '已取消', en: 'Cancelled', color: 'gray' },
}

export function ExamsClient({ currentYear, sessions, myStudents }: Props) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'YCT' | 'HSK'>('YCT')
  const now = new Date()

  function isRegistered(sessionId: string) {
    return myStudents.some((s) => s.examRegistrations.some((r) => r.examSessionId === sessionId && r.status !== 'CANCELLED'))
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
  const visibleSessions = activeTab === 'YCT' ? yctSessions : hskSessions

  const myRegistrations = myStudents.flatMap((s) =>
    s.examRegistrations.filter((r) => r.status !== 'CANCELLED').map((r) => ({ ...r, student: s }))
  )

  const TAB: (active: boolean) => React.CSSProperties = (active) => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? '#CC0000' : '#6b7280',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #CC0000' : '2px solid transparent',
    cursor: 'pointer',
    marginBottom: -1,
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>{t('考试报名', 'Exam Registration')}</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          {currentYear} · {t('YCT 和 HSK 等级考试', 'YCT and HSK Proficiency Exams')}
        </p>
      </div>

      {/* Tabs */}
      <div>
        <div style={{ borderBottom: '0.5px solid #E5E7EB', display: 'flex', marginBottom: 16 }}>
          <button style={TAB(activeTab === 'YCT')} onClick={() => setActiveTab('YCT')}>
            📝 YCT {t('青少年汉语考试', 'Youth Chinese Test')} ({yctSessions.length})
          </button>
          <button style={TAB(activeTab === 'HSK')} onClick={() => setActiveTab('HSK')}>
            🎓 HSK {t('汉语水平考试', 'Chinese Proficiency Test')} ({hskSessions.length})
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ ...CARD, padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            {t('暂无开放的考试场次', 'No exam sessions currently available')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="exams-grid">
            {visibleSessions.map((s) => {
              const deadline = new Date(s.registrationDeadline)
              const examDate = new Date(s.examDate)
              const isOpen = deadline >= now
              const spotsLeft = Math.max(0, s.capacity - s.registeredCount)
              const isFull = spotsLeft === 0
              const registered = isRegistered(s.id)
              const myReg = getMyRegistration(s.id)
              const deadlineDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div key={s.id} style={CARD}>
                  {/* Card header — red bg */}
                  <div style={{ background: '#CC0000', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{s.examType} Level {s.level}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                        {s.examType === 'YCT' ? t('青少年汉语考试', 'Youth Chinese Test') : t('汉语水平考试', 'Chinese Proficiency Test')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {!isOpen && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.2)', color: 'white' }}>{t('已截止', 'Closed')}</span>}
                      {isOpen && isFull && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.2)', color: 'white' }}>{t('已满', 'Full')}</span>}
                      {isOpen && !isFull && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.2)', color: 'white' }}>{spotsLeft} {t('余位', 'spots')}</span>}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { icon: '📅', label: t('考试日期', 'Date'), value: examDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
                      { icon: '📍', label: t('考场', 'Location'), value: `${s.locationZh} / ${s.location}` },
                      { icon: '💰', label: t('报名费', 'Fee'), value: `$${parseFloat(s.fee).toFixed(2)}` },
                      ...(isOpen ? [{ icon: '⏰', label: t('截止', 'Deadline'), value: `${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${deadlineDays <= 7 && deadlineDays > 0 ? ` (${deadlineDays}d)` : ''}` }] : []),
                    ].map(({ icon, label, value }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#6b7280' }}>{icon} {label}</span>
                        <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                      </div>
                    ))}

                    <div style={{ marginTop: 4 }}>
                      {registered && myReg ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const cfg = STATUS_CONFIG[myReg.reg.status]
                            return cfg ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{myReg.student.name}</span>
                                <span style={badge(cfg.color)}>{t(cfg.zh, cfg.en)}</span>
                              </div>
                            ) : null
                          })()}
                          {myReg.reg.status === 'PENDING_PAYMENT' && (
                            <Link href={`/exam-checkout?registrationId=${myReg.reg.id}`} style={{ display: 'block', padding: '7px', borderRadius: 6, background: '#FAEEDA', color: '#BA7517', border: 'none', fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
                              {t('完成支付', 'Pay Now')} →
                            </Link>
                          )}
                        </div>
                      ) : isOpen && !isFull ? (
                        <Link href={`/exams/register?sessionId=${s.id}`} style={{ display: 'block', padding: '8px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
                          {t('立即报名', 'Register')}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My registrations */}
      {myRegistrations.length > 0 && (
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{t('我的报名记录', 'My Registrations')}</span>
          </div>
          {myRegistrations.map((r, i) => {
            const cfg = STATUS_CONFIG[r.status]
            const isLast = i === myRegistrations.length - 1
            return (
              <div key={r.id} style={{ ...(isLast ? { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' } : ROW) }}>
                <div style={iconBox('amber')}>📋</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.student.name}</p>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>{r.examSession.examType} Level {r.examSession.level}</p>
                </div>
                {cfg && <span style={badge(cfg.color)}>{t(cfg.zh, cfg.en)}</span>}
                {r.status === 'PENDING_PAYMENT' && (
                  <Link href={`/exam-checkout?registrationId=${r.id}`} style={{ fontSize: 12, color: '#CC0000', textDecoration: 'none', fontWeight: 500 }}>{t('支付', 'Pay')} →</Link>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@media (max-width: 600px) { .exams-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
