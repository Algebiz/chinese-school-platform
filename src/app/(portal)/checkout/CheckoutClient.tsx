'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StripePaymentForm } from '@/components/payment/StripePaymentForm'
import { PayPalButton } from '@/components/payment/PayPalButton'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type PaymentTab = 'stripe' | 'paypal'

export interface BreakdownItem {
  type: 'tuition' | 'textbook'
  classId: string
  className: string
  classNameEn: string | null
  fee: string
  textbookId?: string
  textbookName?: string
  textbookNameZh?: string
}

export interface ExamItem {
  id: string
  examType: string
  level: number
  examDate: string
  studentName: string
  fee: string
}

export interface CheckoutData {
  studentId: string
  studentName: string
  familyId: string
  academicYear: string
  classIds: string[]
  textbookIds: string[]
  breakdown: BreakdownItem[]
  includesDeposit: boolean
  depositAmount: number
  examItems: ExamItem[]
  examRegistrationIds: string[]
}

interface Props { data: CheckoutData }

export function CheckoutClient({ data }: Props) {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState<PaymentTab>('stripe')
  const [paid, setPaid] = useState(false)

  const {
    studentId, studentName, familyId, academicYear,
    classIds, textbookIds, breakdown, includesDeposit, depositAmount,
    examItems, examRegistrationIds,
  } = data

  const tuition = breakdown.filter(b => b.type === 'tuition')
  const textbooks = breakdown.filter(b => b.type === 'textbook')
  const enrollmentTotal = breakdown.reduce((sum, b) => sum + parseFloat(b.fee), 0)
  const examTotal = examItems.reduce((sum, e) => sum + parseFloat(e.fee), 0)
  const total = enrollmentTotal + examTotal + (includesDeposit ? depositAmount : 0)

  if (paid) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h2 className="text-xl font-bold text-gray-900">{t('支付成功', 'Payment Successful')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('确认邮件已发送。', 'Confirmation email has been sent.')}</p>
        {studentName && (
          <p className="mt-3 text-sm text-gray-600">
            {t('我们期待在课堂上见到', "We look forward to seeing")}{' '}<span className="font-medium">{studentName}</span>！
          </p>
        )}
        <button onClick={() => router.push('/dashboard')}
          className="mt-6 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700">
          {t('返回仪表盘', 'Go to Dashboard')}
        </button>
      </div>
    )
  }

  const CARD: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }
  const ROW_ITEM: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #F3F4F6', fontSize: 14 }
  const SECTION_LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' as const, paddingTop: 12, paddingBottom: 4 }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>{t('结账', 'Checkout')}</h1>
        {studentName && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {t('学生', 'Student')}: <strong>{studentName}</strong> · {academicYear}
          </p>
        )}
      </div>

      {/* Order summary */}
      <div style={CARD}>
        <div style={{ background: '#F9FAFB', padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{t('订单详情', 'Order Summary')}</p>
        </div>
        <div style={{ padding: '4px 16px 0' }}>
          {/* Tuition */}
          {tuition.length > 0 && (
            <>
              <p style={SECTION_LABEL}>{t('课程费用', 'Tuition')}</p>
              {tuition.map(b => (
                <div key={b.classId} style={ROW_ITEM}>
                  <span style={{ color: '#374151' }}>{lang === 'en' ? (b.classNameEn ?? b.className) : b.className}</span>
                  <span style={{ fontWeight: 600 }}>${parseFloat(b.fee).toFixed(2)}</span>
                </div>
              ))}
            </>
          )}

          {/* Textbooks */}
          {textbooks.length > 0 && (
            <>
              <p style={SECTION_LABEL}>{t('教材费用', 'Textbooks')}</p>
              {textbooks.map(b => (
                <div key={b.textbookId} style={{ ...ROW_ITEM, paddingLeft: 8 }}>
                  <span style={{ color: '#374151' }}>
                    {lang === 'en' ? b.textbookName : (b.textbookNameZh || b.textbookName)}
                    {lang === 'zh' && b.textbookNameZh && b.textbookName && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: '#9ca3af' }}>{b.textbookName}</span>
                    )}
                  </span>
                  <span style={{ fontWeight: 600 }}>${parseFloat(b.fee).toFixed(2)}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: '#9ca3af', paddingBottom: 8 }}>
                {t('教材将在上课当日在学校领取', 'Books are picked up at school on class day')}
              </p>
            </>
          )}

          {/* Exam registrations */}
          {examItems.length > 0 && (
            <>
              <p style={SECTION_LABEL}>{t('考试报名费', 'Exam Registration')}</p>
              {examItems.map(e => (
                <div key={e.id} style={ROW_ITEM}>
                  <div>
                    <span style={{ color: '#374151' }}>{e.examType} Level {e.level}</span>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{e.studentName} · {e.examDate}</p>
                  </div>
                  <span style={{ fontWeight: 600 }}>${parseFloat(e.fee).toFixed(2)}</span>
                </div>
              ))}
            </>
          )}

          {/* Deposit */}
          {includesDeposit && (
            <>
              <p style={SECTION_LABEL}>{t('志愿服务押金', 'Volunteer Deposit')}</p>
              <div style={ROW_ITEM}>
                <div>
                  <span style={{ color: '#374151' }}>{t('押金（可退）', 'Refundable Deposit')}</span>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>{t('完成志愿服务后可申请退款', 'Refundable after volunteer service')}</p>
                </div>
                <span style={{ fontWeight: 600 }}>${depositAmount.toFixed(2)}</span>
              </div>
            </>
          )}

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #E5E7EB', marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{t('合计', 'Total')}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#CC0000' }}>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment method tabs */}
      <div style={CARD}>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #E5E7EB' }}>
          {([
            { id: 'stripe' as const, label: t('信用卡', 'Credit Card') },
            { id: 'paypal' as const, label: 'PayPal' },
          ]).map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: tab === id ? 500 : 400,
              color: tab === id ? '#CC0000' : '#6b7280', background: 'none', border: 'none',
              borderBottom: tab === id ? '2px solid #CC0000' : '2px solid transparent',
              cursor: 'pointer', marginBottom: -1,
            }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ padding: '20px 16px' }}>
          {tab === 'stripe' && (
            <StripePaymentForm
              studentId={studentId}
              classIds={classIds}
              textbookIds={textbookIds}
              academicYear={academicYear}
              breakdown={breakdown}
              familyId={familyId}
              includesDeposit={includesDeposit}
              depositAmount={depositAmount}
              examRegistrationIds={examRegistrationIds}
              examItems={examItems.map(e => ({ id: e.id, examType: e.examType, level: e.level, fee: e.fee }))}
              onSuccess={() => setPaid(true)}
            />
          )}
          {tab === 'paypal' && (
            <PayPalButton
              studentId={studentId}
              classIds={classIds}
              textbookIds={textbookIds}
              academicYear={academicYear}
              familyId={familyId}
              includesDeposit={includesDeposit}
              examRegistrationIds={examRegistrationIds}
              onSuccess={() => setPaid(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
