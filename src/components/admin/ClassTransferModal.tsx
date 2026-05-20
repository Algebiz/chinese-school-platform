'use client'

import { useState } from 'react'
import type { AvailableClass } from '@/app/(admin)/admin/classes/[classId]/ClassDetailClient'

interface ClassTransferModalProps {
  enrollmentId: string
  studentName: string
  currentClassName: string
  availableClasses: AvailableClass[]
  onClose: () => void
  onSuccess: () => void
}

export function ClassTransferModal({
  enrollmentId,
  studentName,
  currentClassName,
  availableClasses,
  onClose,
  onSuccess,
}: ClassTransferModalProps) {
  const [selectedClassId, setSelectedClassId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedClass = availableClasses.find((c) => c.id === selectedClassId)
  const willWaitlist = selectedClass ? selectedClass.spotsRemaining === 0 : false

  async function handleConfirm() {
    if (!selectedClassId) { setError('请选择目标班级'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/transfer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newClassId: selectedClassId, reason }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '调班失败，请重试')
        return
      }
      onSuccess()
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">调班 / Transfer Class</h2>
        <p className="mt-1 text-sm text-gray-500 mb-5">Admin class reassignment</p>

        {/* Student info */}
        <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm">
          <p className="text-gray-500">学生 / Student</p>
          <p className="font-medium text-gray-900">{studentName}</p>
          <p className="mt-1 text-gray-500">当前班级 / Current Class</p>
          <p className="font-medium text-gray-900">{currentClassName}</p>
        </div>

        {/* Target class dropdown */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            目标班级 / Target Class *
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">— 请选择 / Select —</option>
            {availableClasses.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
                {cls.spotsRemaining > 0
                  ? ` (余 ${cls.spotsRemaining} 位)`
                  : ' (已满 — 将进候补)'}
              </option>
            ))}
          </select>
        </div>

        {/* Waitlist warning */}
        {willWaitlist && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            ⚠ 目标班级已满，该学生将被加入候补名单。
            <br />
            <span className="text-amber-600">Target class is full — student will be placed on the waitlist.</span>
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            调班原因 / Reason (optional)
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请输入调班原因..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {error && (
          <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消 / Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedClassId}
            className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '处理中…' : willWaitlist ? '确认（加候补）/ Confirm' : '确认调班 / Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
