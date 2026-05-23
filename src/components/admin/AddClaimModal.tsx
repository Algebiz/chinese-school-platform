'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

interface FamilyWithDeposit {
  id: string
  depositId: string
  parentName: string | null
  parentEmail: string
}

interface Service {
  id: string
  name: string
  nameZh: string
}

type ClaimStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

interface Props {
  academicYear: string
  familiesWithDeposits: FamilyWithDeposit[]
  services: Service[]
  onClose: () => void
  onSuccess: (msg: string) => void
}

export function AddClaimModal({ academicYear, familiesWithDeposits, services, onClose, onSuccess }: Props) {
  const [familySearch, setFamilySearch] = useState('')
  const [selectedFamilyId, setSelectedFamilyId] = useState('')
  const [selectedDepositId, setSelectedDepositId] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [status, setStatus] = useState<ClaimStatus>('PENDING_REVIEW')
  const [adminNotes, setAdminNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredFamilies = useMemo(() => {
    const q = familySearch.trim().toLowerCase()
    if (!q) return familiesWithDeposits.slice(0, 30)
    return familiesWithDeposits
      .filter(
        (f) =>
          (f.parentName?.toLowerCase().includes(q) ?? false) ||
          f.parentEmail.toLowerCase().includes(q)
      )
      .slice(0, 30)
  }, [familiesWithDeposits, familySearch])

  const selectedFamily = familiesWithDeposits.find((f) => f.id === selectedFamilyId)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectFamily(f: FamilyWithDeposit) {
    setSelectedFamilyId(f.id)
    setSelectedDepositId(f.depositId)
    setFamilySearch(f.parentName ?? f.parentEmail)
    setShowDropdown(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFamilyId || !selectedDepositId) {
      setError('请选择家庭 / Please select a family')
      return
    }
    if (!serviceId) {
      setError('请选择服务项目 / Please select a service')
      return
    }
    if (!description.trim()) {
      setError('请填写服务描述 / Please enter a description')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/volunteer/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: selectedDepositId,
          familyId: selectedFamilyId,
          serviceId,
          description: description.trim(),
          photoUrl: photoUrl.trim() || null,
          status,
          adminNotes: adminNotes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败 / Operation failed')
        return
      }
      onSuccess('申请记录已添加 / Claim record added')
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
          <h2 className="font-semibold text-gray-900">添加申请记录 / Add Claim</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {familiesWithDeposits.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              暂无处于已支付状态的押金家庭。
              <br />
              <span className="text-xs text-amber-700">No families with a PAID deposit found.</span>
            </div>
          )}

          {/* Family search */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              家庭 / Family <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-400">（仅显示已支付押金的家庭）</span>
            </label>
            <input
              type="text"
              value={familySearch}
              onChange={(e) => {
                setFamilySearch(e.target.value)
                setSelectedFamilyId('')
                setSelectedDepositId('')
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="搜索家长姓名或邮箱 / Search"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {showDropdown && filteredFamilies.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {filteredFamilies.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onMouseDown={() => selectFamily(f)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-900">{f.parentName ?? '—'}</span>
                    <span className="text-xs text-gray-500">{f.parentEmail}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedFamily && (
              <p className="mt-1 text-xs text-green-600">
                ✓ {selectedFamily.parentName ?? '—'} ({selectedFamily.parentEmail})
              </p>
            )}
          </div>

          {/* Service */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              服务项目 / Volunteer Service <span className="text-red-500">*</span>
            </label>
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
              placeholder="描述志愿服务内容 / Describe the volunteer service"
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              状态 / Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClaimStatus)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="PENDING_REVIEW">待审核 / Pending Review</option>
              <option value="APPROVED">已批准 / Approved</option>
              <option value="REJECTED">已拒绝 / Rejected</option>
            </select>
          </div>

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
            disabled={loading || !selectedFamilyId || familiesWithDeposits.length === 0}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : '添加 / Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
