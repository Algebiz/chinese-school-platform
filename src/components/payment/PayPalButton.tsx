'use client'

import { useState } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'

interface PayPalButtonProps {
  studentId: string
  classIds: string[]
  academicYear: string
  onSuccess: () => void
}

export function PayPalButton({ studentId, classIds, academicYear, onSuccess }: PayPalButtonProps) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <PayPalScriptProvider
        options={{
          clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
          currency: 'USD',
          intent: 'capture',
        }}
      >
        <PayPalButtons
          style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
          createOrder={async () => {
            setError(null)
            const res = await fetch('/api/payments/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentId, classIds, academicYear }),
            })
            const json = await res.json()
            if (!json.success) {
              throw new Error(json.error ?? 'Failed to create order')
            }
            return json.data.orderId as string
          }}
          onApprove={async (data) => {
            const res = await fetch('/api/payments/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderID,
                studentId,
                classIds,
                academicYear,
              }),
            })
            const json = await res.json()
            if (!json.success) {
              setError('支付捕获失败，请联系招生处 / Capture failed, please contact the school')
              return
            }
            onSuccess()
          }}
          onError={() => {
            setError('PayPal 支付出错，请重试 / PayPal payment failed, please try again')
          }}
        />
      </PayPalScriptProvider>
    </div>
  )
}
