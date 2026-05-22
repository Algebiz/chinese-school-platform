'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

type Tab = 'sessions' | 'registrations'

const STATUS_BADGE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  PAID:            'bg-blue-100 text-blue-700',
  CONFIRMED:       'bg-green-100 text-green-700',
  REJECTED:        'bg-red-100 text-red-700',
  CANCELLED:       'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID:            '待确认',
  CONFIRMED:       '已确认',
  REJECTED:        '未通过',
  CANCELLED:       '已取消',
}

export interface ExamSessionRow {
  id: string
  examType: string
  level: number
  examDate: string
  registrationDeadline: string
  locationEn: string
  locationZh: string
  fee: string
  capacity: number
  registeredCount: number
  spotsRemaining: number
  academicYear: string
  isActive: boolean
  notes: string | null
  notesZh: string | null
}

export interface ExamRegistrationRow {
  id: string
  examType: string
  level: number
  examDate: string
  studentNameZh: string
  studentNameEn: string | null
  parentName: string | null
  parentEmail: string | null
  status: string
  paymentMethod: string | null
  amount: string | null
  paidAt: string | null
  confirmedAt: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  notes: string | null
  createdAt: string
}

interface Props {
  sessions: ExamSessionRow[]
  registrations: ExamRegistrationRow[]
  paidCount: number
}

function EditExamSessionModal({
  session,
  onClose,
  onSave,
}: {
  session: ExamSessionRow
  onClose: () => void
  onSave: (updated: ExamSessionRow) => void
}) {
  const toLocalDatetime = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const toLocalDate = (iso: string) => iso.slice(0, 10)

  const [form, setForm] = useState({
    examDate: toLocalDatetime(session.examDate),
    registrationDeadline: toLocalDate(session.registrationDeadline),
    locationEn: session.locationEn,
    locationZh: session.locationZh,
    fee: session.fee,
    capacity: String(session.capacity),
    notes: session.notes ?? '',
    notesZh: session.notesZh ?? '',
    isActive: session.isActive,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/exams/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: new Date(form.examDate).toISOString(),
          registrationDeadline: new Date(form.registrationDeadline + 'T23:59:59').toISOString(),
          location: form.locationEn,
          locationZh: form.locationZh,
          fee: form.fee,
          capacity: parseInt(form.capacity),
          notes: form.notes.trim() || null,
          notesZh: form.notesZh.trim() || null,
          isActive: form.isActive,
        }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '保存失败'); return }
      onSave({
        ...session,
        examDate: new Date(form.examDate).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline + 'T23:59:59').toISOString(),
        locationEn: form.locationEn,
        locationZh: form.locationZh,
        fee: parseFloat(form.fee).toFixed(2),
        capacity: parseInt(form.capacity),
        notes: form.notes.trim() || null,
        notesZh: form.notesZh.trim() || null,
        isActive: form.isActive,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-1">编辑考试场次 / Edit Exam Session</h3>
        <p className="text-sm text-gray-500 mb-4">
          {session.examType} Level {session.level} · {session.academicYear}
        </p>

        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                考试日期 / Exam Date
              </label>
              <input
                type="datetime-local"
                value={form.examDate}
                onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                报名截止 / Deadline
              </label>
              <input
                type="date"
                value={form.registrationDeadline}
                onChange={(e) => setForm((p) => ({ ...p, registrationDeadline: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Location (English)</label>
            <input
              type="text"
              value={form.locationEn}
              onChange={(e) => setForm((p) => ({ ...p, locationEn: e.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">地点 (中文)</label>
            <input
              type="text"
              value={form.locationZh}
              onChange={(e) => setForm((p) => ({ ...p, locationZh: e.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">费用 / Fee ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.fee}
                onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">名额 / Capacity</label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Notes (English)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">备注 (中文)</label>
            <textarea
              rows={2}
              value={form.notesZh}
              onChange={(e) => setForm((p) => ({ ...p, notesZh: e.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-isActive"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="edit-isActive" className="text-sm text-gray-700">
              开放报名 / Open for registration
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存 / Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminExamsClient({ sessions: initialSessions, registrations: initialRegistrations, paidCount }: Props) {
  const [tab, setTab] = useState<Tab>('sessions')
  const [sessions, setSessions] = useState(initialSessions)
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [filter, setFilter] = useState<string>('ALL')
  const [editSession, setEditSession] = useState<ExamSessionRow | null>(null)
  const [selectedReg, setSelectedReg] = useState<ExamRegistrationRow | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const filterOptions = ['ALL', 'PAID', 'CONFIRMED', 'REJECTED', 'PENDING_PAYMENT']
  const filtered = filter === 'ALL' ? registrations : registrations.filter((r) => r.status === filter)

  async function handleAction(registrationId: string, action: 'confirm' | 'reject', reason?: string) {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/exams/registrations/${registrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'confirm' ? { action: 'confirm' } : { action: 'reject', reason }),
      })
      const json = await res.json()
      if (!json.success) { setMessage(`操作失败: ${json.error}`); return }

      const newStatus = action === 'confirm' ? 'CONFIRMED' : 'REJECTED'
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === registrationId
            ? {
                ...r,
                status: newStatus,
                confirmedAt: action === 'confirm' ? new Date().toISOString() : null,
                rejectedAt: action === 'reject' ? new Date().toISOString() : null,
                rejectionReason: reason ?? null,
              }
            : r
        )
      )
      setSelectedReg(null)
      setShowRejectInput(false)
      setRejectReason('')
      setMessage(action === 'confirm' ? '已确认并发送邮件 ✓' : '已拒绝并发送邮件 ✓')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {([
          { id: 'sessions', label: '考试场次', en: 'Sessions' },
          {
            id: 'registrations',
            label: `报名管理${paidCount > 0 ? ` (${paidCount}待审)` : ''}`,
            en: 'Registrations',
          },
        ] as const).map(({ id, label, en }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label} <span className="text-xs text-gray-400">/ {en}</span>
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>
      )}

      {/* Sessions tab */}
      {tab === 'sessions' && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">考试 / Exam</th>
                <th className="px-4 py-3 text-left">日期 / Date</th>
                <th className="px-4 py-3 text-left">截止 / Deadline</th>
                <th className="px-4 py-3 text-left">报名人数</th>
                <th className="px-4 py-3 text-left">费用</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.examType} Level {s.level}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(s.examDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(s.registrationDeadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'text-sm',
                        s.spotsRemaining === 0 ? 'font-medium text-red-600' : 'text-gray-700'
                      )}
                    >
                      {s.registeredCount} / {s.capacity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">${parseFloat(s.fee).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {s.isActive ? '开放' : '关闭'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditSession(s)}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                    >
                      编辑 / Edit
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    暂无考试场次
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Registrations tab */}
      {tab === 'registrations' && (
        <div>
          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap gap-2">
            {filterOptions.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === f
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {f === 'ALL'
                  ? `全部 (${registrations.length})`
                  : `${STATUS_LABEL[f] ?? f} (${registrations.filter((r) => r.status === f).length})`}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">学生</th>
                  <th className="px-4 py-3 text-left">家长</th>
                  <th className="px-4 py-3 text-left">考试</th>
                  <th className="px-4 py-3 text-left">状态</th>
                  <th className="px-4 py-3 text-left">支付</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.studentNameZh}</div>
                      {r.studentNameEn && (
                        <div className="text-xs text-gray-400">{r.studentNameEn}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{r.parentName ?? '—'}</div>
                      {r.parentEmail && (
                        <div className="text-xs text-gray-400">{r.parentEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.examType} L{r.level}
                      <div className="text-xs text-gray-400">
                        {new Date(r.examDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_BADGE[r.status] ?? 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {r.amount ? `$${r.amount}` : '—'}
                      {r.paidAt && (
                        <div className="text-gray-400">{new Date(r.paidAt).toLocaleDateString()}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'PAID' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedReg(r); setShowRejectInput(false) }}
                            disabled={loading}
                            className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <span>✓</span>
                            <span>确认 / Confirm</span>
                          </button>
                          <button
                            onClick={() => { setSelectedReg(r); setShowRejectInput(true) }}
                            disabled={loading}
                            className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <span>✗</span>
                            <span>拒绝 / Reject</span>
                          </button>
                        </div>
                      ) : r.status === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-400">
                          <span>✓</span>
                          <span>已确认 / Confirmed</span>
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      暂无记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Action modal */}
          {selectedReg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="mb-1 font-semibold text-gray-900">
                  {showRejectInput
                    ? '拒绝报名 / Reject Registration'
                    : '确认报名 / Confirm Registration'}
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  {selectedReg.studentNameZh} — {selectedReg.examType} Level {selectedReg.level}
                </p>
                {showRejectInput ? (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      拒绝原因 / Reason *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                ) : (
                  <p className="mb-4 text-sm text-gray-500">确认后将向家长发送确认邮件。</p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedReg(null)
                      setShowRejectInput(false)
                      setRejectReason('')
                    }}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      if (showRejectInput) {
                        if (!rejectReason.trim()) return
                        handleAction(selectedReg.id, 'reject', rejectReason.trim())
                      } else {
                        handleAction(selectedReg.id, 'confirm')
                      }
                    }}
                    disabled={loading || (showRejectInput && !rejectReason.trim())}
                    className={clsx(
                      'rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50',
                      showRejectInput ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                    )}
                  >
                    {loading ? '处理中…' : showRejectInput ? '确认拒绝' : '确认报名'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit session modal */}
      {editSession && (
        <EditExamSessionModal
          session={editSession}
          onClose={() => setEditSession(null)}
          onSave={(updated) => {
            setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            setEditSession(null)
            setMessage('考试场次已更新 ✓')
            setTimeout(() => setMessage(null), 3000)
          }}
        />
      )}
    </div>
  )
}
