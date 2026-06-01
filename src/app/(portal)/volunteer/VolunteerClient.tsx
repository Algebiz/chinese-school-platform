'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhotoUpload } from '@/components/PhotoUpload'
import { useLanguage, useLocalizedField } from '@/lib/i18n/LanguageContext'

type DepositStatus = 'PENDING' | 'PAID' | 'CLAIM_PENDING' | 'CLAIM_APPROVED' | 'REFUNDED' | 'FORFEITED' | 'REFUND_FAILED'
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

const DEPOSIT_STATUS_COLORS: Record<DepositStatus, string> = {
  PENDING:        'bg-amber-100 text-amber-700',
  PAID:           'bg-blue-100 text-blue-700',
  CLAIM_PENDING:  'bg-purple-100 text-purple-700',
  CLAIM_APPROVED: 'bg-green-100 text-green-700',
  REFUNDED:       'bg-green-100 text-green-700',
  FORFEITED:      'bg-gray-100 text-gray-500',
  REFUND_FAILED:  'bg-amber-100 text-amber-700',
}

const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED:       'bg-green-100 text-green-700',
  REJECTED:       'bg-red-100 text-red-700',
}

export function VolunteerClient({ deposit, services, academicYear }: Props) {
  const router = useRouter()
  const { t } = useLanguage()
  const { field } = useLocalizedField()

  const [serviceId, setServiceId] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const depositStatus = deposit?.status
  const amount = deposit ? parseFloat(String(deposit.amount)) : 100

  const canSubmitClaim =
    depositStatus === 'PAID' &&
    !deposit?.claims.some((c) => c.status === 'PENDING_REVIEW' || c.status === 'APPROVED')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (description.length < 50) {
      setError(t('描述至少需要50个字符', 'Description must be at least 50 characters'))
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
        setError(json.error ?? t('提交失败，请重试', 'Submission failed, please try again'))
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch {
      setError(t('网络错误，请重试', 'Network error, please try again'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Deposit Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">{t('押金状态', 'Deposit Status')}</h2>

        {!deposit ? (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm font-medium text-amber-800">
              {t('尚未缴纳志愿服务押金', 'Volunteer deposit not yet paid')}
            </p>
            <p className="mt-1 text-xs text-amber-600">
              {t(`${academicYear} 学年押金将在报名结账时收取。`, `The volunteer deposit for ${academicYear} will be collected at checkout when you enroll.`)}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${DEPOSIT_STATUS_COLORS[deposit.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {({
                  PENDING:        t('待支付', 'Pending'),
                  PAID:           t('已支付', 'Paid'),
                  CLAIM_PENDING:  t('申请审核中', 'Claim Under Review'),
                  CLAIM_APPROVED: t('申请已批准', 'Claim Approved'),
                  REFUNDED:       t('已退款', 'Refunded'),
                  FORFEITED:      t('已没收', 'Forfeited'),
                  REFUND_FAILED:  t('退款处理中', 'Refund Processing'),
                } as Record<string, string>)[deposit.status] ?? deposit.status}
              </span>
              <span className="text-sm text-gray-500">
                {t('金额', 'Amount')}: <strong>${amount.toFixed(2)}</strong>
              </span>
            </div>

            {deposit.paidAt && (
              <p className="text-xs text-gray-400">
                {t('支付时间', 'Paid on')}:{' '}
                {new Date(deposit.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}

            {depositStatus === 'PAID' && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  {t('您的押金已支付。请在下方提交志愿服务申请以申请退款。', 'Your deposit has been paid. Submit a volunteer service claim below to request a refund.')}
                </p>
              </div>
            )}

            {depositStatus === 'CLAIM_PENDING' && (
              <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
                <p className="text-sm text-purple-800">
                  {t('您的志愿服务申请正在审核中，请耐心等待。', 'Your volunteer service claim is under review. Please wait patiently.')}
                </p>
              </div>
            )}

            {depositStatus === 'CLAIM_APPROVED' && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">
                  {t('申请已批准！退款正在处理中。', 'Your claim has been approved. Refund is being processed.')}
                </p>
              </div>
            )}

            {depositStatus === 'REFUNDED' && deposit.refundedAt && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-800">
                  {t('押金已退款！感谢您的志愿服务贡献。', 'Refund processed. Thank you for your volunteer service!')}
                </p>
                <p className="mt-0.5 text-xs text-green-600">
                  {new Date(deposit.refundedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}

            {depositStatus === 'FORFEITED' && (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm text-gray-700">
                  {t('此押金已被没收。如有疑问请联系学校。', 'This deposit has been forfeited. Please contact the school if you have questions.')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Form */}
      {canSubmitClaim && !success && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            {t('提交志愿服务申请', 'Submit Volunteer Claim')}
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            {t('填写以下信息申请押金退款', 'Fill in the details below to claim your deposit refund')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('志愿服务项目', 'Service Type')} <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">{t('请选择', 'Please select…')}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {field(s.nameZh, s.name)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('服务描述', 'Service Description')} <span className="text-red-500">*</span>
              </label>
              <p className="mb-1 text-xs text-gray-400">
                {t('请描述您的志愿服务内容（至少50字符）', 'Describe your volunteer service (min 50 characters)')}
              </p>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('例如：我在春节晚会上协助布置会场…', 'e.g. I helped set up the venue for the Spring Festival event…')}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-gray-400">{description.length} / 50+</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('上传照片', 'Upload Photo')} ({t('可选', 'optional')})
              </label>
              <p className="mb-2 text-xs text-gray-400">
                {t('上传志愿服务照片作为证明', 'Upload a photo as proof of your service')}
              </p>
              <PhotoUpload
                onUploadComplete={(url) => setPhotoUrl(url)}
                onUploadError={(err) => setError(err)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !serviceId}
              className="rounded-md bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('提交中…', 'Submitting…') : t('提交申请', 'Submit Claim')}
            </button>
          </form>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <p className="font-medium text-green-800">✓ {t('申请已提交！', 'Claim submitted!')}</p>
          <p className="mt-1 text-sm text-green-700">
            {t('我们将尽快审核您的申请，审核结果将通过邮件通知您。', 'We will review your claim soon and notify you by email.')}
          </p>
        </div>
      )}

      {/* Available Services */}
      {services.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            {t('可用服务项目', 'Available Volunteer Services')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">{field(s.nameZh, s.name)}</p>
                {(s.descriptionZh || s.description) && (
                  <p className="mt-1 text-xs text-gray-400">{field(s.descriptionZh, s.description)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim History */}
      {deposit && deposit.claims.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
            <h2 className="text-base font-semibold text-gray-900">{t('申请记录', 'Claim History')}</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {deposit.claims.map((claim) => (
              <div key={claim.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {field(claim.service.nameZh, claim.service.name)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{claim.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {t('提交时间', 'Submitted')}:{' '}
                      {new Date(claim.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    {claim.rejectionReason && (
                      <p className="mt-1 text-xs text-red-600">
                        {t('原因', 'Reason')}: {claim.rejectionReason}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CLAIM_STATUS_COLORS[claim.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {({
                      PENDING_REVIEW: t('审核中', 'Under Review'),
                      APPROVED:       t('已批准', 'Approved'),
                      REJECTED:       t('未通过', 'Rejected'),
                    } as Record<string, string>)[claim.status] ?? claim.status}
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
