'use client'

import { useState } from 'react'

type ClaimStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
type DepositStatus = 'PENDING' | 'PAID' | 'CLAIM_PENDING' | 'CLAIM_APPROVED' | 'REFUNDED' | 'FORFEITED' | 'REFUND_FAILED'

interface Service {
  id: string
  name: string
  nameZh: string
}

export interface ClaimForEdit {
  id: string
  depositId: string
  serviceId: string
  description: string
  photoUrl: string | null
  status: ClaimStatus
  rejectionReason: string | null
  adminNotes: string | null
  depositStatus: DepositStatus
  parentName: string | null
  parentEmail: string
}

interface Props {
  claim: ClaimForEdit
  services: Service[]
  onClose: () => void
  onSuccess: (msg: string) => void
}

export function EditClaimModal({ claim, services, onClose, onSuccess }: Props) {
  const [serviceId, setServiceId] = useState(claim.serviceId)
  const [description, setDescription] = useState(claim.description)
  const [photoUrl, setPhotoUrl] = useState(claim.photoUrl ?? '')
  const [status, setStatus] = useState<ClaimStatus>(claim.status)
  const [rejectionReason, setRejectionReason] = useState(claim.rejectionReason ?? '')
  const [adminNotes, setAdminNotes] = useState(claim.adminNotes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isApproving = status === 'APPROVED' && claim.status !== 'APPROVED'
  const isRejecting = status === 'REJECTED' && claim.status !== 'REJECTED'
  const isDepositing = isApproving
    ? '→ 押金状态将自动更新为已批准 / Deposit status will be set to CLAIM_APPROVED'
    : isRejecting
      ? '→ 押金状态将自动重置为已支付 / Deposit status will be reset to PAID'
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) {
      setError('请填写服务描述 / Please enter a description')
      return
    }
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      setError('拒绝时必须填写原因 / Rejection reason is required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/volunteer/claims/${claim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE',
          serviceId,
          description: description.trim(),
          photoUrl: photoUrl.trim() || null,
          status,
          rejectionReason: rejectionReason.trim() || null,
          adminNotes: adminNotes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败 / Operation failed')
        return
      }
      onSuccess('申请记录已更新 / Claim updated')
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
          <h2 className="font-semibold text-gray-900">编辑申请记录 / Edit Claim</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {/* Read-only family info */}
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <p className="text-xs text-gray-400">家庭 / Family</p>
            <p className="font-medium text-gray-900">{claim.parentName ?? '—'}</p>
            <p className="text-xs text-gray-500">{claim.parentEmail}</p>
          </div>

          {/* Service */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">服务项目 / Service</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.nameZh} / {s.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              服务描述 / Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Photo URL */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">照片 URL / Photo URL</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">状态 / Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClaimStatus)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="PENDING_REVIEW">待审核 / Pending Review</option>
              <option value="APPROVED">已批准 / Approved</option>
              <option value="REJECTED">已拒绝 / Rejected</option>
            </select>
            {isDepositing && (
              <p className="mt-1 text-xs text-blue-600">{isDepositing}</p>
            )}
          </div>

          {/* Rejection reason — show when REJECTED */}
          {status === 'REJECTED' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                拒绝原因 / Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          )}

          {/* Admin notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">管理员备注 / Admin Notes</label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="仅管理员可见 / Admin-only notes"
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
