'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface TeacherOption {
  id: string
  name: string
  nameEn: string | null
}

interface Props {
  teachers: TeacherOption[]
  onClose: () => void
  onSuccess: (msg: string) => void
}

export function AddClassModal({ teachers, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [nameEn, setNameEn] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'CHINESE' | 'ARTS'>('CHINESE')
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? '')
  const [year, setYear] = useState('2025-2026')
  const [dayOfWeek, setDayOfWeek] = useState('Sunday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:50')
  const [capacity, setCapacity] = useState(20)
  const [fee, setFee] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionZh, setDescriptionZh] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!nameEn.trim() || !name.trim() || !teacherId || !fee) {
      setError('Please fill in all required fields (*).')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: nameEn.trim(),
          name: name.trim(),
          type,
          teacherId,
          year,
          schedule: { dayOfWeek, startTime, endTime },
          capacity,
          fee: parseFloat(fee),
          description: description.trim() || null,
          descriptionZh: descriptionZh.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? 'Failed to create class'); return }
      router.refresh()
      onSuccess('班级已创建 / Class created successfully')
      onClose()
    } catch {
      setError('Network error, please retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="font-semibold text-gray-900">添加班级 / Add Class</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">English Name *</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. CHL Level 1A"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">中文名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：中文母语一班A"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Class Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'CHINESE' | 'ARTS')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="CHINESE">CHINESE — 中文班</option>
                <option value="ARTS">ARTS — 才艺班</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Teacher / 老师 *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.nameEn ? ` (${t.nameEn})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Academic Year *</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Capacity *</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fee ($) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="500.00"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Schedule / 时间</label>
            <div className="flex gap-3">
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span className="self-center text-gray-400">–</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description (English)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ages 6–7, beginner level..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">简介（中文）</label>
            <textarea
              value={descriptionZh}
              onChange={(e) => setDescriptionZh(e.target.value)}
              rows={2}
              placeholder="6–7岁，初级班..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 shrink-0">
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
            {saving ? '保存中…' : '添加班级 / Add Class'}
          </button>
        </div>
      </div>
    </div>
  )
}
