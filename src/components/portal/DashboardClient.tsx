'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import { PendingEnrollmentCard } from '@/app/(portal)/dashboard/PendingEnrollmentCard'
import { badge, iconBox, CARD, CARD_HEADER, ROW } from '@/lib/design'

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
  waitlists: Array<{ id: string; position: number; class: { name: string; type: string } }>
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

function classIcon(type: string, name: string) {
  if (type === 'ARTS') return { emoji: '🎨', color: 'pink' as const }
  if (name.includes('第二语言')) return { emoji: '📗', color: 'green' as const }
  return { emoji: '📖', color: 'blue' as const }
}

function classTypeBadge(type: string, name: string, t: (zh: string, en: string) => string) {
  if (type === 'ARTS') return <span style={badge('pink')}>{t('才艺班', 'Arts')}</span>
  if (name.includes('第二语言')) return <span style={badge('green')}>CSL</span>
  return <span style={badge('blue')}>CHL</span>
}

const DEPOSIT_COLORS: Record<string, { bg: string; color: string; label: { zh: string; en: string } }> = {
  PENDING:       { bg: '#FAEEDA', color: '#BA7517', label: { zh: '待支付', en: 'Pending' } },
  PAID:          { bg: '#E6F1FB', color: '#185FA5', label: { zh: '已支付', en: 'Paid' } },
  CLAIM_PENDING: { bg: '#F3F0FA', color: '#6B46C1', label: { zh: '申请审核中', en: 'Under Review' } },
  CLAIM_APPROVED:{ bg: '#EAF3DE', color: '#3B6D11', label: { zh: '已批准', en: 'Approved' } },
  REFUNDED:      { bg: '#EAF3DE', color: '#3B6D11', label: { zh: '已退款', en: 'Refunded' } },
  FORFEITED:     { bg: '#F3F4F6', color: '#4B5563', label: { zh: '已没收', en: 'Forfeited' } },
  REFUND_FAILED: { bg: '#FAEEDA', color: '#BA7517', label: { zh: '退款处理中', en: 'Processing' } },
}

const EXAM_STATUS: Record<string, { zh: string; en: string; color: 'amber' | 'blue' | 'green' | 'red' }> = {
  PENDING_PAYMENT: { zh: '待支付', en: 'Pending Payment', color: 'amber' },
  PAID:            { zh: '待审核', en: 'Pending Review',  color: 'blue'  },
  CONFIRMED:       { zh: '已确认', en: 'Confirmed',       color: 'green' },
  REJECTED:        { zh: '未通过', en: 'Rejected',        color: 'red'   },
}

export function DashboardClient({
  currentYear, userName, hasFamily, studentCount, totalConfirmed, pendingCount,
  hasMultiplePending, students, volunteerDeposit, examRegistrations, classExamResults,
}: DashboardProps) {
  const { t } = useLanguage()

  const examResultsByStudent: Record<string, typeof classExamResults> = {}
  for (const r of classExamResults) {
    if (!examResultsByStudent[r.studentId]) examResultsByStudent[r.studentId] = []
    examResultsByStudent[r.studentId].push(r)
  }

  const PAGE: React.CSSProperties = { maxWidth: 900, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }

  return (
    <div style={PAGE}>

      {/* ── Hero ── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>
          {t('你好', 'Hello')}, {userName ?? t('家长', 'Parent')} 👋
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={badge('blue')}>{currentYear}</span>
          {t('学年注册状态', 'Academic Year Enrollment')}
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[
          { icon: '👨‍👩‍👧', color: 'red' as const,   num: studentCount,    zh: '学生人数',  en: 'Students'   },
          { icon: '✅',      color: 'green' as const, num: totalConfirmed,  zh: '已确认报名', en: 'Confirmed'  },
          { icon: '⏳',      color: 'amber' as const, num: pendingCount,    zh: '待付款',    en: 'Pending'    },
        ].map(({ icon, color, num, zh, en }) => (
          <div key={zh} style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, background: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={iconBox(color)}>{icon}</div>
            <div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{t(zh, en)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Multiple-pending warning ── */}
      {hasMultiplePending && (
        <div style={{ background: '#FEF9EB', border: '0.5px solid #F9D37F', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E' }}>
          ⚠ {t('您有多个待付款的注册记录，请完成付款或取消不需要的注册。', 'You have multiple pending enrollments. Please complete payment or cancel any you no longer need.')}
        </div>
      )}

      {/* ── Students & enrollments ── */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', marginBottom: 12 }}>
          {t('学生报名详情', 'Student Enrollment Details')}
        </h2>

        {!hasFamily || students.length === 0 ? (
          <div style={{ ...CARD, padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 12 }}>{t('尚未添加学生', 'No students added yet')}</p>
            <Link href="/enroll" style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              {t('开始报名', 'Start Enrollment')}
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {students.map((student) => {
              const pending   = student.enrollments.filter((e) => e.status === 'PENDING')
              const confirmed = student.enrollments.filter((e) => e.status === 'CONFIRMED')
              const hasConfirmedChinese = confirmed.some((e) => e.class.type === 'CHINESE')
              const hasConfirmedArts    = confirmed.some((e) => e.class.type === 'ARTS')
              const initials = student.name.substring(0, 1)

              return (
                <div key={student.id} style={CARD}>
                  {/* Student header */}
                  <div style={{ ...CARD_HEADER, gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Avatar circle */}
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEF3F2', border: '0.5px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#CC0000', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{student.name}</span>
                          {student.nameEn && <span style={{ fontSize: 12, color: '#9ca3af' }}>{student.nameEn}</span>}
                          <StudentStatusBadge status={student.status as 'NEW' | 'RETURNING'} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {hasConfirmedChinese && !hasConfirmedArts && (
                        <Link href={`/enroll?studentId=${student.id}&artsOnly=true`} style={{ fontSize: 12, color: '#CC0000', textDecoration: 'none', border: '0.5px solid #CC0000', padding: '4px 10px', borderRadius: 5 }}>
                          ➕ {t('添加才艺课', 'Add Arts Class')}
                        </Link>
                      )}
                      <Link href="/enroll" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>
                        + {t('添加课程', 'Add class')}
                      </Link>
                    </div>
                  </div>

                  {/* Enrollments */}
                  {student.enrollments.length === 0 && student.waitlists.length === 0 ? (
                    <p style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af' }}>
                      {t('尚未报名任何课程', `No classes enrolled for ${currentYear}`)}
                    </p>
                  ) : (
                    <>
                      {pending.map((e) => {
                        const tbTotal = e.textbooks.reduce((sum, et) => sum + parseFloat(et.price), 0)
                        const total = (parseFloat(e.class.fee) + tbTotal).toFixed(2)
                        return (
                          <div key={e.id} style={{ padding: '10px 16px', borderBottom: '0.5px solid #E5E7EB' }}>
                            <PendingEnrollmentCard
                              enrollmentId={e.id}
                              className={e.class.name}
                              total={total}
                              textbookNames={e.textbooks.map((et) => et.textbook.name)}
                            />
                          </div>
                        )
                      })}

                      {confirmed.map((e, i) => {
                        const { emoji, color } = classIcon(e.class.type, e.class.name)
                        const isLast = i === confirmed.length - 1 && student.waitlists.length === 0
                        return (
                          <div key={e.id} style={{ ...(isLast ? { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' } : ROW) }}>
                            <div style={iconBox(color)}>{emoji}</div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{e.class.name}</span>
                              <span style={{ marginLeft: 8 }}>{classTypeBadge(e.class.type, e.class.name, t)}</span>
                            </div>
                            <span style={badge('green')}>{t('已确认', 'Confirmed')}</span>
                          </div>
                        )
                      })}

                      {student.waitlists.map((w, i) => {
                        const { emoji, color } = classIcon(w.class.type, w.class.name)
                        const isLast = i === student.waitlists.length - 1
                        return (
                          <div key={w.id} style={{ ...(isLast ? { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' } : ROW) }}>
                            <div style={iconBox(color)}>{emoji}</div>
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

      {/* ── Two-column: Exam registrations + Volunteer deposit ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="ds-two-col">
        {/* Exam registrations */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{t('考试报名', 'Exam Registrations')}</span>
            <Link href="/exams" style={{ fontSize: 13, color: '#CC0000', textDecoration: 'none' }}>{t('查看全部', 'View all')} →</Link>
          </div>
          {examRegistrations.length === 0 ? (
            <p style={{ padding: '20px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>{t('暂无考试报名', 'No exam registrations')}</p>
          ) : (
            examRegistrations.map((r, i) => {
              const s = EXAM_STATUS[r.status]
              const isLast = i === examRegistrations.length - 1
              return (
                <div key={r.id} style={{ ...(isLast ? { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' } : ROW) }}>
                  <div style={iconBox('amber')}>📋</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.studentName}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{r.examType} L{r.level} · {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    {s && <span style={badge(s.color)}>{t(s.zh, s.en)}</span>}
                    {r.status === 'PENDING_PAYMENT' && (
                      <Link href={`/exam-checkout?registrationId=${r.id}`} style={{ fontSize: 11, color: '#CC0000', textDecoration: 'none', fontWeight: 500 }}>{t('支付', 'Pay')} →</Link>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Volunteer deposit */}
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{t('志愿服务押金', 'Volunteer Deposit')}</span>
            <Link href="/volunteer" style={{ fontSize: 13, color: '#CC0000', textDecoration: 'none' }}>{t('详情', 'Details')} →</Link>
          </div>
          <div style={{ padding: '16px' }}>
            {!volunteerDeposit ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>{t('押金将在首次报名时收取（$100，可退）', 'A refundable $100 deposit will be collected at first enrollment.')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const d = DEPOSIT_COLORS[volunteerDeposit.status]
                  const lbl = d?.label
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{t('状态', 'Status')}</span>
                      {d && lbl && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: d.bg, color: d.color, fontWeight: 500 }}>
                          {t(lbl.zh, lbl.en)}
                        </span>
                      )}
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{t('金额', 'Amount')}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(volunteerDeposit.amount).toFixed(2)}</span>
                </div>
                {volunteerDeposit.status === 'PAID' && (
                  <Link href="/volunteer" style={{ display: 'block', marginTop: 4, padding: '7px 14px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>
                    {t('申请退款', 'Claim Refund')}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Class exam results ── */}
      {classExamResults.length > 0 && (
        <div style={CARD}>
          <div style={CARD_HEADER}>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>📝 {t('班级考试成绩', 'Class Exam Results')}</span>
          </div>
          {Object.entries(examResultsByStudent).map(([studentId, results], si, arr) => (
            <div key={studentId}>
              <div style={{ padding: '10px 16px 4px', fontSize: 13, fontWeight: 500, color: '#374151' }}>{results[0].studentName}</div>
              {results.map((r, i) => {
                const isLast = si === arr.length - 1 && i === results.length - 1
                return (
                  <div key={r.id} style={{ ...(isLast ? { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' } : { ...ROW, padding: '10px 16px' }) }}>
                    <div style={iconBox('blue')}>📊</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.examNameZh} / {r.examName}</p>
                      <p style={{ fontSize: 12, color: '#6b7280' }}>{r.className} · {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{r.score} / {r.maxScore}</p>
                      <span style={badge(r.passed ? 'green' : 'red')}>{r.passed ? `✅ ${t('通过', 'Passed')}` : `❌ ${t('未通过', 'Not Passed')}`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', marginBottom: 12 }}>{t('快速操作', 'Quick Actions')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }} className="ds-quick-actions">
          {[
            { href: '/enroll',   icon: '📝', iconColor: 'red'   as const, zh: '报名', en: 'Enroll',  primary: true },
            { href: '/classes',  icon: '🏫', iconColor: 'blue'  as const, zh: '班级', en: 'Classes'           },
            { href: '/exams',    icon: '📋', iconColor: 'amber' as const, zh: '考试', en: 'Exams'             },
            { href: '/contact',  icon: '✉️', iconColor: 'green' as const, zh: '联系', en: 'Contact'           },
          ].map(({ href, icon, iconColor, zh, en, primary }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '16px 8px',
                border: primary ? 'none' : '0.5px solid #E5E7EB',
                borderRadius: 12,
                background: primary ? '#CC0000' : 'white',
                textDecoration: 'none',
                transition: 'box-shadow 0.15s',
              }}
            >
              <div style={{ ...iconBox(primary ? 'red' : iconColor, 36), background: primary ? 'rgba(255,255,255,0.2)' : undefined }}>
                {icon}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: primary ? 'white' : '#374151' }}>{t(zh, en)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Responsive helpers */}
      <style>{`
        @media (max-width: 600px) {
          .ds-two-col { grid-template-columns: 1fr !important; }
          .ds-quick-actions { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  )
}
