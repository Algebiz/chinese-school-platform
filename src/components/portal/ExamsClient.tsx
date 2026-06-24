'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage, useLocalizedField } from '@/lib/i18n/LanguageContext'
import { BilingualTitle } from '@/components/BilingualTitle'
import { badge } from '@/lib/design'
import { useCart } from '@/lib/cart/CartContext'

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
  const { field } = useLocalizedField()
  const { items: cartItems, removeItem: removeCartItem, refreshCart } = useCart()
  const [activeTab, setActiveTab] = useState<'YCT' | 'HSK'>('YCT')
  const [confirmRemoveCart, setConfirmRemoveCart] = useState<{ cartItemId: string; name: string } | null>(null)

  function getCartItemForSession(sessionId: string) {
    return cartItems.find(i => i.type === 'EXAM_REGISTRATION' && i.examSessionId === sessionId)
  }

  async function handleRemoveFromCart(cartItemId: string) {
    setConfirmRemoveCart(null)
    await removeCartItem(cartItemId)
  }
  const now = new Date()

  // Only CONFIRMED registrations are shown — PENDING_PAYMENT is no longer created in the new flow
  function isConfirmed(sessionId: string) {
    return myStudents.some(s => s.examRegistrations.some(r => r.examSessionId === sessionId && r.status === 'CONFIRMED'))
  }
  function getConfirmedReg(sessionId: string) {
    for (const s of myStudents) {
      const reg = s.examRegistrations.find(r => r.examSessionId === sessionId && r.status === 'CONFIRMED')
      if (reg) return { reg, student: s }
    }
    return null
  }

  const yct = sessions.filter(s => s.examType === 'YCT')
  const hsk = sessions.filter(s => s.examType === 'HSK')
  const visible = activeTab === 'YCT' ? yct : hsk
  const confirmedRegs = myStudents.flatMap(s =>
    s.examRegistrations.filter(r => r.status === 'CONFIRMED').map(r => ({ ...r, student: s }))
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
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">

      {/* Hero */}
      <div>
        <BilingualTitle en="Exams" zh="考试" />
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
              const confirmed = isConfirmed(s.id)
              const myReg = getConfirmedReg(s.id)
              const cartItem = getCartItemForSession(s.id)
              const isInCart = !!cartItem
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
                      { label: t('考场', 'Location'), value: field(s.locationZh, s.location) },
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
                      {isInCart && cartItem ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{cartItem.student?.name}</span>
                            <span style={badge('amber')}>{t('在购物车', 'In Cart')}</span>
                          </div>
                          <button
                            onClick={() => setConfirmRemoveCart({ cartItemId: cartItem.id, name: `${s.examType} Level ${s.level}` })}
                            style={{ padding: '7px', borderRadius: 6, background: '#FCEBEB', color: '#A32D2D', border: 'none', fontSize: 12, cursor: 'pointer' }}
                          >
                            ✕ {t('从购物车移除', 'Remove from Cart')}
                          </button>
                        </div>
                      ) : confirmed && myReg ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{myReg.student.name}</span>
                            <span style={badge('green')}>{t('已确认', 'Confirmed')}</span>
                          </div>
                          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
                            {t('如需取消请联系管理员', 'Contact admin to cancel')}
                          </p>
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
      {confirmedRegs.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: '#111827', borderLeft: '3px solid #CC0000', paddingLeft: 12, marginBottom: 14 }}>
            {t('我的已确认报名', 'My Confirmed Registrations')}
          </h2>
          <div style={CARD}>
            {confirmedRegs.map((r, i) => {
              const isLast = i === confirmedRegs.length - 1
              return (
                <div key={r.id} style={isLast ? ROW_LAST : ROW}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{r.student.name}</p>
                    <p style={{ fontSize: 12, color: '#6b7280' }}>{r.examSession.examType} Level {r.examSession.level}</p>
                  </div>
                  <span style={badge('green')}>{t('已确认', 'Confirmed')}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`@media (max-width: 600px) { .exams-grid { grid-template-columns: 1fr !important; } }`}</style>

      {/* Confirm remove from cart dialog */}
      {confirmRemoveCart && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 12, background: 'white', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{t('移除考试报名', 'Remove Exam Registration')}</p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{t('确定要移除此考试报名吗？', 'Remove this exam registration from cart?')}</p>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 20 }}>{confirmRemoveCart.name}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmRemoveCart(null)} style={{ flex: 1, padding: '9px', borderRadius: 6, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, cursor: 'pointer' }}>{t('取消', 'Cancel')}</button>
              <button onClick={() => handleRemoveFromCart(confirmRemoveCart.cartItemId)} style={{ flex: 1, padding: '9px', borderRadius: 6, border: 'none', background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{t('确认移除', 'Confirm Remove')}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
