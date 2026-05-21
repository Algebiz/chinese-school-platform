'use client'

import { useState, useEffect } from 'react'

interface Settings {
  schoolNameZh: string
  schoolNameEn: string
  contactEmail: string
  contactPhone: string
}

export default function SuperAdminSettingsPage() {
  const [form, setForm] = useState<Settings>({
    schoolNameZh: '夏洛特中文学校',
    schoolNameEn: 'Charlotte Chinese Academy',
    contactEmail: '',
    contactPhone: '',
  })
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Danger zone state
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState<number | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/super-admin/settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setForm(json.data)
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) setError(json.error ?? '保存失败')
      else setSaved(true)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (confirmText !== 'CONFIRM') return
    setResetting(true)
    setResetError(null)
    try {
      const res = await fetch('/api/super-admin/settings', {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) setResetError(json.error ?? '重置失败')
      else { setResetDone(json.data.deleted); setConfirmText('') }
    } catch {
      setResetError('网络错误，请重试')
    } finally {
      setResetting(false)
    }
  }

  if (fetching) return <div className="text-sm text-gray-400 py-8 text-center">加载中…</div>

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置 / System Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage school information and system configuration</p>
      </div>

      {/* School info form */}
      <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">学校信息 / School Information</h2>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {saved && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">保存成功 / Saved successfully</div>}

        <Field label="学校名称（中文）/ School Name (Chinese)">
          <input
            value={form.schoolNameZh}
            onChange={(e) => setForm((f) => ({ ...f, schoolNameZh: e.target.value }))}
            className="input" required
          />
        </Field>
        <Field label="学校名称（英文）/ School Name (English)">
          <input
            value={form.schoolNameEn}
            onChange={(e) => setForm((f) => ({ ...f, schoolNameEn: e.target.value }))}
            className="input" required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="联系邮箱 / Contact Email">
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              className="input" placeholder="info@school.com"
            />
          </Field>
          <Field label="联系电话 / Contact Phone">
            <input
              value={form.contactPhone}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              className="input" placeholder="(XXX) XXX-XXXX"
            />
          </Field>
        </div>
        <div className="border-t border-gray-100 pt-4">
          <button type="submit" disabled={saving}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {saving ? '保存中…' : '保存设置 / Save'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
        <h2 className="text-base font-semibold text-red-800">危险操作 / Danger Zone</h2>
        <p className="mt-1 text-sm text-red-700">These actions are irreversible. Proceed with extreme caution.</p>

        <div className="mt-5 rounded-lg border border-red-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">清除待处理报名数据 / Reset Pending Enrollments</h3>
          <p className="mt-1 text-xs text-gray-500">
            删除所有 PENDING 状态的报名记录（已确认的 CONFIRMED 记录保留）。
            <br />Deletes all PENDING enrollments only. CONFIRMED records are preserved.
          </p>
          {resetDone !== null && (
            <div className="mt-3 rounded-md bg-green-50 p-2 text-xs text-green-700">
              已删除 {resetDone} 条 PENDING 报名记录 / {resetDone} pending enrollments deleted.
            </div>
          )}
          {resetError && <p className="mt-2 text-xs text-red-600">{resetError}</p>}
          <div className="mt-3 flex items-center gap-3">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='输入 "CONFIRM" 确认 / Type "CONFIRM" to proceed'
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <button
              onClick={handleReset}
              disabled={confirmText !== 'CONFIRM' || resetting}
              className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resetting ? '处理中…' : '确认清除 / Reset'}
            </button>
          </div>
        </div>
      </div>

      <style>{`.input{display:block;width:100%;border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;font-size:14px;outline:none;}.input:focus{border-color:#dc2626;box-shadow:0 0 0 1px #dc2626;}`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
