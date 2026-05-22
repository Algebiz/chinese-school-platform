'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TeacherOption } from './AddClassModal'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface EditableClass {
  id: string
  name: string
  nameEn: string | null
  type: 'CHINESE' | 'ARTS'
  teacherId: string | null
  capacity: number
  fee: string
  schedule: unknown
  description: string | null
  descriptionZh: string | null
  isActive: boolean
  enrolledCount: number
}

interface Props {
  cls: EditableClass
  teachers: TeacherOption[]
  onClose: () => void
  onSuccess: (msg: string) => void
}

export function EditClassModal({ cls, teachers, onClose, onSuccess }: Props) {
  const router = useRouter()
  const sched = cls.schedule as { dayOfWeek?: string; startTime?: string; endTime?: string } | null

  const [name, setName] = useState(cls.name)
  const [nameEn, setNameEn] = useState(cls.nameEn ?? '')
  const [type] = useState(cls.type)
  const [teacherId, setTeacherId] = useState(cls.teacherId ?? '')
  const [capacity, setCapacity] = useState(cls.capacity)
  const [fee, setFee] = useState(cls.fee)
  const [dayOfWeek, setDayOfWeek] = useState(sched?.dayOfWeek ?? 'Sunday')
  const [startTime, setStartTime] = useState(sched?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(sched?.endTime ?? '10:50')
  const [description, setDescription] = useState(cls.description ?? '')
  const [descriptionZh, setDescriptionZh] = useState(cls.descriptionZh ?? '')
  const [isActive, setIsActive] = useState(cls.isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teacherChanged = teacherId !== (cls.teacherId ?? '')
  const hasEnrollments = cls.enrolledCount > 0

  async function handleSave() {
    if (!name.trim() || !teacherId) {
      setError('Name and teacher are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/classes/${cls.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameEn: nameEn.trim() || null,
          teacherId: teacherId || null,
          capacity,
          fee: parseFloat(fee),
          schedule: { dayOfWeek, startTime, endTime },
          description: description.trim() || null,
          descriptionZh: descriptionZh.trim() || null,
          isActive,
        }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? 'Failed to update class'); return }
      router.refresh()
      onSuccess('班级已更新 / Class updated successfully')
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
          <div>
            <h2 className="font-semibold text-gray-900">编辑班级 / Edit Class</h2>
            <p className="text-sm text-gray-500">{cls.name}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">English Name</label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">中文名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teacher / 老师</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">— No teacher —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.nameEn ? ` (${t.nameEn})` : ''}
                </option>
              ))}
            </select>
            {teacherChanged && hasEnrollments && (
              <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                ⚠ 更换老师后，已注册学生将收到通知邮件。/ Enrolled students will be notified of the teacher change.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Capacity / 名额</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Fee ($) / 学费</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

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

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description (English)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">简介（中文）</label>
            <textarea
              value={descriptionZh}
              onChange={(e) => setDescriptionZh(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Active / 开放报名</label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">{isActive ? '开放 / Active' : '停用 / Inactive'}</span>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

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
            {saving ? '保存中…' : '保存 / Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
