'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StudentData {
  studentId: string
  studentName: string
  studentNameEn: string | null
  birthDate: string | null
  gender: string | null
  grade: string | null
  notes: string | null
  familyId: string
  parentName: string | null
  parentEmail: string | null
}

interface Props {
  student: StudentData
  onClose: () => void
  onSuccess: (message: string) => void
}

const GENDER_OPTIONS = [
  { value: '', label: '— 不填写 / Not specified —' },
  { value: 'MALE', label: '男 / Male' },
  { value: 'FEMALE', label: '女 / Female' },
  { value: 'OTHER', label: '其他 / Other' },
]

export function EditStudentModal({ student, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [name, setName] = useState(student.studentName)
  const [nameEn, setNameEn] = useState(student.studentNameEn ?? '')
  const [birthDate, setBirthDate] = useState(
    student.birthDate ? student.birthDate.slice(0, 10) : ''
  )
  const [gender, setGender] = useState(student.gender ?? '')
  const [grade, setGrade] = useState(student.grade ?? '')
  const [notes, setNotes] = useState(student.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setError('中文姓名不能为空 / Chinese name is required'); return }
    if (!nameEn.trim()) { setError('英文姓名不能为空 / English name is required'); return }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/students/${student.studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameEn: nameEn.trim(),
          birthDate: birthDate || null,
          gender: gender || null,
          grade: grade.trim() || null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '保存失败 / Save failed'); return }
      router.refresh()
      onSuccess('学生信息已更新 / Student updated successfully')
    } catch {
      setError('网络错误，请重试 / Network error, please retry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">编辑学生信息 / Edit Student</h2>
            <p className="text-xs text-gray-400">{student.studentName}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                中文姓名 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                英文姓名 *
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                出生日期 / Date of Birth
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                性别 / Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              年级 / Grade Level
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. Grade 3 / 三年级"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Family (read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              家庭账号 / Family Account
              <span className="ml-1 font-normal text-gray-400">（不可更改）</span>
            </label>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <span className="font-medium text-gray-700">
                {student.parentName ?? '(no name)'}
              </span>
              {student.parentEmail && (
                <span className="ml-2 text-gray-500">{student.parentEmail}</span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              备注 / Notes{' '}
              <span className="font-normal text-gray-400">optional</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special needs or requirements..."
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
            {saving ? '保存中…' : '保存 / Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
