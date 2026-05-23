'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  status: ClaimStatus
  description: string
  photoUrl?: string | null
  submittedAt: string | Date
  reviewedAt?: string | Date | null
  rejectionReason?: string | null
  service: { name: string; nameZh: string }
  family: {
    users: { name?: string | null; email: string }[]
  }
}

interface Deposit {
  id: string
  status: DepositStatus
  amount: number | string
  paidAt?: string | Date | null
  refundedAt?: string | Date | null
  forfeitedAt?: string | Date | null
  academicYear: string
  family: {
    id: string
    users: { id: string; name?: string | null; email: string }[]
  }
  claims: (Claim & { service: { name: string; nameZh: string } })[]
}

interface Props {
  deposits: Deposit[]
  services: Service[]
  isSuperAdmin: boolean
  academicYear: string
}

const DEPOSIT_STATUS_LABEL: Record<DepositStatus, string> = {
  PENDING: '待支付',
  PAID: '已支付',
  CLAIM_PENDING: '申请中',
  CLAIM_APPROVED: '已批准',
  REFUNDED: '已退款',
  FORFEITED: '已没收',
  REFUND_FAILED: '退款失败',
}

const DEPOSIT_STATUS_COLOR: Record<DepositStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-blue-100 text-blue-700',
  CLAIM_PENDING: 'bg-purple-100 text-purple-700',
  CLAIM_APPROVED: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-green-100 text-green-700',
  FORFEITED: 'bg-gray-100 text-gray-500',
  REFUND_FAILED: 'bg-red-100 text-red-700',
}

type Tab = 'deposits' | 'claims' | 'refunds' | 'services'

export function AdminVolunteerClient({ deposits, services: initialServices, isSuperAdmin, academicYear }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('deposits')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Forfeit state
  const [selectedDepositIds, setSelectedDepositIds] = useState<string[]>([])
  const [forfeitReason, setForfeitReason] = useState('')
  const [forfeitConfirm, setForfeitConfirm] = useState('')
  const [forfeiting, setForfeiting] = useState(false)
  const [forfeitModal, setForfeitModal] = useState(false)

  // Reject claim state
  const [rejectClaimId, setRejectClaimId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Refund state
  const [refundDepositId, setRefundDepositId] = useState<string | null>(null)
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [refundMessage, setRefundMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Services state
  const [services, setServices] = useState<Service[]>(initialServices)
  const [newService, setNewService] = useState({ name: '', nameZh: '', description: '', descriptionZh: '' })
  const [savingService, setSavingService] = useState(false)

  const pendingClaims = deposits.flatMap((d) =>
    d.claims.filter((c) => c.status === 'PENDING_REVIEW').map((c) => ({ ...c, family: d.family, depositId: d.id }))
  )
  const pendingRefunds = deposits.filter((d) => d.status === 'CLAIM_APPROVED' || d.status === 'REFUND_FAILED')

  const filteredDeposits =
    statusFilter === 'ALL' ? deposits : deposits.filter((d) => d.status === statusFilter)

  async function approveClaim(claimId: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/volunteer/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      })
      const json = await res.json()
      if (!json.success) alert(json.error)
      else router.refresh()
    } catch {
      alert('网络错误 / Network error')
    } finally {
      setActionLoading(false)
    }
  }

  async function rejectClaim() {
    if (!rejectClaimId || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/volunteer/claims/${rejectClaimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', rejectionReason: rejectReason }),
      })
      const json = await res.json()
      if (!json.success) alert(json.error)
      else {
        setRejectClaimId(null)
        setRejectReason('')
        router.refresh()
      }
    } catch {
      alert('网络错误 / Network error')
    } finally {
      setActionLoading(false)
    }
  }

  async function processRefund() {
    if (!refundDepositId) return
    setRefundProcessing(true)
    try {
      const res = await fetch(`/api/admin/volunteer/deposits/${refundDepositId}/refund`, {
        method: 'POST',
      })
      const json = await res.json()
      setRefundDepositId(null)
      if (!json.success) {
        setRefundMessage({
          text: `退款失败：${json.error} 请重试或联系技术支持。/ Refund failed: ${json.error} Please retry or contact support.`,
          type: 'error',
        })
      } else {
        setRefundMessage({
          text: `退款已成功处理！退款ID: ${json.refundId} / Refund processed successfully! Refund ID: ${json.refundId}`,
          type: 'success',
        })
        router.refresh()
      }
    } catch {
      setRefundDepositId(null)
      setRefundMessage({ text: '网络错误，请重试 / Network error, please retry', type: 'error' })
    } finally {
      setRefundProcessing(false)
    }
  }

  async function handleForfeit() {
    if (forfeitConfirm !== 'FORFEIT') return
    setForfeiting(true)
    try {
      const res = await fetch('/api/admin/volunteer/forfeit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositIds: selectedDepositIds, reason: forfeitReason || undefined }),
      })
      const json = await res.json()
      if (!json.success) alert(json.error)
      else {
        setForfeitModal(false)
        setSelectedDepositIds([])
        setForfeitReason('')
        setForfeitConfirm('')
        router.refresh()
      }
    } catch {
      alert('网络错误 / Network error')
    } finally {
      setForfeiting(false)
    }
  }

  async function createService(e: React.FormEvent) {
    e.preventDefault()
    setSavingService(true)
    try {
      const res = await fetch('/api/admin/volunteer/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newService, academicYear }),
      })
      const json = await res.json()
      if (!json.success) alert(json.error)
      else {
        setServices((prev) => [...prev, json.data])
        setNewService({ name: '', nameZh: '', description: '', descriptionZh: '' })
      }
    } catch {
      alert('网络错误 / Network error')
    } finally {
      setSavingService(false)
    }
  }

  async function deleteService(serviceId: string) {
    if (!confirm('确认删除此服务项目？/ Confirm delete this service?')) return
    try {
      const res = await fetch(`/api/admin/volunteer/services/${serviceId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) alert(json.error)
      else setServices((prev) => prev.filter((s) => s.id !== serviceId))
    } catch {
      alert('网络错误 / Network error')
    }
  }

  async function toggleServiceActive(serviceId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/admin/volunteer/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      const json = await res.json()
      if (!json.success) alert(json.error)
      else setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, isActive } : s)))
    } catch {
      alert('网络错误 / Network error')
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {([
          { id: 'deposits' as const, label: '押金概览', en: 'Deposits', badge: undefined },
          { id: 'claims' as const, label: '待审核申请', en: 'Pending Claims', badge: pendingClaims.length },
          { id: 'refunds' as const, label: '待退款', en: 'Pending Refunds', badge: pendingRefunds.length },
          { id: 'services' as const, label: '服务项目', en: 'Services', badge: undefined },
        ]).map(({ id, label, en, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className="text-xs text-gray-400">/ {en}</span>
            {badge !== undefined && badge > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Deposits */}
      {tab === 'deposits' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">押金记录 / Deposit Records</h2>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="ALL">全部 / All</option>
                {(['PENDING', 'PAID', 'CLAIM_PENDING', 'CLAIM_APPROVED', 'REFUNDED', 'FORFEITED', 'REFUND_FAILED'] as DepositStatus[]).map((s) => (
                  <option key={s} value={s}>{DEPOSIT_STATUS_LABEL[s]}</option>
                ))}
              </select>
              {isSuperAdmin && selectedDepositIds.length > 0 && (
                <button
                  onClick={() => setForfeitModal(true)}
                  className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                >
                  没收所选 ({selectedDepositIds.length}) / Forfeit Selected
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {isSuperAdmin && <th className="px-4 py-3"><input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelectedDepositIds(filteredDeposits.filter((d) => d.status === 'PAID').map((d) => d.id))
                    else setSelectedDepositIds([])
                  }} /></th>}
                  <th className="px-4 py-3">家庭 / Family</th>
                  <th className="px-4 py-3">金额 / Amount</th>
                  <th className="px-4 py-3">状态 / Status</th>
                  <th className="px-4 py-3">学年 / Year</th>
                  <th className="px-4 py-3">申请数 / Claims</th>
                  <th className="px-4 py-3">支付时间 / Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDeposits.map((d) => {
                  const user = d.family.users[0]
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          {d.status === 'PAID' && (
                            <input
                              type="checkbox"
                              checked={selectedDepositIds.includes(d.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedDepositIds((prev) => [...prev, d.id])
                                else setSelectedDepositIds((prev) => prev.filter((id) => id !== d.id))
                              }}
                            />
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{user?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">${parseFloat(String(d.amount)).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DEPOSIT_STATUS_COLOR[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {DEPOSIT_STATUS_LABEL[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{d.academicYear}</td>
                      <td className="px-4 py-3 text-gray-500">{d.claims.length}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {d.paidAt ? new Date(d.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  )
                })}
                {filteredDeposits.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-400">
                      暂无数据 / No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pending Claims */}
      {tab === 'claims' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-900">待审核申请 / Pending Claims ({pendingClaims.length})</h2>
          </div>
          {pendingClaims.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">暂无待审核申请 / No pending claims</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pendingClaims.map((claim) => {
                const user = (claim as { family: { users: { name?: string | null; email: string }[] } }).family.users[0]
                return (
                  <div key={claim.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{user?.name ?? '—'}</p>
                          <span className="text-xs text-gray-400">{user?.email}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-700">
                          {claim.service.nameZh} / {claim.service.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 rounded p-2">{claim.description}</p>
                        {claim.photoUrl && (
                          <a href={claim.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-blue-600 hover:underline">
                            查看照片 / View photo →
                          </a>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(claim.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => approveClaim(claim.id)}
                          disabled={actionLoading}
                          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          ✓ 批准 / Approve
                        </button>
                        <button
                          onClick={() => setRejectClaimId(claim.id)}
                          disabled={actionLoading}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          ✗ 拒绝 / Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Pending Refunds */}
      {tab === 'refunds' && (
        <div className="space-y-3">
          {refundMessage && (
            <div
              className={`rounded-md p-3 text-sm ${
                refundMessage.type === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {refundMessage.text}
              <button
                onClick={() => setRefundMessage(null)}
                className="ml-3 text-xs underline opacity-70 hover:opacity-100"
              >
                关闭 / Dismiss
              </button>
            </div>
          )}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">待退款 / Pending Refunds ({pendingRefunds.length})</h2>
            </div>
            {pendingRefunds.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">暂无待退款记录 / No pending refunds</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingRefunds.map((d) => {
                  const user = d.family.users[0]
                  const isFailed = d.status === 'REFUND_FAILED'
                  return (
                    <div key={d.id} className="flex items-center justify-between px-6 py-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{user?.name ?? '—'}</p>
                          {isFailed && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              退款失败 / Refund Failed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                        <p className="mt-1 text-sm text-gray-600">
                          金额 / Amount: <strong>${parseFloat(String(d.amount)).toFixed(2)}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => setRefundDepositId(d.id)}
                        className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        💳 {isFailed ? '重试退款 / Retry Refund' : '处理退款 / Process Refund'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Services */}
      {tab === 'services' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">服务项目 / Volunteer Services</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-3 gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{s.nameZh} / {s.name}</p>
                    {s.descriptionZh && <p className="text-xs text-gray-400 mt-0.5">{s.descriptionZh}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleServiceActive(s.id, !s.isActive)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {s.isActive ? '启用' : '停用'}
                    </button>
                    <button
                      onClick={() => deleteService(s.id)}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-400">暂无服务项目 / No services</div>
              )}
            </div>
          </div>

          {/* Add new service */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">添加服务项目 / Add Service</h3>
            <form onSubmit={createService} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">中文名称 / Chinese Name *</label>
                <input
                  required
                  value={newService.nameZh}
                  onChange={(e) => setNewService((p) => ({ ...p, nameZh: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">English Name *</label>
                <input
                  required
                  value={newService.name}
                  onChange={(e) => setNewService((p) => ({ ...p, name: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">中文描述 / Chinese Description</label>
                <input
                  value={newService.descriptionZh}
                  onChange={(e) => setNewService((p) => ({ ...p, descriptionZh: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">English Description</label>
                <input
                  value={newService.description}
                  onChange={(e) => setNewService((p) => ({ ...p, description: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingService}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {savingService ? '保存中… / Saving…' : '添加服务 / Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Claim Modal */}
      {rejectClaimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-gray-900">拒绝申请 / Reject Claim</h3>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              拒绝原因 / Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请输入拒绝原因…"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => { setRejectClaimId(null); setRejectReason('') }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                取消 / Cancel
              </button>
              <button
                onClick={rejectClaim}
                disabled={actionLoading || !rejectReason.trim()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                确认拒绝 / Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundDepositId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-gray-900">确认退款 / Confirm Refund</h3>
            <p className="mb-1 text-sm text-gray-700">
              确认向此家庭退还 $100 押金？退款将自动退回至原支付方式（信用卡或 PayPal）。
            </p>
            <p className="mb-1 text-xs text-gray-500">
              Confirm refund of $100 deposit to this family? The refund will be automatically returned
              to the original payment method (credit card or PayPal).
            </p>
            <p className="mb-1 text-sm text-gray-700">
              预计到账时间：信用卡 5-10 个工作日，PayPal 3-5 个工作日。
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Expected timeline: 5-10 business days for credit card, 3-5 business days for PayPal.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRefundDepositId(null)}
                disabled={refundProcessing}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                取消 / Cancel
              </button>
              <button
                onClick={processRefund}
                disabled={refundProcessing}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {refundProcessing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    处理中… / Processing…
                  </>
                ) : (
                  '💳 确认退款 / Confirm Refund'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Confirmation Modal */}
      {forfeitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-red-700">没收押金 / Forfeit Deposits</h3>
            <p className="mb-3 text-sm text-gray-600">
              此操作将没收 {selectedDepositIds.length} 个押金，无法撤销。
              <br />
              This will forfeit {selectedDepositIds.length} deposit(s). This action cannot be undone.
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">原因（可选）/ Reason (optional)</label>
            <input
              value={forfeitReason}
              onChange={(e) => setForfeitReason(e.target.value)}
              placeholder="没收原因…"
              className="mb-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="mb-1 block text-sm font-medium text-gray-700">
              请输入 <strong>FORFEIT</strong> 确认 / Type <strong>FORFEIT</strong> to confirm
            </label>
            <input
              value={forfeitConfirm}
              onChange={(e) => setForfeitConfirm(e.target.value)}
              placeholder="FORFEIT"
              className="mb-4 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setForfeitModal(false); setForfeitConfirm('') }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
              >
                取消 / Cancel
              </button>
              <button
                onClick={handleForfeit}
                disabled={forfeiting || forfeitConfirm !== 'FORFEIT'}
                className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {forfeiting ? '处理中…' : '确认没收 / Confirm Forfeit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
