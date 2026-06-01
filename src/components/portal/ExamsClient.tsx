'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { badge } from '@/lib/design'

export interface ExamSessionData {
  id: string; examType: string; level: number; examDate: string
  location: string; locationZh: string; fee: string; capacity: number
  registeredCount: number; registrationDeadline: string; notesZh: string | null; isActive: boolean
}

export interface StudentExamData {
  id: string; name: string; nameEn: string | null
  examRegistrations: Array<{ id: string; examSessionId: string; status: string; examSession: { id: string; examType: string; level: number } }>
}

interface Props {
  currentYear: string
  sessions: ExamSessionData[]
  myStudents: StudentExamData[]
}

const STATUS: Record<string, { zh: string; en: string; color: 'amber' | 'blue' | 'green' | 'red' | 'gray' }> = {
  PENDING_PAYMENT: { zh: '待支付', en: 'Pending Payment', color: 'amber' },
  PAID:            { zh: '已支付，待审核', en: 'Paid, Pending Review', color: 'blue' },
  CONFIRMED:       { zh: '已确认', en: 'Confirmed', color: 'green' },
  REJECTED:        { zh: '未通过', en: 'Rejected', color: 'red' },
  CANCELLED:       { zh: '已取消', en: 'Cancelled', color: 'gray' },
}

const CARD: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '0.5px solid #E5E7EB' }
const ROW_LAST: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '12px 20px' }

export function ExamsClient({ currentYear, sessions, myStudents }: Props) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'YCT' | 'HSK'>('YCT')
  const now = new Date()

  function isRegistered(sessionId: string) {
    return myStudents.some(s => s.examRegistrations.some(r => r.examSessionId === sessionId && r.status !== 'CANCELLED'))
  }
  function getMyReg(sessionId: string) {
    for (const s of myStudents) {
      const reg = s.examRegistrations.find(r => r.examSessionId === sessionId && r.status !== 'CANCELLED')
      if (reg) return { reg, student: s }
    }
    return null
  }

  const yct = sessions.filter(s => s.examType === 'YCT')
  const hsk = sessions.filter(s => s.examType === 'HSK')
  const visible = activeTab === 'YCT' ? yct : hsk
  const myRegs = myStudents.flatMap(s =>
    s.examRegistrations.filter(r => r.status !== 'CANCELLED').map(r => ({ ...r, student: s }))
  )

  const TAB: (a: boolean) => React.CSSProperties = (a) => ({
    padding: '8px 16px', fontSize: 13, fontWeight: a ? 500 : 400,
    color: a ? '#CC0000' : '#6b7280', background: 'none', border: 'none',
    borderBottom: a ? '2px solid #CC0000' : '2px solid transparent',
    cursor: 'pointer', marginBottom: -1,
  })

  const INFO_ROW: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Hero */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>{t('考试报名', 'Exam Registration')}</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{currentYear} · YCT / HSK</p>
      </div>

      {/* Tabs */}
      <div>
        <div style={{ borderBottom: '0.5px solid #E5E7EB', display: 'flex', marginBottom: 16 }}>
          <button style={TAB(activeTab === 'YCT')} onClick={() => setActiveTab('YCT')}>
            YCT · {t('青少年汉语考试', 'Youth Chinese Test')} ({yct.length})
          </button>
          <button style={TAB(activeTab === 'HSK')} onClick={() => setActiveTab('HSK')}>
            HSK · {t('汉语水平考试', 'Chinese Proficiency Test')} ({hsk.length})
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{ ...CARD, padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            {t('暂无开放的考试场次', 'No exam sessions currently available')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="exams-grid">
            {visible.map(s => {
              const deadline = new Date(s.registrationDeadline)
              const examDate = new Date(s.examDate)
              const isOpen = deadline >= now
              const spotsLeft = Math.max(0, s.capacity - s.registeredCount)
              const isFull = spotsLeft === 0
              const registered = isRegistered(s.id)
              const myReg = getMyReg(s.id)
              const deadlineDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

              return (
                <div key={s.id} style={CARD}>
                  {/* Card header — plain, no red bg */}
                  <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{s.examType} Level {s.level}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {s.examType === 'YCT' ? t('青少年汉语考试', 'Youth Chinese Test') : t('汉语水平考试', 'Chinese Proficiency Test')}
                      </p>
                    </div>
                    {!isOpen && <span style={badge('gray')}>{t('已截止', 'Closed')}</span>}
                    {isOpen && isFull && <span style={badge('red')}>{t('已满', 'Full')}</span>}
                    {isOpen && !isFull && <span style={badge('green')}>{spotsLeft} {t('余位', 'spots')}</span>}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: t('考试日期', 'Date'), value: examDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
                      { label: t('考场', 'Location'), value: s.locationZh },
                      { label: t('报名费', 'Fee'), value: `$${parseFloat(s.fee).toFixed(2)}` },
                      ...(isOpen ? [{ label: t('截止日期', 'Deadline'), value: `${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${deadlineDays > 0 && deadlineDays <= 7 ? ` (${deadlineDays}d)` : ''}` }] : []),
                    ].map(({ label, value }) => (
                      <div key={label} style={INFO_ROW}>
                        <span style={{ color: '#6b7280' }}>{label}</span>
                        <span style={{ color: '#111827', fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}

                    {/* Action */}
                    <div style={{ marginTop: 4 }}>
                      {registered && myReg ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(() => {
                            const cfg = STATUS[myReg.reg.status]
                            return cfg ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{myReg.student.name}</span>
                                <span style={badge(cfg.color)}>{t(cfg.zh, cfg.en)}</span>
                              </div>
                            ) : null
                          })()}
                          {myReg.reg.status === 'PENDING_PAYMENT' && (
                            <Link href={`/exam-checkout?registrationId=${myReg.reg.id}`} style={{ display: 'block', padding: '7px', borderRadius: 6, background: '#FAEEDA', color: '#BA7517', fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
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
      {myRegs.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', borderLeft: '3px solid #CC0000', paddingLeft: 12, marginBottom: 14 }}>
            {t('我的报名记录', 'My Registrations')}
          </h2>
          <div style={CARD}>
            {myRegs.map((r, i) => {
              const cfg = STATUS[r.status]
              const isLast = i === myRegs.length - 1
              return (
                <div key={r.id} style={isLast ? ROW_LAST : ROW}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.student.name}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{r.examSession.examType} Level {r.examSession.level}</p>
                  </div>
                  {cfg && <span style={{ ...badge(cfg.color), marginRight: 10 }}>{t(cfg.zh, cfg.en)}</span>}
                  {r.status === 'PENDING_PAYMENT' && (
                    <Link href={`/exam-checkout?registrationId=${r.id}`} style={{ fontSize: 12, color: '#CC0000', textDecoration: 'none', fontWeight: 500 }}>{t('支付', 'Pay')} →</Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`@media (max-width: 600px) { .exams-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
