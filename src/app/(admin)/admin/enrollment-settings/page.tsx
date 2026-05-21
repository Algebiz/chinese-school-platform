'use client'

import { useState, useEffect } from 'react'

interface Config {
  id: string
  academicYear: string
  nextYear: string
  reEnrollmentOpenDate: string
  newEnrollmentOpenDate: string
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

      <style>{`.input { display:block;width:100%;border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;font-size:14px;outline:none; } .input:focus{border-color:#dc2626;box-shadow:0 0 0 1px #dc2626;}`}</style>
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
