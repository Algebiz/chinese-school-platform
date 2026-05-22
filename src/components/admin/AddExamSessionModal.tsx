'use client'

import { useState } from 'react'
import type { ExamSessionRow } from '@/app/(admin)/admin/exams/AdminExamsClient'

interface Props {
  academicYear: string
  onClose: () => void
  onSuccess: (session: ExamSessionRow) => void
}

const YCT_LEVELS = [1, 2, 3, 4]
const HSK_LEVELS = [1, 2, 3, 4, 5, 6]

export function AddExamSessionModal({ academicYear, onClose, onSuccess }: Props) {
  const [examType, setExamType] = useState<'YCT' | 'HSK'>('YCT')
  const [level, setLevel] = useState('1')
  const [examDate, setExamDate] = useState('')
  const [registrationDeadline, setRegistrationDeadline] = useState('')
  const [locationEn, setLocationEn] = useState('')
  const [locationZh, setLocationZh] = useState('')
  const [fee, setFee] = useState('')
  const [capacity, setCapacity] = useState('30')
  const [notes, setNotes] = useState('')
  const [notesZh, setNotesZh] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const levelOptions = examType === 'YCT' ? YCT_LEVELS : HSK_LEVELS

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!examDate) errs.examDate = '请选择考试日期 / Please select exam date'
    if (!registrationDeadline) {
      errs.registrationDeadline = '请选择报名截止日期 / Please select deadline'
    } else if (examDate && new Date(registrationDeadline) >= new Date(examDate)) {
      errs.registrationDeadline = '报名截止日期必须早于考试日期 / Deadline must be before exam date'
    }
    if (!locationEn.trim()) errs.locationEn = '请填写地点 / Please enter location'
    if (!locationZh.trim()) errs.locationZh = '请填写地点（中文）/ Please enter location in Chinese'
    if (!fee || isNaN(parseFloat(fee)) || parseFloat(fee) < 0)
      errs.fee = '费用不能为负数 / Fee cannot be negative'
    if (!capacity || parseInt(capacity) < 1)
      errs.capacity = '名额至少为1 / Capacity must be at least 1'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    setErrors({})
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType,
          level: parseInt(level),
          examDate: new Date(examDate).toISOString(),
          registrationDeadline: new Date(registrationDeadline + 'T23:59:59').toISOString(),
          location: locationEn.trim(),
          locationZh: locationZh.trim(),
          fee: parseFloat(fee),
          capacity: parseInt(capacity),
          academicYear,
          isActive: true,
          notes: notes.trim() || undefined,
          notesZh: notesZh.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setErrors({ _general: json.error ?? '创建失败 / Failed to create' })
        return
      }
      onSuccess({
        id: json.data.id,
        examType,
        level: parseInt(level),
        examDate: new Date(examDate).toISOString(),
        registrationDeadline: new Date(registrationDeadline + 'T23:59:59').toISOString(),
        locationEn: locationEn.trim(),
        locationZh: locationZh.trim(),
        fee: parseFloat(fee).toFixed(2),
        capacity: parseInt(capacity),
        registeredCount: 0,
        spotsRemaining: parseInt(capacity),
        academicYear,
        isActive: true,
        notes: notes.trim() || null,
        notesZh: notesZh.trim() || null,
      })
      onClose()
    } catch {
      setErrors({ _general: '网络错误，请重试 / Network error, please retry' })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = (field: string) =>
    `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">添加考试场次 / Add Exam Session</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {errors._general && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{errors._general}</p>
          )}

          {/* Exam type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              考试类型 / Exam Type *
            </label>
            <div className="flex gap-6">
              {(['YCT', 'HSK'] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="examType"
                    value={t}
                    checked={examType === t}
                    onChange={() => { setExamType(t); setLevel('1') }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">级别 / Level *</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {levelOptions.map((l) => (
                <option key={l} value={String(l)}>
                  {examType} Level {l}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                考试日期 / Exam Date *
              </label>
              <input
                type="datetime-local"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={inputCls('examDate')}
              />
              {errors.examDate && (
                <p className="mt-1 text-xs text-red-600">{errors.examDate}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                报名截止 / Deadline *
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className={inputCls('registrationDeadline')}
              />
              {errors.registrationDeadline && (
                <p className="mt-1 text-xs text-red-600">{errors.registrationDeadline}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Location (English) *
            </label>
            <input
              type="text"
              value={locationEn}
              onChange={(e) => setLocationEn(e.target.value)}
              placeholder="e.g. Charlotte Chinese Academy — Room 101"
              className={inputCls('locationEn')}
            />
            {errors.locationEn && (
              <p className="mt-1 text-xs text-red-600">{errors.locationEn}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">地点 (中文) *</label>
            <input
              type="text"
              value={locationZh}
              onChange={(e) => setLocationZh(e.target.value)}
              placeholder="例：夏洛特中文学校 — 101教室"
              className={inputCls('locationZh')}
            />
            {errors.locationZh && (
              <p className="mt-1 text-xs text-red-600">{errors.locationZh}</p>
            )}
          </div>

          {/* Fee, Capacity, Year */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">费用 / Fee ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="25.00"
                className={inputCls('fee')}
              />
              {errors.fee && <p className="mt-1 text-xs text-red-600">{errors.fee}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">名额 / Capacity *</label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputCls('capacity')}
              />
              {errors.capacity && <p className="mt-1 text-xs text-red-600">{errors.capacity}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">学年 / Year</label>
              <input
                type="text"
                value={academicYear}
                readOnly
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes (English) <span className="text-gray-400 font-normal">optional</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for parents..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              备注 (中文) <span className="text-gray-400 font-normal">可选</span>
            </label>
            <textarea
              rows={2}
              value={notesZh}
              onChange={(e) => setNotesZh(e.target.value)}
              placeholder="可选备注..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消 / Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : '添加 / Add Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
