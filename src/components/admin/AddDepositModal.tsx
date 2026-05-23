'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

export interface FamilyOption {
  id: string
  parentName: string | null
  parentEmail: string
  studentCount: number
}

type DepositStatus = 'PENDING' | 'PAID' | 'CLAIM_APPROVED' | 'REFUNDED' | 'FORFEITED'

interface Props {
  academicYear: string
  families: FamilyOption[]
  existingFamilyIds: string[]
  onClose: () => void
  onSuccess: (msg: string) => void
}

const STATUS_OPTIONS: { value: DepositStatus; label: string }[] = [
  { value: 'PENDING', label: '待支付 / Pending' },
  { value: 'PAID', label: '已支付 / Paid' },
  { value: 'CLAIM_APPROVED', label: '已批准 / Claim Approved' },
  { value: 'REFUNDED', label: '已退款 / Refunded' },
  { value: 'FORFEITED', label: '已没收 / Forfeited' },
]

export function AddDepositModal({ academicYear, families, existingFamilyIds, onClose, onSuccess }: Props) {
  const [familySearch, setFamilySearch] = useState('')
  const [selectedFamilyId, setSelectedFamilyId] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [amount, setAmount] = useState('100')
  const [status, setStatus] = useState<DepositStatus>('PAID')
  const [paymentMethod, setPaymentMethod] = useState('OTHER')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const availableFamilies = useMemo(
    () => families.filter((f) => !existingFamilyIds.includes(f.id)),
    [families, existingFamilyIds]
  )

  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLowerCase()
    if (!q) return availableFamilies.slice(0, 30)
    return availableFamilies
      .filter(
        (f) =>
          (f.parentName?.toLowerCase().includes(q) ?? false) ||
          f.parentEmail.toLowerCase().includes(q)
      )
      .slice(0, 30)
  }, [availableFamilies, familySearch])

  const selectedFamily = families.find((f) => f.id === selectedFamilyId)
  const needsPaymentInfo = ['PAID', 'CLAIM_APPROVED', 'REFUNDED'].includes(status)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectFamily(f: FamilyOption) {
    setSelectedFamilyId(f.id)
    setFamilySearch(f.parentName ?? f.parentEmail)
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFamilyId) {
      setError('请选择家庭 / Please select a family')
      return
    }
    const amtNum = parseFloat(amount)
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('金额无效 / Invalid amount')
      return
    }
    if (needsPaymentInfo && !paymentMethod) {
      setError('请选择支付方式 / Please select payment method')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/volunteer/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: selectedFamilyId,
          academicYear,
          amount: amtNum,
          status,
          paymentMethod: needsPaymentInfo ? paymentMethod : null,
          paidAt: needsPaymentInfo && paidAt ? new Date(paidAt).toISOString() : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败 / Operation failed')
        return
      }
      onSuccess('押金记录已添加 / Deposit record added')
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
          <h2 className="font-semibold text-gray-900">添加押金记录 / Add Deposit</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Family search */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              家庭 / Family <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={familySearch}
              onChange={(e) => {
                setFamilySearch(e.target.value)
                setSelectedFamilyId('')
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="搜索家长姓名或邮箱 / Search by name or email"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {showDropdown && filteredFamilies.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto">
                {filteredFamilies.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onMouseDown={() => selectFamily(f)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium text-gray-900">{f.parentName ?? '—'}</span>
                      <span className="ml-2 text-xs text-gray-500">{f.parentEmail}</span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">{f.studentCount} 学生</span>
                  </button>
                ))}
              </div>
            )}
            {selectedFamily && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {selectedFamily.parentName ?? '—'} ({selectedFamily.parentEmail})
              </p>
            )}
            {!selectedFamily && familySearch && filteredFamilies.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">未找到匹配家庭 / No matching families</p>
            )}
          </div>

          {/* Academic year */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">学年 / Academic Year</label>
            <input
              value={academicYear}
              readOnly
              className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              金额 / Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              状态 / Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DepositStatus)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Payment method — shown if PAID+ */}
          {needsPaymentInfo && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                支付方式 / Payment Method <span className="text-red-500">*</span>
              </label>
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

          {/* Paid at — shown if PAID+ */}
          {needsPaymentInfo && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">支付日期 / Payment Date</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
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
              placeholder="e.g. Paid by check #1234 on 5/1/2026"
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
            disabled={loading || !selectedFamilyId}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : '添加 / Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
