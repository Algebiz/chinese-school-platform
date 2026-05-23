'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DepositStatus = 'PENDING' | 'PAID' | 'CLAIM_PENDING' | 'CLAIM_APPROVED' | 'REFUNDED' | 'FORFEITED'
type ClaimStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

interface Service {
  id: string
  name: string
  nameZh: string
  description?: string | null
  descriptionZh?: string | null
  academicYear: string
  isActive: boolean
}

interface Claim {
  id: string
  serviceId: string
  status: ClaimStatus
  description: string
  photoUrl?: string | null
  submittedAt: string | Date
  reviewedAt?: string | Date | null
  rejectionReason?: string | null
  service: { name: string; nameZh: string }
}

interface Deposit {
  id: string
  status: DepositStatus
  amount: number | string
  paidAt?: string | Date | null
  refundedAt?: string | Date | null
  forfeitedAt?: string | Date | null
  academicYear: string
  claims: Claim[]
}

interface Props {
  deposit: Deposit | null
  services: Service[]
  academicYear: string
}

const DEPOSIT_STATUS_MAP: Record<DepositStatus, { label: string; color: string }> = {
  PENDING: { label: '待支付 / Pending Payment', color: 'bg-amber-100 text-amber-700' },
  PAID: { label: '已支付 / Paid', color: 'bg-blue-100 text-blue-700' },
  CLAIM_PENDING: { label: '申请审核中 / Claim Under Review', color: 'bg-purple-100 text-purple-700' },
  CLAIM_APPROVED: { label: '申请已批准 / Claim Approved', color: 'bg-green-100 text-green-700' },
  REFUNDED: { label: '已退款 / Refunded', color: 'bg-green-100 text-green-700' },
  FORFEITED: { label: '已没收 / Forfeited', color: 'bg-gray-100 text-gray-500' },
}

const CLAIM_STATUS_MAP: Record<ClaimStatus, { label: string; color: string }> = {
  PENDING_REVIEW: { label: '审核中 / Under Review', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '已批准 / Approved', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '未通过 / Rejected', color: 'bg-red-100 text-red-700' },
}

export function VolunteerClient({ deposit, services, academicYear }: Props) {
  const router = useRouter()
  const [serviceId, setServiceId] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const depositStatus = deposit?.status
  const amount = deposit ? parseFloat(String(deposit.amount)) : 100

  // Show claim form only when deposit is PAID and no pending/approved claim
  const canSubmitClaim =
    depositStatus === 'PAID' &&
    !deposit?.claims.some((c) => c.status === 'PENDING_REVIEW' || c.status === 'APPROVED')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (description.length < 50) {
      setError('描述至少需要50个字符 / Description must be at least 50 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/volunteer/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, description, photoUrl: photoUrl || undefined }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '提交失败，请重试')
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Deposit Status Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">押金状态 / Deposit Status</h2>

        {!deposit ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-800">尚未缴纳志愿服务押金</p>
            <p className="mt-1 text-xs text-amber-600">
              You have not paid the volunteer deposit for {academicYear}. It will be collected
              at checkout when you enroll.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${DEPOSIT_STATUS_MAP[deposit.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                {DEPOSIT_STATUS_MAP[deposit.status]?.label ?? deposit.status}
              </span>
              <span className="text-sm text-gray-500">
                金额 / Amount: <strong>${amount.toFixed(2)}</strong>
              </span>
            </div>

            {deposit.paidAt && (
              <p className="text-xs text-gray-400">
                支付时间 / Paid on:{' '}
                {new Date(deposit.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}

            {depositStatus === 'PAID' && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  您的押金已支付。请在下方提交志愿服务申请以申请退款。
                </p>
                <p className="mt-0.5 text-xs text-blue-600">
                  Your deposit has been paid. Submit a volunteer service claim below to request a refund.
                </p>
              </div>
            )}

            {depositStatus === 'CLAIM_PENDING' && (
              <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
                <p className="text-sm text-purple-800">您的志愿服务申请正在审核中，请耐心等待。</p>
                <p className="mt-0.5 text-xs text-purple-600">
                  Your volunteer service claim is under review.
                </p>
              </div>
            )}

            {depositStatus === 'CLAIM_APPROVED' && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">申请已批准！退款正在处理中。</p>
                <p className="mt-0.5 text-xs text-green-600">
                  Your claim has been approved. Refund is being processed by our accountant.
                </p>
              </div>
            )}

            {depositStatus === 'REFUNDED' && deposit.refundedAt && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">
                  押金已退款！感谢您的志愿服务贡献。
                </p>
                <p className="mt-0.5 text-xs text-green-600">
                  Refund processed on{' '}
                  {new Date(deposit.refundedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  . Thank you for your volunteer service!
                </p>
              </div>
            )}

            {depositStatus === 'FORFEITED' && (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm text-gray-700">此押金已被没收。如有疑问请联系学校。</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  This deposit has been forfeited. Please contact the school if you have questions.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Claim Form */}
      {canSubmitClaim && !success && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-base font-semibold text-gray-900">提交志愿服务申请 / Submit Claim</h2>
          <p className="mb-4 text-sm text-gray-500">
            填写以下信息申请押金退款 / Fill in the details below to claim your deposit refund
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                志愿服务项目 / Service Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">请选择 / Please select...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameZh} / {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                服务描述 / Description <span className="text-red-500">*</span>
              </label>
              <p className="mb-1 text-xs text-gray-400">请描述您的志愿服务内容（至少50字符）/ Describe your volunteer service (min 50 characters)</p>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：我在春节晚会上协助布置会场，包括摆放桌椅、悬挂装饰..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-gray-400">{description.length} / 50+ characters</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                照片链接（可选）/ Photo URL (optional)
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !serviceId}
              className="rounded-md bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '提交中… / Submitting…' : '提交申请 / Submit Claim'}
            </button>
          </form>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <p className="font-medium text-green-800">✓ 申请已提交！/ Claim submitted!</p>
          <p className="mt-1 text-sm text-green-700">
            我们将尽快审核您的申请，审核结果将通过邮件通知您。
          </p>
          <p className="mt-0.5 text-xs text-green-600">
            We will review your claim soon and notify you by email.
          </p>
        </div>
      )}

      {/* Section 3: Available Services */}
      {services.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            可用服务项目 / Available Volunteer Services
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">{s.nameZh}</p>
                <p className="text-xs text-gray-500">{s.name}</p>
                {s.descriptionZh && (
                  <p className="mt-1 text-xs text-gray-400">{s.descriptionZh}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Claim History */}
      {deposit && deposit.claims.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
            <h2 className="text-base font-semibold text-gray-900">申请记录 / Claim History</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {deposit.claims.map((claim) => (
              <div key={claim.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {claim.service.nameZh}
                      <span className="ml-1.5 text-xs text-gray-400">/ {claim.service.name}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{claim.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      提交时间 / Submitted:{' '}
                      {new Date(claim.submittedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {claim.rejectionReason && (
                      <p className="mt-1 text-xs text-red-600">
                        原因 / Reason: {claim.rejectionReason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      CLAIM_STATUS_MAP[claim.status]?.color ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {CLAIM_STATUS_MAP[claim.status]?.label ?? claim.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
