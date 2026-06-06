'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      color: '#111827',
      fontFamily: 'system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
}

// ── Inner form (must live inside <Elements>) ──────────────────────────────────

interface CardFormProps {
  clientSecret: string
  onSuccess: () => void
}

function CardForm({ clientSecret, onSuccess }: CardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const card = elements.getElement(CardElement)
    if (!card) return

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })

    setProcessing(false)

    if (stripeError) {
      setError(stripeError.message ?? '支付失败，请重试')
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          信用卡 / Credit Card
        </label>
        <div className="rounded-md border border-gray-300 px-3 py-3 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {processing ? '处理中… / Processing…' : '确认支付 / Pay Now'}
      </button>
    </form>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface PaymentBreakdownItem {
  type?: 'tuition' | 'textbook'
  classId: string
  className: string
  fee: string
  textbookId?: string
  textbookName?: string
}

export interface ExamBreakdownItem {
  id: string
  examType: string
  level: number
  fee: string
}

interface StripePaymentFormProps {
  studentId: string
  classIds: string[]
  textbookIds?: string[]
  academicYear: string
  breakdown: PaymentBreakdownItem[]
  familyId?: string
  includesDeposit?: boolean
  depositAmount?: number
  examRegistrationIds?: string[]
  examItems?: ExamBreakdownItem[]
  onSuccess: () => void
}

export function StripePaymentForm({
  studentId,
  classIds,
  textbookIds = [],
  academicYear,
  breakdown,
  familyId,
  includesDeposit = false,
  depositAmount = 0,
  examRegistrationIds = [],
  examItems = [],
  onSuccess,
}: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const tuitionTotal = breakdown.reduce((sum, b) => sum + parseFloat(b.fee), 0)
  const examTotal = examItems.reduce((sum, e) => sum + parseFloat(e.fee), 0)
  const total = tuitionTotal + examTotal + (includesDeposit ? depositAmount : 0)

  useEffect(() => {
    fetch('/api/payments/stripe/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, classIds, textbookIds, academicYear, familyId, includesDeposit, depositAmount, examRegistrationIds }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setClientSecret(json.data.clientSecret)
        } else {
          setLoadError('无法创建支付，请刷新重试')
        }
      })
      .catch(() => setLoadError('网络错误，请刷新重试'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, academicYear, classIds.join(','), textbookIds.join(','), includesDeposit, depositAmount, examRegistrationIds.join(',')])

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        正在初始化支付… / Initializing payment…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
    )
  }

  if (!clientSecret) return null

  return (
    <div className="space-y-6">
      {/* Fee breakdown */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
          费用明细 / Fee Breakdown
        </p>
        <div className="space-y-1.5">
          {breakdown.map((b, i) => (
            <div key={b.textbookId ?? `${b.classId}-${i}`} className="flex justify-between text-sm">
              <span className="text-gray-600">{b.className}</span>
              <span className="font-medium">${parseFloat(b.fee).toFixed(2)}</span>
            </div>
          ))}
          {examItems.map((e) => (
            <div key={e.id} className="flex justify-between text-sm">
              <span className="text-gray-600">{e.examType} Level {e.level}</span>
              <span className="font-medium">${parseFloat(e.fee).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-bold">
          <span>合计 / Total</span>
          <span className="text-red-600">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Stripe card form */}
      <Elements stripe={stripePromise}>
        <CardForm clientSecret={clientSecret} onSuccess={onSuccess} />
      </Elements>
    </div>
  )
}
