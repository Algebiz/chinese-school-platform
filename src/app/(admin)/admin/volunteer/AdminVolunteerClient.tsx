'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AddDepositModal } from '@/components/admin/AddDepositModal'
import type { FamilyOption } from '@/components/admin/AddDepositModal'
import { EditDepositModal } from '@/components/admin/EditDepositModal'
import type { DepositForEdit } from '@/components/admin/EditDepositModal'
import { AddClaimModal } from '@/components/admin/AddClaimModal'
import { EditClaimModal } from '@/components/admin/EditClaimModal'
import type { ClaimForEdit } from '@/components/admin/EditClaimModal'
import { EditServiceModal } from '@/components/admin/EditServiceModal'
import type { ServiceForEdit } from '@/components/admin/EditServiceModal'

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
  _count?: { claims: number }
}

interface Claim {
  id: string
  depositId: string
  status: ClaimStatus
  description: string
  photoUrl?: string | null
  submittedAt: string | Date
  reviewedAt?: string | Date | null
  rejectionReason?: string | null
  adminNotes?: string | null
  academicYear: string
  serviceId: string
  service: { id: string; name: string; nameZh: string }
  family: {
    id: string
    users: { id: string; name?: string | null; email: string }[]
  }
  deposit: { id: string; status: string }
}

interface Deposit {
  id: string
  status: DepositStatus
  amount: number | string
  paidAt?: string | Date | null
  refundedAt?: string | Date | null
  forfeitedAt?: string | Date | null
  notes?: string | null
  academicYear: string
  family: {
    id: string
    users: { id: string; name?: string | null; email: string }[]
  }
  claims: (Claim & { service: { name: string; nameZh: string } })[]
}

interface Props {
  deposits: Deposit[]
  allClaims: Claim[]
  services: Service[]
  families: FamilyOption[]
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

const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  PENDING_REVIEW: '待审核',
  APPROVED: '已批准',
  REJECTED: '已拒绝',
}

const CLAIM_STATUS_COLOR: Record<ClaimStatus, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

type Tab = 'deposits' | 'claims' | 'refunds' | 'services'
type MsgType = 'success' | 'error'

export function AdminVolunteerClient({
  deposits,
  allClaims: initialAllClaims,
  services: initialServices,
  families,
  isSuperAdmin,
  academicYear,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('deposits')
  const [toast, setToast] = useState<{ text: string; type: MsgType } | null>(null)

  // ── Deposits tab ──────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [addDepositOpen, setAddDepositOpen] = useState(false)
  const [editDepositTarget, setEditDepositTarget] = useState<DepositForEdit | null>(null)
  const [deleteDepositTarget, setDeleteDepositTarget] = useState<Deposit | null>(null)
  const [deletingDeposit, setDeletingDeposit] = useState(false)

  // ── Forfeit (super admin) ─────────────────────────────────────────────────
  const [selectedDepositIds, setSelectedDepositIds] = useState<string[]>([])
  const [forfeitReason, setForfeitReason] = useState('')
  const [forfeitConfirm, setForfeitConfirm] = useState('')
  const [forfeiting, setForfeiting] = useState(false)
  const [forfeitModal, setForfeitModal] = useState(false)

  // ── Claims tab ────────────────────────────────────────────────────────────
  const [claimFilter, setClaimFilter] = useState<string>('ALL')
  const [addClaimOpen, setAddClaimOpen] = useState(false)
  const [editClaimTarget, setEditClaimTarget] = useState<ClaimForEdit | null>(null)
  const [deleteClaimTarget, setDeleteClaimTarget] = useState<Claim | null>(null)
  const [deletingClaim, setDeletingClaim] = useState(false)
  const [rejectClaimId, setRejectClaimId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // ── Refunds tab ───────────────────────────────────────────────────────────
  const [refundDepositId, setRefundDepositId] = useState<string | null>(null)
  const [refundProcessing, setRefundProcessing] = useState(false)
  const [refundMessage, setRefundMessage] = useState<{ text: string; type: MsgType } | null>(null)

  // ── Services tab ──────────────────────────────────────────────────────────
  const [services, setServices] = useState<Service[]>(initialServices)
  const [newService, setNewService] = useState({ name: '', nameZh: '', description: '', descriptionZh: '' })
  const [savingService, setSavingService] = useState(false)
  const [editServiceTarget, setEditServiceTarget] = useState<ServiceForEdit | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingClaims = deposits.flatMap((d) =>
    d.claims.filter((c) => c.status === 'PENDING_REVIEW').map((c) => ({ ...c, family: d.family, depositId: d.id }))
  )
  const pendingRefunds = deposits.filter((d) => d.status === 'CLAIM_APPROVED' || d.status === 'REFUND_FAILED')
  const filteredDeposits = statusFilter === 'ALL' ? deposits : deposits.filter((d) => d.status === statusFilter)
  const existingFamilyIds = deposits.map((d) => d.family.id)

  const filteredClaims =
    claimFilter === 'ALL' ? initialAllClaims : initialAllClaims.filter((c) => c.status === claimFilter)

  const familiesWithDeposits = deposits
    .filter((d) => d.status === 'PAID' || d.status === 'CLAIM_PENDING')
    .map((d) => ({
      id: d.family.id,
      depositId: d.id,
      parentName: d.family.users[0]?.name ?? null,
      parentEmail: d.family.users[0]?.email ?? '',
    }))

  // ── Helpers ───────────────────────────────────────────────────────────────
  function showToast(text: string, type: MsgType = 'success') {
    setToast({ text, type })
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3000)
  }

  function refreshAndToast(msg: string) {
    showToast(msg)
    router.refresh()
  }

  // ── Claim actions ─────────────────────────────────────────────────────────
  async function approveClaim(claimId: string) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/volunteer/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      })
      const json = await res.json()
      if (!json.success) showToast(json.error ?? '操作失败', 'error')
      else refreshAndToast('申请已批准 / Claim approved')
    } catch {
      showToast('网络错误 / Network error', 'error')
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
      if (!json.success) showToast(json.error ?? '操作失败', 'error')
      else {
        setRejectClaimId(null)
        setRejectReason('')
        refreshAndToast('申请已拒绝 / Claim rejected')
      }
    } catch {
      showToast('网络错误 / Network error', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function deleteClaim() {
    if (!deleteClaimTarget) return
    setDeletingClaim(true)
    try {
      const res = await fetch(`/api/admin/volunteer/claims/${deleteClaimTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      setDeleteClaimTarget(null)
      if (!json.success) showToast(json.error ?? '删除失败', 'error')
      else refreshAndToast(json.depositReset ? '申请已删除，押金状态已重置为已支付 / Claim deleted, deposit reset to PAID' : '申请已删除 / Claim deleted')
    } catch {
      showToast('网络错误 / Network error', 'error')
    } finally {
      setDeletingClaim(false)
    }
  }

  // ── Deposit delete ────────────────────────────────────────────────────────
  async function deleteDeposit() {
    if (!deleteDepositTarget) return
    setDeletingDeposit(true)
    try {
      const res = await fetch(`/api/admin/volunteer/deposits/${deleteDepositTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      setDeleteDepositTarget(null)
      if (!json.success) {
        const msg =
          json.code === 'HAS_APPROVED_CLAIMS'
            ? '无法删除已有已批准申请的押金记录 / Cannot delete deposit with approved claims'
            : json.error ?? '删除失败'
        showToast(msg, 'error')
      } else {
        refreshAndToast('押金记录已删除 / Deposit deleted')
      }
    } catch {
      showToast('网络错误 / Network error', 'error')
    } finally {
      setDeletingDeposit(false)
    }
  }

  // ── Refund ────────────────────────────────────────────────────────────────
  async function processRefund() {
    if (!refundDepositId) return
    setRefundProcessing(true)
    try {
      const res = await fetch(`/api/admin/volunteer/deposits/${refundDepositId}/refund`, { method: 'POST' })
      const json = await res.json()
      setRefundDepositId(null)
      if (!json.success) {
        setRefundMessage({ text: `退款失败：${json.error} / Refund failed: ${json.error}`, type: 'error' })
      } else {
        setRefundMessage({
          text: `退款成功！退款ID: ${json.refundId} / Refund processed! ID: ${json.refundId}`,
          type: 'success',
        })
        router.refresh()
      }
    } catch {
      setRefundDepositId(null)
      setRefundMessage({ text: '网络错误 / Network error', type: 'error' })
    } finally {
      setRefundProcessing(false)
    }
  }

  // ── Forfeit ───────────────────────────────────────────────────────────────
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
      if (!json.success) showToast(json.error ?? '操作失败', 'error')
      else {
        setForfeitModal(false)
        setSelectedDepositIds([])
        setForfeitReason('')
        setForfeitConfirm('')
        refreshAndToast('押金已没收 / Deposits forfeited')
      }
    } catch {
      showToast('网络错误 / Network error', 'error')
    } finally {
      setForfeiting(false)
    }
  }

  // ── Services ──────────────────────────────────────────────────────────────
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
      if (!json.success) showToast(json.error ?? '操作失败', 'error')
      else {
        setServices((prev) => [...prev, json.data])
        setNewService({ name: '', nameZh: '', description: '', descriptionZh: '' })
        showToast('服务项目已添加 / Service added')
      }
    } catch {
      showToast('网络错误 / Network error', 'error')
    } finally {
      setSavingService(false)
    }
  }

  async function deleteService(serviceId: string) {
    if (!confirm('确认删除此服务项目？/ Confirm delete this service?')) return
    try {
      const res = await fetch(`/api/admin/volunteer/services/${serviceId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) showToast(json.error ?? '删除失败', 'error')
      else {
        setServices((prev) => prev.filter((s) => s.id !== serviceId))
        showToast('服务项目已删除 / Service deleted')
      }
    } catch {
      showToast('网络错误 / Network error', 'error')
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
      if (!json.success) showToast(json.error ?? '操作失败', 'error')
      else setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, isActive } : s)))
    } catch {
      showToast('网络错误 / Network error', 'error')
    }
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {toast.text}
          <button onClick={() => setToast(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
            关闭
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {([
          { id: 'deposits' as const, label: '押金概览', en: 'Deposits', badge: undefined },
          { id: 'claims' as const, label: '申请记录', en: 'Claims', badge: pendingClaims.length },
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

      {/* ── Tab 1: Deposits ── */}
      {tab === 'deposits' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-900">押金记录 / Deposit Records</h2>
            <div className="flex items-center gap-2 flex-wrap">
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
              <button
                onClick={() => setAddDepositOpen(true)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                ➕ 添加押金记录 / Add Deposit
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  {isSuperAdmin && (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedDepositIds(filteredDeposits.filter((d) => d.status === 'PAID').map((d) => d.id))
                          else setSelectedDepositIds([])
                        }}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3">家庭 / Family</th>
                  <th className="px-4 py-3">金额</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">学年</th>
                  <th className="px-4 py-3">申请</th>
                  <th className="px-4 py-3">支付日期</th>
                  <th className="px-4 py-3">备注</th>
                  <th className="px-4 py-3" />
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
                        {d.paidAt
                          ? new Date(d.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[120px] truncate">
                        {d.notes ?? ''}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() =>
                              setEditDepositTarget({
                                id: d.id,
                                familyName: user?.name ?? '—',
                                familyEmail: user?.email ?? '',
                                academicYear: d.academicYear,
                                amount: parseFloat(String(d.amount)).toFixed(2),
                                status: d.status,
                                paymentMethod: null,
                                paidAt: d.paidAt ? new Date(d.paidAt).toISOString() : null,
                                refundedAt: d.refundedAt ? new Date(d.refundedAt).toISOString() : null,
                                forfeitedAt: d.forfeitedAt ? new Date(d.forfeitedAt).toISOString() : null,
                                notes: d.notes ?? null,
                              })
                            }
                            className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            编辑 / Edit
                          </button>
                          <button
                            onClick={() => setDeleteDepositTarget(d)}
                            className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            🗑 删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredDeposits.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-8 text-center text-gray-400">
                      暂无数据 / No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: Claims ── */}
      {tab === 'claims' && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-900">
              申请记录 / Claims ({filteredClaims.length})
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={claimFilter}
                onChange={(e) => setClaimFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="ALL">全部 / All</option>
                <option value="PENDING_REVIEW">待审核 / Pending</option>
                <option value="APPROVED">已批准 / Approved</option>
                <option value="REJECTED">已拒绝 / Rejected</option>
              </select>
              <button
                onClick={() => setAddClaimOpen(true)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                ➕ 添加申请 / Add Claim
              </button>
            </div>
          </div>
          {filteredClaims.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">暂无申请记录 / No claims</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredClaims.map((claim) => {
                const user = claim.family.users[0]
                return (
                  <div key={claim.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{user?.name ?? '—'}</p>
                          <span className="text-xs text-gray-400">{user?.email}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLAIM_STATUS_COLOR[claim.status]}`}>
                            {CLAIM_STATUS_LABEL[claim.status]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-700">
                          {claim.service.nameZh} / {claim.service.name}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 bg-gray-50 rounded p-2 line-clamp-2">
                          {claim.description}
                        </p>
                        {claim.photoUrl ? (
                          <a href={claim.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={claim.photoUrl}
                              alt="Proof"
                              className="rounded border border-gray-200 object-cover"
                              style={{ width: 80, height: 60 }}
                            />
                          </a>
                        ) : (
                          <span className="mt-1 block text-xs text-gray-400">无照片 / No photo</span>
                        )}
                        {claim.rejectionReason && (
                          <p className="mt-1 text-xs text-red-600">拒绝原因: {claim.rejectionReason}</p>
                        )}
                        {claim.adminNotes && (
                          <p className="mt-1 text-xs text-gray-500 italic">备注: {claim.adminNotes}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(claim.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {claim.status === 'PENDING_REVIEW' && (
                          <>
                            <button
                              onClick={() => approveClaim(claim.id)}
                              disabled={actionLoading}
                              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              ✓ 批准
                            </button>
                            <button
                              onClick={() => setRejectClaimId(claim.id)}
                              disabled={actionLoading}
                              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              ✗ 拒绝
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            setEditClaimTarget({
                              id: claim.id,
                              depositId: claim.depositId,
                              serviceId: claim.serviceId,
                              description: claim.description,
                              photoUrl: claim.photoUrl ?? null,
                              status: claim.status,
                              rejectionReason: claim.rejectionReason ?? null,
                              adminNotes: claim.adminNotes ?? null,
                              depositStatus: claim.deposit.status as DepositStatus,
                              parentName: user?.name ?? null,
                              parentEmail: user?.email ?? '',
                            })
                          }
                          className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          编辑 / Edit
                        </button>
                        <button
                          onClick={() => setDeleteClaimTarget(claim)}
                          className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          🗑 删除
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

      {/* ── Tab 3: Pending Refunds ── */}
      {tab === 'refunds' && (
        <div className="space-y-3">
          {refundMessage && (
            <div className={`rounded-md p-3 text-sm ${refundMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {refundMessage.text}
              <button onClick={() => setRefundMessage(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">
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
                          金额: <strong>${parseFloat(String(d.amount)).toFixed(2)}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => setRefundDepositId(d.id)}
                        className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        💳 {isFailed ? '重试退款 / Retry' : '处理退款 / Process'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 4: Services ── */}
      {tab === 'services' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">服务项目 / Volunteer Services</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {services.map((s) => {
                const hasClaimsCount = s._count?.claims ?? 0
                return (
                  <div key={s.id} className="flex items-center justify-between px-6 py-3 gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.nameZh} / {s.name}</p>
                      {s.descriptionZh && <p className="text-xs text-gray-400 mt-0.5">{s.descriptionZh}</p>}
                      {hasClaimsCount > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{hasClaimsCount} 个申请记录 / {hasClaimsCount} claim(s)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleServiceActive(s.id, !s.isActive)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {s.isActive ? '启用' : '停用'}
                      </button>
                      <button
                        onClick={() =>
                          setEditServiceTarget({
                            id: s.id,
                            name: s.name,
                            nameZh: s.nameZh,
                            description: s.description ?? null,
                            descriptionZh: s.descriptionZh ?? null,
                            isActive: s.isActive,
                          })
                        }
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        编辑 / Edit
                      </button>
                      <button
                        onClick={() => hasClaimsCount === 0 && deleteService(s.id)}
                        disabled={hasClaimsCount > 0}
                        title={hasClaimsCount > 0 ? '此服务已有申请记录，无法删除 / Cannot delete service with existing claims' : undefined}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                )
              })}
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
                <label className="mb-1 block text-xs font-medium text-gray-700">中文名称 *</label>
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
                <label className="mb-1 block text-xs font-medium text-gray-700">中文描述</label>
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
                  {savingService ? '保存中…' : '添加服务 / Add Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────── Modals ────────── */}

      {/* Add Deposit */}
      {addDepositOpen && (
        <AddDepositModal
          academicYear={academicYear}
          families={families}
          existingFamilyIds={existingFamilyIds}
          onClose={() => setAddDepositOpen(false)}
          onSuccess={(msg) => { setAddDepositOpen(false); refreshAndToast(msg) }}
        />
      )}

      {/* Edit Deposit */}
      {editDepositTarget && (
        <EditDepositModal
          deposit={editDepositTarget}
          onClose={() => setEditDepositTarget(null)}
          onSuccess={(msg) => { setEditDepositTarget(null); refreshAndToast(msg) }}
        />
      )}

      {/* Add Claim */}
      {addClaimOpen && (
        <AddClaimModal
          academicYear={academicYear}
          familiesWithDeposits={familiesWithDeposits}
          services={services.filter((s) => s.isActive)}
          onClose={() => setAddClaimOpen(false)}
          onSuccess={(msg) => { setAddClaimOpen(false); refreshAndToast(msg) }}
        />
      )}

      {/* Edit Claim */}
      {editClaimTarget && (
        <EditClaimModal
          claim={editClaimTarget}
          services={services}
          onClose={() => setEditClaimTarget(null)}
          onSuccess={(msg) => { setEditClaimTarget(null); refreshAndToast(msg) }}
        />
      )}

      {/* Edit Service */}
      {editServiceTarget && (
        <EditServiceModal
          service={editServiceTarget}
          onClose={() => setEditServiceTarget(null)}
          onSuccess={(updated) => {
            setEditServiceTarget(null)
            setServices((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            )
            showToast('服务项目已更新 / Service updated')
          }}
        />
      )}

      {/* Reject Claim Modal */}
      {rejectClaimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-gray-900">拒绝申请 / Reject Claim</h3>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              拒绝原因 <span className="text-red-500">*</span>
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

      {/* Delete Deposit Confirmation */}
      {deleteDepositTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-semibold text-gray-900">删除押金记录 / Delete Deposit</h3>
            <p className="mb-4 text-sm text-gray-600">
              确认删除{' '}
              <strong>{deleteDepositTarget.family.users[0]?.name ?? '该家庭'}</strong>{' '}
              的押金记录？关联的待审核和已拒绝申请也将一并删除。
              <br />
              <span className="text-xs text-gray-400">
                Confirm delete? Associated pending/rejected claims will also be removed.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteDepositTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                取消 / Cancel
              </button>
              <button
                onClick={deleteDeposit}
                disabled={deletingDeposit}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingDeposit ? '删除中…' : '确认删除 / Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Claim Confirmation */}
      {deleteClaimTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-semibold text-gray-900">删除申请记录 / Delete Claim</h3>
            {deleteClaimTarget.status === 'APPROVED' && deleteClaimTarget.deposit.status === 'CLAIM_APPROVED' && (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠️ 删除此申请将同时将押金状态重置为已付款。
                <br />
                <span className="text-xs text-amber-700">
                  Deleting this claim will reset the deposit status back to PAID.
                </span>
              </div>
            )}
            <p className="mb-4 text-sm text-gray-600">
              确认删除此申请记录？此操作不可撤销。
              <br />
              <span className="text-xs text-gray-400">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteClaimTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                取消 / Cancel
              </button>
              <button
                onClick={deleteClaim}
                disabled={deletingClaim}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingClaim ? '删除中…' : '确认删除 / Confirm'}
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
              确认向此家庭退还押金？退款将自动退回至原支付方式。
            </p>
            <p className="mb-4 text-xs text-gray-500">
              Confirm refund to this family? The refund will be returned to the original payment method. 5-10 business days for credit card, 3-5 for PayPal.
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
                    处理中…
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
              This will forfeit {selectedDepositIds.length} deposit(s). Cannot be undone.
            </p>
            <label className="mb-1 block text-sm font-medium text-gray-700">原因（可选）/ Reason</label>
            <input
              value={forfeitReason}
              onChange={(e) => setForfeitReason(e.target.value)}
              placeholder="没收原因…"
              className="mb-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <label className="mb-1 block text-sm font-medium text-gray-700">
              输入 <strong>FORFEIT</strong> 确认 / Type <strong>FORFEIT</strong>
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
