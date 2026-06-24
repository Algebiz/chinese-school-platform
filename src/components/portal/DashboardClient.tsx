'use client'

import Link from 'next/link'
import { useLanguage, useLocalizedField } from '@/lib/i18n/LanguageContext'
import { BilingualTitle } from '@/components/BilingualTitle'
import { getYearsAtCCA, getYearsLabel } from '@/lib/student-utils'
import { useCart } from '@/lib/cart/CartContext'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import { PendingEnrollmentCard } from '@/app/(portal)/dashboard/PendingEnrollmentCard'
import { badge } from '@/lib/design'

export interface DashboardStudent {
  id: string
  name: string
  nameEn: string | null
  status: string
  firstEnrollmentYear?: string | null
  enrollments: Array<{
    id: string
    status: string
    class: { id: string; name: string; nameEn?: string | null; type: string; fee: string }
    textbooks: Array<{ price: string; textbook: { name: string } }>
  }>
  waitlists: Array<{
    id: string
    position: number
    status: string
    notifyExpiry: string | null
    class: { name: string; nameEn: string | null; type: string }
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
  examRegistrations: Array<{ id: string; status: string; studentName: string; examType: string; level: number; examDate: string }>
  classExamResults: Array<{ id: string; score: number; passed: boolean; studentId: string; studentName: string; examName: string; examNameZh: string; examDate: string; maxScore: number; className: string }>
}

function classTypeBadge(type: string, name: string, t: (zh: string, en: string) => string) {
  if (type === 'ARTS') return <span style={badge('pink')}>{t('才艺班', 'Arts')}</span>
  if (name.includes('第二语言')) return <span style={badge('green')}>CSL</span>
  return <span style={badge('blue')}>CHL</span>
}

const DEPOSIT_META: Record<string, { zh: string; en: string; color: 'green' | 'amber' | 'red' | 'blue' | 'pink' | 'gray' | 'purple' }> = {
  PENDING:        { zh: '待支付',   en: 'Pending',        color: 'amber'  },
  PAID:           { zh: '已支付',   en: 'Paid',           color: 'blue'   },
  CLAIM_PENDING:  { zh: '申请审核', en: 'Under Review',   color: 'purple' },
  CLAIM_APPROVED: { zh: '已批准',   en: 'Approved',       color: 'green'  },
  REFUNDED:       { zh: '已退款',   en: 'Refunded',       color: 'green'  },
  FORFEITED:      { zh: '已没收',   en: 'Forfeited',      color: 'gray'   },
  REFUND_FAILED:  { zh: '退款处理', en: 'Processing',     color: 'amber'  },
}

const EXAM_META: Record<string, { zh: string; en: string; color: 'amber' | 'blue' | 'green' | 'red' }> = {
  PAID:            { zh: '待确认', en: 'Review',    color: 'blue'  },
  CONFIRMED:       { zh: '已确认', en: 'Confirmed', color: 'green' },
  REJECTED:        { zh: '未通过', en: 'Rejected',  color: 'red'   },
}

// ── Shared layout constants ──────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  border: '0.5px solid #E5E7EB',
  borderRadius: 12,
  overflow: 'hidden',
  background: 'white',
}

const ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 20px',
  borderBottom: '0.5px solid #E5E7EB',
}

const ROW_LAST: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 20px',
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: '#111827',
  borderLeft: '3px solid #CC0000',
  paddingLeft: 12,
  marginBottom: 14,
}

export function DashboardClient({
  currentYear, userName, hasFamily, studentCount, totalConfirmed, pendingCount,
  hasMultiplePending, students, volunteerDeposit, examRegistrations, classExamResults,
}: DashboardProps) {
  const { t, lang } = useLanguage()
  const { field } = useLocalizedField()
  const { itemCount, total: cartTotal } = useCart()

  const examResultsByStudent: Record<string, typeof classExamResults> = {}
  for (const r of classExamResults) {
    if (!examResultsByStudent[r.studentId]) examResultsByStudent[r.studentId] = []
    examResultsByStudent[r.studentId].push(r)
  }

  // Waitlist spots that have opened up and are awaiting the parent to complete enrollment
  const notifiedWaitlists = students.flatMap((s) =>
    s.waitlists
      .filter((w) => w.status === 'NOTIFIED')
      .map((w) => ({ studentName: field(s.name, s.nameEn), className: field(w.class.name, w.class.nameEn), notifyExpiry: w.notifyExpiry }))
  )

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">

      {/* ── Hero ── */}
      <div>
        <BilingualTitle en="Dashboard" zh="主页" />
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          {currentYear} {t('学年注册状态', 'Academic Year Enrollment')}
        </p>
      </div>

      {/* ── Waitlist spot available banner(s) ── */}
      {notifiedWaitlists.map((w, i) => (
        <div key={i} style={{
          background: '#FAEEDA', border: '0.5px solid #F9D37F', borderRadius: 8,
          padding: '16px', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#92400E', margin: 0 }}>
            🎉 {t('候补名额已开放！', 'Waitlist Spot Available!')}
          </p>
          <p style={{ fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.6 }}>
            {t(
              `${w.studentName} 在 ${w.className} 的候补名额已开放。`,
              `A spot has opened for ${w.studentName} in ${w.className}.`
            )}
            {' '}
            {w.notifyExpiry && t(
              `请在 ${new Date(w.notifyExpiry).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })} 前完成报名，否则名额将被取消。`,
              `Please complete enrollment by ${new Date(w.notifyExpiry).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}, otherwise the spot will be released.`
            )}
          </p>
          <Link href="/enroll" style={{
            alignSelf: 'flex-start', padding: '8px 18px', borderRadius: 6,
            background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            {t('立即报名', 'Enroll Now')} →
          </Link>
        </div>
      ))}

      {/* ── Cart banner ── */}
      {itemCount > 0 && (
        <Link href="/cart" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: 8, background: '#FAEEDA',
          border: '0.5px solid #F9D37F', textDecoration: 'none', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
            🛒 {t('您有', 'You have')} {itemCount} {t('件商品在购物车，合计', 'item(s) in cart, total')} ${cartTotal.toFixed(2)}
          </span>
          <span style={{ fontSize: 13, color: '#CC0000', fontWeight: 600, flexShrink: 0 }}>
            {t('前往结账', 'Checkout')} →
          </span>
        </Link>
      )}

      {/* ── Stats (3-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { num: studentCount,   zh: '学生人数',  en: 'Students'   },
          { num: totalConfirmed, zh: '已确认报名', en: 'Confirmed'  },
          { num: pendingCount,   zh: '待付款',    en: 'Pending'    },
        ].map(({ num, zh, en }) => (
          <div key={zh} style={{ background: '#F9FAFB', borderRadius: 8, padding: '14px 16px', border: '0.5px solid #E5E7EB' }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{t(zh, en)}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{num}</p>
          </div>
        ))}
      </div>

      {/* ── Multiple-pending warning ── */}
      {hasMultiplePending && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #F9D37F', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E' }}>
          {t('您有多个待付款的注册记录，请完成付款或取消不需要的注册。', 'You have multiple pending enrollments. Please complete payment or cancel any you no longer need.')}
        </div>
      )}

      {/* ── Student Enrollments ── */}
      <div>
        <h2 style={SECTION_TITLE}>{t('学生报名详情', 'Student Enrollment Details')}</h2>

        {!hasFamily || students.length === 0 ? (
          <div style={{ ...CARD, padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 14 }}>{t('尚未添加学生', 'No students added yet')}</p>
            <Link href="/enroll" style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              {t('开始报名', 'Start Enrollment')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {students.map((student) => {
              const pending   = student.enrollments.filter(e => e.status === 'PENDING')
              const confirmed = student.enrollments.filter(e => e.status === 'CONFIRMED')
              const hasConfirmedChinese = confirmed.some(e => e.class.type === 'CHINESE')
              const hasConfirmedArts    = confirmed.some(e => e.class.type === 'ARTS')
              const yearsAtCCA = getYearsAtCCA(student.firstEnrollmentYear)
              const yearsLabel = student.firstEnrollmentYear ? getYearsLabel(yearsAtCCA, lang) : null

              return (
                <div key={student.id} style={CARD}>
                  {/* Student header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '0.5px solid #E5E7EB' }}>
                    {/* Avatar */}
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#CC0000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                      {student.name.substring(0, 1)}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{student.name}</span>
                      {student.nameEn && <span style={{ fontSize: 12, color: '#9ca3af' }}>{student.nameEn}</span>}
                      <StudentStatusBadge status={student.status as 'NEW' | 'RETURNING'} />
                      {yearsLabel && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#FAEEDA', color: '#BA7517', fontWeight: 500 }}>
                          {yearsLabel}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      {hasConfirmedChinese && !hasConfirmedArts && (
                        <Link href={`/enroll?studentId=${student.id}&artsOnly=true`} style={{ fontSize: 12, color: '#CC0000', textDecoration: 'none', border: '0.5px solid #CC0000', padding: '4px 10px', borderRadius: 5 }}>
                          {t('+ 添加才艺课', '+ Add Arts')}
                        </Link>
                      )}
                      <Link href="/enroll" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                        {t('+ 添加课程', '+ Add class')}
                      </Link>
                    </div>
                  </div>

                  {/* Enrollment rows */}
                  {student.enrollments.length === 0 && student.waitlists.length === 0 ? (
                    <p style={{ padding: '14px 20px', fontSize: 13, color: '#9ca3af' }}>
                      {t('尚未报名任何课程', `No classes enrolled for ${currentYear}`)}
                    </p>
                  ) : (
                    <>
                      {pending.map(e => {
                        const tbTotal = e.textbooks.reduce((s, et) => s + parseFloat(et.price), 0)
                        return (
                          <div key={e.id} style={{ padding: '10px 20px', borderBottom: '0.5px solid #E5E7EB' }}>
                            <PendingEnrollmentCard
                              enrollmentId={e.id}
                              className={e.class.name}
                              total={(parseFloat(e.class.fee) + tbTotal).toFixed(2)}
                              textbookNames={e.textbooks.map(et => et.textbook.name)}
                            />
                          </div>
                        )
                      })}

                      {confirmed.map((e, i) => {
                        const isLast = i === confirmed.length - 1 && student.waitlists.length === 0
                        return (
                          <div key={e.id} style={isLast ? ROW_LAST : ROW}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginRight: 8 }}>{field(e.class.name, e.class.nameEn)}</span>
                              {classTypeBadge(e.class.type, e.class.name, t)}
                            </div>
                            <span style={badge('green')}>{t('已确认', 'Confirmed')}</span>
                          </div>
                        )
                      })}

                      {student.waitlists.map((w, i) => {
                        const isLast = i === student.waitlists.length - 1
                        return (
                          <div key={w.id} style={isLast ? ROW_LAST : ROW}>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{w.class.name}</span>
                            </div>
                            <span style={badge('amber')}>{t('候补', 'Waitlist')} #{w.position}</span>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Two-column: Exams | Volunteer ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="ds-two-col">

        {/* Exam registrations */}
        <div style={CARD}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('考试报名', 'Exam Registrations')}</span>
            <Link href="/exams" style={{ fontSize: 12, color: '#CC0000', textDecoration: 'none' }}>{t('查看全部', 'View all')} →</Link>
          </div>
          {examRegistrations.length === 0 ? (
            <p style={{ padding: '20px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>{t('暂无考试报名', 'No registrations')}</p>
          ) : (
            examRegistrations.map((r, i) => {
              const meta = EXAM_META[r.status]
              const isLast = i === examRegistrations.length - 1
              return (
                <div key={r.id} style={isLast ? ROW_LAST : ROW}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.studentName}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{r.examType} L{r.level} · {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {meta && <span style={badge(meta.color)}>{t(meta.zh, meta.en)}</span>}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Volunteer deposit */}
        <div style={CARD}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{t('志愿服务押金', 'Volunteer Deposit')}</span>
            <Link href="/volunteer" style={{ fontSize: 12, color: '#CC0000', textDecoration: 'none' }}>{t('详情', 'Details')} →</Link>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!volunteerDeposit ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>{t('押金将在首次报名时收取（$100，可退）', 'A refundable $100 deposit will be collected at first enrollment.')}</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{t('状态', 'Status')}</span>
                  {(() => {
                    const m = DEPOSIT_META[volunteerDeposit.status]
                    return m ? <span style={badge(m.color)}>{t(m.zh, m.en)}</span> : null
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{t('金额', 'Amount')}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(volunteerDeposit.amount).toFixed(2)}</span>
                </div>
                {volunteerDeposit.status === 'PAID' && (
                  <Link href="/volunteer" style={{ display: 'block', marginTop: 4, padding: '7px 16px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
                    {t('申请退款', 'Claim Refund')}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Class Exam Results ── */}
      {classExamResults.length > 0 && (
        <div>
          <h2 style={SECTION_TITLE}>{t('班级考试成绩', 'Class Exam Results')}</h2>
          <div style={CARD}>
            {Object.entries(examResultsByStudent).map(([studentId, results], si, arr) => (
              <div key={studentId}>
                <p style={{ padding: '10px 20px 4px', fontSize: 13, fontWeight: 500, color: '#374151', borderTop: si > 0 ? '0.5px solid #E5E7EB' : 'none' }}>{results[0].studentName}</p>
                {results.map((r, i) => {
                  const isLast = si === arr.length - 1 && i === results.length - 1
                  return (
                    <div key={r.id} style={isLast ? { ...ROW_LAST, alignItems: 'flex-start' } : { ...ROW, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.examNameZh} / {r.examName}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{r.className} · {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.score} / {r.maxScore}</p>
                        <span style={{ ...badge(r.passed ? 'green' : 'red'), marginTop: 4 }}>{r.passed ? t('通过', 'Passed') : t('未通过', 'Not Passed')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <h2 style={SECTION_TITLE}>{t('快速操作', 'Quick Actions')}</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/enroll" style={{ padding: '8px 18px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            {t('为学生报名', 'Enroll a Student')}
          </Link>
          <Link href="/classes" style={{ padding: '8px 18px', borderRadius: 6, border: '0.5px solid #E5E7EB', background: 'white', color: '#374151', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            {t('浏览班级', 'Browse Classes')}
          </Link>
          <Link href="/exams" style={{ padding: '8px 18px', borderRadius: 6, border: '0.5px solid #E5E7EB', background: 'white', color: '#374151', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            {t('报名考试', 'Register for Exam')}
          </Link>
          <Link href="/contact" style={{ padding: '8px 18px', borderRadius: 6, border: '0.5px solid #E5E7EB', background: 'white', color: '#374151', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            {t('联系学校', 'Contact School')}
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .ds-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
