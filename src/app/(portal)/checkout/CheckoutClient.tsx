'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { StripePaymentForm } from '@/components/payment/StripePaymentForm'
import type { PaymentBreakdownItem } from '@/components/payment/StripePaymentForm'
import { PayPalButton } from '@/components/payment/PayPalButton'

type PaymentTab = 'stripe' | 'paypal'

export interface CheckoutData {
  studentId: string
  studentName: string
  academicYear: string
  breakdown: PaymentBreakdownItem[]
}

interface Props {
  data: CheckoutData
}

export function CheckoutClient({ data }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<PaymentTab>('stripe')
  const [paid, setPaid] = useState(false)

  const { studentId, studentName, academicYear, breakdown } = data
  const classIds = breakdown.map((b) => b.classId)
  const total = breakdown.reduce((sum, b) => sum + parseFloat(b.fee), 0)

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
          onClick={() => router.push('/portal/dashboard')}
          className="mt-6 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          返回首页 / Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Order summary */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          订单确认 / Order Summary
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          学生：{studentName} · {academicYear} 学年
        </p>
        <div className="space-y-1.5 text-sm">
          {breakdown.map((b) => (
            <div key={b.classId} className="flex justify-between">
              <span className="text-gray-600">{b.className}</span>
              <span className="font-medium">${parseFloat(b.fee).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 font-bold">
          <span>合计 / Total</span>
          <span className="text-red-600">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment method tabs */}
      <div className="mb-5 flex gap-1 rounded-lg bg-gray-100 p-1">
        {([
          { id: 'stripe', label: '信用卡', labelEn: 'Credit Card' },
          { id: 'paypal', label: 'PayPal', labelEn: 'PayPal' },
        ] as const).map(({ id, label, labelEn }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label} <span className="text-xs text-gray-400">/ {labelEn}</span>
          </button>
        ))}
      </div>

      {/* Payment form */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        {tab === 'stripe' && (
          <StripePaymentForm
            studentId={studentId}
            classIds={classIds}
            academicYear={academicYear}
            breakdown={breakdown}
            onSuccess={() => setPaid(true)}
          />
        )}
        {tab === 'paypal' && (
          <PayPalButton
            studentId={studentId}
            classIds={classIds}
            academicYear={academicYear}
            onSuccess={() => setPaid(true)}
          />
        )}
      </div>
    </div>
  )
}
