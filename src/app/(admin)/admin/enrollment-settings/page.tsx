'use client'

import { useState, useEffect } from 'react'

interface Config {
  id: string
  academicYear: string
  nextYear: string
  reEnrollmentOpenDate: string
  newEnrollmentOpenDate: string
  volunteerDepositAmount?: string | number | null
  volunteerClaimDeadline?: string | null
  volunteerDepositRequired?: boolean
  earlyBirdEnabled?: boolean
  earlyBirdDiscount?: string | number | null
  earlyBirdDeadline?: string | null
}

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

export default function EnrollmentSettingsPage() {
  const [form, setForm] = useState({
    academicYear: '2025-2026',
    nextYear: '2026-2027',
    reEnrollmentOpenDate: '',
    newEnrollmentOpenDate: '',
    volunteerDepositAmount: '100',
    volunteerClaimDeadline: '',
    volunteerDepositRequired: true,
    earlyBirdEnabled: false,
    earlyBirdDiscount: '',
    earlyBirdDeadline: '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/enrollment-settings')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const d: Config = json.data
          setForm({
            academicYear: d.academicYear,
            nextYear: d.nextYear,
            reEnrollmentOpenDate: toDatetimeLocal(d.reEnrollmentOpenDate),
            newEnrollmentOpenDate: toDatetimeLocal(d.newEnrollmentOpenDate),
            volunteerDepositAmount: d.volunteerDepositAmount != null ? String(d.volunteerDepositAmount) : '100',
            volunteerClaimDeadline: toDatetimeLocal(d.volunteerClaimDeadline),
            volunteerDepositRequired: d.volunteerDepositRequired ?? true,
            earlyBirdEnabled: d.earlyBirdEnabled ?? false,
            earlyBirdDiscount: d.earlyBirdDiscount != null ? String(d.earlyBirdDiscount) : '',
            earlyBirdDeadline: toDatetimeLocal(d.earlyBirdDeadline),
          })
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/admin/enrollment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: form.academicYear,
          nextYear: form.nextYear,
          reEnrollmentOpenDate: new Date(form.reEnrollmentOpenDate).toISOString(),
          newEnrollmentOpenDate: new Date(form.newEnrollmentOpenDate).toISOString(),
          volunteerDepositAmount: form.volunteerDepositAmount ? parseFloat(form.volunteerDepositAmount) : undefined,
          volunteerClaimDeadline: form.volunteerClaimDeadline ? new Date(form.volunteerClaimDeadline).toISOString() : undefined,
          volunteerDepositRequired: form.volunteerDepositRequired,
          earlyBirdEnabled: form.earlyBirdEnabled,
          earlyBirdDiscount: form.earlyBirdDiscount ? parseFloat(form.earlyBirdDiscount) : 0,
          earlyBirdDeadline: form.earlyBirdDeadline ? new Date(form.earlyBirdDeadline).toISOString() : null,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '保存失败，请重试')
      } else {
        setSaved(true)
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="text-sm text-gray-400 py-8 text-center">加载中…</div>
  }

  const ebDeadlineFmt = form.earlyBirdDeadline
    ? new Date(form.earlyBirdDeadline).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const ebDiscount = parseFloat(form.earlyBirdDiscount || '0')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">注册窗口设置</h1>
        <p className="mt-1 text-sm text-gray-500">Enrollment Settings — configure open dates for the upcoming academic year</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {saved && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            设置已保存 / Settings saved successfully.
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="当前学年 / Current Academic Year" hint="e.g. 2025-2026">
            <input
              required
              value={form.academicYear}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              placeholder="2025-2026"
              className="input"
            />
          </Field>
          <Field label="新学年 / Next Academic Year" hint="e.g. 2026-2027">
            <input
              required
              value={form.nextYear}
              onChange={(e) => setForm((f) => ({ ...f, nextYear: e.target.value }))}
              placeholder="2026-2027"
              className="input"
            />
          </Field>
        </div>

        <Field
          label="老生优先报名开放时间 / Returning Student Enrollment Opens"
          hint="Returning students (enrolled last year) can register from this date"
        >
          <input
            required
            type="datetime-local"
            value={form.reEnrollmentOpenDate}
            onChange={(e) => setForm((f) => ({ ...f, reEnrollmentOpenDate: e.target.value }))}
            className="input"
          />
        </Field>

        <Field
          label="新生报名开放时间 / New Student Enrollment Opens"
          hint="All students (including new) can register from this date"
        >
          <input
            required
            type="datetime-local"
            value={form.newEnrollmentOpenDate}
            onChange={(e) => setForm((f) => ({ ...f, newEnrollmentOpenDate: e.target.value }))}
            className="input"
          />
        </Field>

        {/* Volunteer settings */}
        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-semibold mb-4 text-gray-900">志愿服务设置 / Volunteer Settings</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="押金金额 / Deposit Amount" hint="Default: $100. Leave blank to use default.">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.volunteerDepositAmount}
                onChange={(e) => setForm((f) => ({ ...f, volunteerDepositAmount: e.target.value }))}
                placeholder="100"
                className="input"
              />
            </Field>
            <Field label="申请截止日期 / Claim Deadline" hint="Optional. Families cannot submit claims after this date.">
              <input
                type="datetime-local"
                value={form.volunteerClaimDeadline}
                onChange={(e) => setForm((f) => ({ ...f, volunteerClaimDeadline: e.target.value }))}
                className="input"
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              id="depositRequired"
              type="checkbox"
              checked={form.volunteerDepositRequired}
              onChange={(e) => setForm((f) => ({ ...f, volunteerDepositRequired: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-red-600"
            />
            <label htmlFor="depositRequired" className="text-sm text-gray-700">
              启用志愿押金 / Enable volunteer deposit requirement
            </label>
          </div>
        </div>

        {/* Early bird settings */}
        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-base font-semibold mb-1 text-gray-900">早鸟优惠设置 / Early Bird Discount</h2>
          <p className="text-xs text-gray-400 mb-4">
            适用范围：中文母语班（CHL）+ 中文第二语言班（CSL）· Arts classes are never discounted
          </p>

          <div className="flex items-center gap-3 mb-5">
            <input
              id="earlyBirdEnabled"
              type="checkbox"
              checked={form.earlyBirdEnabled}
              onChange={(e) => setForm((f) => ({ ...f, earlyBirdEnabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-red-600"
            />
            <label htmlFor="earlyBirdEnabled" className="text-sm font-medium text-gray-700">
              启用早鸟优惠 / Enable Early Bird Discount
            </label>
          </div>

          {form.earlyBirdEnabled && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="优惠金额 / Discount Amount" hint="Deducted from each language class enrollment">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.earlyBirdDiscount}
                    onChange={(e) => setForm((f) => ({ ...f, earlyBirdDiscount: e.target.value }))}
                    placeholder="50"
                    className="input pl-7"
                  />
                </div>
              </Field>
              <Field label="截止日期 / Deadline" hint="Parents who enroll before this date receive the discount">
                <input
                  type="datetime-local"
                  value={form.earlyBirdDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, earlyBirdDeadline: e.target.value }))}
                  className="input"
                />
              </Field>
            </div>
          )}

          {/* Preview */}
          {form.earlyBirdEnabled && ebDiscount > 0 && ebDeadlineFmt && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                <span className="font-semibold">当前设置：</span>在 {ebDeadlineFmt} 前报名中文课可享受 <strong>${ebDiscount.toFixed(2)}</strong> 优惠
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Current: ${ebDiscount.toFixed(2)} off language class enrollments before {ebDeadlineFmt}
              </p>
            </div>
          )}

          {form.earlyBirdEnabled && (!ebDiscount || !form.earlyBirdDeadline) && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">请填写优惠金额和截止日期以激活早鸟优惠 / Enter both discount amount and deadline to activate</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : '保存设置 / Save Settings'}
          </button>
        </div>
      </form>

      <style>{`.input { display:block;width:100%;border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;font-size:14px;outline:none; } .input:focus{border-color:#dc2626;box-shadow:0 0 0 1px #dc2626;} .pl-7{padding-left:1.75rem;}`}</style>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="mb-1 text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}
