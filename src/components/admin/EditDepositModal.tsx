'use client'

import { useState } from 'react'

type DepositStatus = 'PENDING' | 'PAID' | 'CLAIM_PENDING' | 'CLAIM_APPROVED' | 'REFUNDED' | 'FORFEITED' | 'REFUND_FAILED'

export interface DepositForEdit {
  id: string
  familyName: string
  familyEmail: string
  academicYear: string
  amount: string
  status: DepositStatus
  paymentMethod: string | null
  paidAt: string | null
  refundedAt: string | null
  forfeitedAt: string | null
  notes: string | null
}

interface Props {
  deposit: DepositForEdit
  onClose: () => void
  onSuccess: (msg: string) => void
}

const ALL_STATUSES: { value: DepositStatus; label: string }[] = [
  { value: 'PENDING', label: '待支付 / Pending' },
  { value: 'PAID', label: '已支付 / Paid' },
  { value: 'CLAIM_PENDING', label: '申请中 / Claim Pending' },
  { value: 'CLAIM_APPROVED', label: '已批准 / Claim Approved' },
  { value: 'REFUNDED', label: '已退款 / Refunded' },
  { value: 'FORFEITED', label: '已没收 / Forfeited' },
  { value: 'REFUND_FAILED', label: '退款失败 / Refund Failed' },
]

const STATUS_ORDER: Record<DepositStatus, number> = {
  PENDING: 0,
  PAID: 1,
  CLAIM_PENDING: 2,
  CLAIM_APPROVED: 3,
  REFUNDED: 4,
  FORFEITED: 4,
  REFUND_FAILED: 4,
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

export function EditDepositModal({ deposit, onClose, onSuccess }: Props) {
  const [status, setStatus] = useState<DepositStatus>(deposit.status)
  const [amount, setAmount] = useState(deposit.amount)
  const [paymentMethod, setPaymentMethod] = useState(deposit.paymentMethod ?? 'OTHER')
  const [paidAt, setPaidAt] = useState(toDateInput(deposit.paidAt))
  const [refundedAt, setRefundedAt] = useState(toDateInput(deposit.refundedAt))
  const [forfeitedAt, setForfeitedAt] = useState(toDateInput(deposit.forfeitedAt))
  const [notes, setNotes] = useState(deposit.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRevert = STATUS_ORDER[status] < STATUS_ORDER[deposit.status]
  const needsPaymentInfo = ['PAID', 'CLAIM_PENDING', 'CLAIM_APPROVED', 'REFUNDED', 'REFUND_FAILED'].includes(status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('金额无效 / Invalid amount')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/volunteer/deposits/${deposit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          amount: amtNum,
          paymentMethod: needsPaymentInfo ? paymentMethod : null,
          paidAt: paidAt ? new Date(paidAt).toISOString() : null,
          refundedAt: refundedAt ? new Date(refundedAt).toISOString() : null,
          forfeitedAt: forfeitedAt ? new Date(forfeitedAt).toISOString() : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败 / Operation failed')
        return
      }
      onSuccess('押金记录已更新 / Deposit updated')
    } catch {
      setError('网络错误，请重试 / Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">编辑押金记录 / Edit Deposit</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Read-only family info */}
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400">家庭 / Family</p>
                <p className="font-medium text-gray-900">{deposit.familyName}</p>
                <p className="text-xs text-gray-500">{deposit.familyEmail}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">学年 / Year</p>
                <p className="font-medium text-gray-900">{deposit.academicYear}</p>
              </div>
            </div>
          </div>

          {/* Status revert warning */}
          {isRevert && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                ⚠️ 您正在将状态回退。请确认此操作正确。
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                You are reverting the status. Please confirm this is intentional.
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">状态 / Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DepositStatus)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {ALL_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">金额 / Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Payment method */}
          {needsPaymentInfo && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">支付方式 / Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="OTHER">其他 / Other（支票、现金等）</option>
                <option value="STRIPE">Stripe（信用卡）</option>
                <option value="PAYPAL">PayPal</option>
              </select>
            </div>
          )}

          {/* Paid at */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">支付日期 / Payment Date</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Refunded at */}
          {(status === 'REFUNDED' || deposit.refundedAt) && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">退款日期 / Refunded Date</label>
              <input
                type="date"
                value={refundedAt}
                onChange={(e) => setRefundedAt(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}

          {/* Forfeited at */}
          {(status === 'FORFEITED' || deposit.forfeitedAt) && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">没收日期 / Forfeited Date</label>
              <input
                type="date"
                value={forfeitedAt}
                onChange={(e) => setForfeitedAt(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">备注 / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid by check #1234"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消 / Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : '保存 / Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
