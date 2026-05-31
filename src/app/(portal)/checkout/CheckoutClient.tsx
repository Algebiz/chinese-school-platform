'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StripePaymentForm } from '@/components/payment/StripePaymentForm'
import { PayPalButton } from '@/components/payment/PayPalButton'

type PaymentTab = 'stripe' | 'paypal'

export interface BreakdownItem {
  type: 'tuition' | 'textbook'
  classId: string
  className: string
  classNameEn: string | null
  fee: string
  // textbook-only fields
  textbookId?: string
  textbookName?: string
  textbookNameZh?: string
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
}

interface Props {
  data: CheckoutData
}

export function CheckoutClient({ data }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<PaymentTab>('stripe')
  const [paid, setPaid] = useState(false)

  const { studentId, studentName, familyId, academicYear, classIds, textbookIds, breakdown, includesDeposit, depositAmount } = data

  const tuition = breakdown.filter((b) => b.type === 'tuition')
  const textbooks = breakdown.filter((b) => b.type === 'textbook')
  const total = breakdown.reduce((sum, b) => sum + parseFloat(b.fee), 0) + (includesDeposit ? depositAmount : 0)

  if (paid) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">支付成功！</h2>
        <p className="mt-1 text-sm text-gray-500">Payment successful — confirmation email sent</p>
        <p className="mt-3 text-sm text-gray-600">
          确认邮件已发送。我们期待在课堂上见到{' '}
          <span className="font-medium">{studentName}</span>！
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          返回首页 / Go to Dashboard
        </button>
      </div>
    )
  }

  const CARD: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }
  const ROW_ITEM: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #F3F4F6', fontSize: 14 }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hero */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>结账 / Checkout</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>学生 / Student: <strong>{studentName}</strong> · {academicYear}</p>
      </div>

      {/* Order summary */}
      <div style={CARD}>
        <div style={{ background: '#F9FAFB', padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>订单详情 / Order Summary</p>
        </div>
        <div style={{ padding: '4px 16px 0' }}>
          {/* Tuition */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 12, paddingBottom: 4 }}>课程费用 / Tuition</p>
          {tuition.map((b) => (
            <div key={b.classId} style={ROW_ITEM}>
              <span style={{ color: '#374151' }}>{b.classNameEn ?? b.className}</span>
              <span style={{ fontWeight: 600 }}>${parseFloat(b.fee).toFixed(2)}</span>
            </div>
          ))}

          {/* Textbooks */}
          {textbooks.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 12, paddingBottom: 4 }}>教材费用 / Textbooks</p>
              {textbooks.map((b) => (
                <div key={b.textbookId} style={{ ...ROW_ITEM, paddingLeft: 8 }}>
                  <span style={{ color: '#374151' }}>{b.textbookName}{b.textbookNameZh && <span style={{ marginLeft: 6, fontSize: 12, color: '#9ca3af' }}>{b.textbookNameZh}</span>}</span>
                  <span style={{ fontWeight: 600 }}>${parseFloat(b.fee).toFixed(2)}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: '#9ca3af', paddingBottom: 8 }}>教材将在上课当日在学校领取 / Books are picked up at school on class day</p>
            </>
          )}

          {/* Deposit */}
          {includesDeposit && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', paddingTop: 12, paddingBottom: 4 }}>志愿服务押金 / Volunteer Deposit</p>
              <div style={ROW_ITEM}>
                <div>
                  <span style={{ color: '#374151' }}>押金（可退）/ Refundable Deposit</span>
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>完成志愿服务后可申请退款 / Refundable after volunteer service</p>
                </div>
                <span style={{ fontWeight: 600 }}>${depositAmount.toFixed(2)}</span>
              </div>
            </>
          )}

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #E5E7EB', marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>合计 / Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#CC0000' }}>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment method tabs */}
      <div style={CARD}>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #E5E7EB' }}>
          {([
            { id: 'stripe' as const, icon: '💳', label: '信用卡 / Credit Card' },
            { id: 'paypal' as const, icon: '🅿', label: 'PayPal' },
          ]).map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: tab === id ? 500 : 400,
                color: tab === id ? '#CC0000' : '#6b7280',
                background: 'none', border: 'none',
                borderBottom: tab === id ? '2px solid #CC0000' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
        <div style={{ padding: '20px 16px' }}>
          {tab === 'stripe' && (
            <StripePaymentForm
              studentId={studentId} classIds={classIds} textbookIds={textbookIds}
              academicYear={academicYear} breakdown={breakdown} familyId={familyId}
              includesDeposit={includesDeposit} depositAmount={depositAmount}
              onSuccess={() => setPaid(true)}
            />
          )}
          {tab === 'paypal' && (
            <PayPalButton
              studentId={studentId} classIds={classIds} textbookIds={textbookIds}
              academicYear={academicYear} familyId={familyId}
              includesDeposit={includesDeposit} onSuccess={() => setPaid(true)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
