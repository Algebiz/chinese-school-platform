'use client'

import { useState } from 'react'

interface Props {
  enrollmentId: string
  studentName: string
  studentNameEn: string | null
  className: string
  enrolledAt: string | null
  waitlistCount: number
  onClose: () => void
  onSuccess: (msg: string) => void
}

export function UnenrollModal({
  enrollmentId,
  studentName,
  studentNameEn,
  className,
  enrolledAt,
  waitlistCount,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (reason.trim().length < 10) {
      setError('原因至少需要10个字符 / Reason must be at least 10 characters')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/enrollments/${enrollmentId}/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败 / Failed')
        return
      }
      const msg = json.waitlistNotified
        ? `已取消注册，候补学生 ${json.waitlistStudentName} 已收到通知 / Unenrolled; waitlist student ${json.waitlistStudentName} notified`
        : '已成功取消注册 / Enrollment cancelled successfully'
      onSuccess(msg)
    } catch {
      setError('网络错误，请重试 / Network error, please retry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">取消注册 / Unenroll Student</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Warning banner */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ 此操作将取消该学生的课程注册，班级名额将释放。
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              This will cancel the student&apos;s enrollment and free up the class spot.
            </p>
          </div>

          {/* Student info */}
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-400">学生 / Student</p>
                <p className="font-medium text-gray-900">{studentName}</p>
                {studentNameEn && <p className="text-xs text-gray-500">{studentNameEn}</p>}
              </div>
              <div>
                <p className="text-xs text-gray-400">班级 / Class</p>
                <p className="font-medium text-gray-900">{className}</p>
              </div>
              {enrolledAt && (
                <div>
                  <p className="text-xs text-gray-400">报名时间 / Enrolled</p>
                  <p className="text-gray-700">
                    {new Date(enrolledAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Refund notice */}
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-medium text-gray-600">💡 退款说明 / Refund Note</p>
            <p className="mt-1 text-xs text-gray-500">
              取消注册不会自动触发退款。如需退款，请在系统外单独处理，并通过邮件通知家长。
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              Unenrollment does not trigger an automatic refund. Please process any applicable
              refund separately and notify the parent directly.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              取消原因 / Reason for unenrollment <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`e.g. Family request / 家长申请退出\nMoving out of area / 搬家\nSchedule conflict / 时间冲突`}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-400">{reason.trim().length} / 10+ characters</p>
          </div>

          {/* Waitlist notice */}
          {waitlistCount > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                📋 该班级有 <strong>{waitlistCount}</strong> 名候补学生。取消注册后，系统将自动通知候补名单第一位学生。
              </p>
              <p className="mt-0.5 text-xs text-blue-600">
                This class has {waitlistCount} waitlisted student{waitlistCount !== 1 ? 's' : ''}.
                The first student on the waitlist will be automatically notified after unenrollment.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            返回 / Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || reason.trim().length < 10}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '处理中…' : '确认取消注册 / Confirm Unenroll'}
          </button>
        </div>
      </div>
    </div>
  )
}
