'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { clsx } from 'clsx'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const CARD_STYLE = {
  style: {
    base: { fontSize: '15px', color: '#111827', fontFamily: 'system-ui, sans-serif', '::placeholder': { color: '#9ca3af' } },
    invalid: { color: '#dc2626' },
  },
}

export interface ExamCheckoutData {
  registrationId: string
  examType: string
  level: number
  examDate: string
  location: string
  locationZh: string
  fee: string
  studentName: string
  academicYear: string
}

function CardForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
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
    if (!card) { setProcessing(false); return }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })
    setProcessing(false)
    if (stripeError) { setError(stripeError.message ?? '支付失败，请重试'); return }
    if (paymentIntent?.status === 'succeeded') onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">信用卡 / Credit Card</label>
        <div className="rounded-md border border-gray-300 px-3 py-3 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
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

function ExamStripeSection({ registrationId, onSuccess }: { registrationId: string; onSuccess: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/payments/stripe/exam-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setClientSecret(json.data.clientSecret)
        else setLoadError('无法创建支付，请刷新重试 / Unable to initialize, please refresh')
      })
      .catch(() => setLoadError('网络错误，请刷新重试 / Network error, please refresh'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId])

  if (loading) return <div className="py-8 text-center text-sm text-gray-400">正在初始化支付… / Initializing…</div>
  if (loadError) return <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
  if (!clientSecret) return null

  return (
    <Elements stripe={stripePromise}>
      <CardForm clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  )
}

export function ExamCheckoutClient({ data }: { data: ExamCheckoutData }) {
  const router = useRouter()
  const [tab, setTab] = useState<'stripe' | 'paypal'>('stripe')
  const [paid, setPaid] = useState(false)
  const [ppError, setPpError] = useState<string | null>(null)

  const fmtDate = new Date(data.examDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (paid) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">支付成功！</h2>
        <p className="mt-1 text-sm text-gray-500">Payment received — pending school confirmation</p>
        <p className="mt-3 text-sm text-gray-600">
          我们将审核您的报名并发送确认邮件。学生：<span className="font-medium">{data.studentName}</span>
        </p>
        <button
          onClick={() => router.push('/exams')}
          className="mt-6 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          返回考试报名 / Back to Exams
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-base font-semibold text-gray-900">订单确认 / Order Summary</h2>
        <p className="mb-4 text-sm text-gray-500">学生：{data.studentName} · {data.academicYear} 学年</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700 font-medium">{data.examType} Level {data.level} 考试报名</span>
            <span className="font-medium">${parseFloat(data.fee).toFixed(2)}</span>
          </div>
          <div className="text-xs text-gray-400">{data.locationZh} / {data.location}</div>
          <div className="text-xs text-gray-400">{fmtDate}</div>
        </div>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 font-bold">
          <span>合计 / Total</span>
          <span className="text-red-600">${parseFloat(data.fee).toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['stripe', 'paypal'] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {id === 'stripe' ? '信用卡 / Credit Card' : 'PayPal'}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        {tab === 'stripe' && (
          <ExamStripeSection registrationId={data.registrationId} onSuccess={() => setPaid(true)} />
        )}
        {tab === 'paypal' && (
          <div>
            {ppError && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{ppError}</div>}
            <PayPalScriptProvider
              options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: 'USD', intent: 'capture' }}
            >
              <PayPalButtons
                style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                createOrder={async () => {
                  setPpError(null)
                  const res = await fetch('/api/payments/paypal/exam-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ registrationId: data.registrationId }),
                  })
                  const json = await res.json()
                  if (!json.success) throw new Error(json.error ?? 'Failed')
                  return json.data.orderId as string
                }}
                onApprove={async (ppData) => {
                  const res = await fetch('/api/payments/paypal/exam-capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: ppData.orderID, registrationId: data.registrationId }),
                  })
                  const json = await res.json()
                  if (!json.success) {
                    setPpError('支付捕获失败，请联系学校 / Capture failed, please contact school')
                    return
                  }
                  setPaid(true)
                }}
                onError={() => setPpError('PayPal 支付出错，请重试 / PayPal error, please try again')}
              />
            </PayPalScriptProvider>
          </div>
        )}
      </div>
    </div>
  )
}
