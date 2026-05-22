'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface FamilyOption {
  familyId: string
  parentName: string | null
  email: string
  studentCount: number
}

interface Props {
  onClose: () => void
  onSuccess: (message: string) => void
}

const GENDER_OPTIONS = [
  { value: '', label: '— 不填写 / Not specified —' },
  { value: 'MALE', label: '男 / Male' },
  { value: 'FEMALE', label: '女 / Female' },
  { value: 'OTHER', label: '其他 / Other' },
]

export function AddStudentModal({ onClose, onSuccess }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [grade, setGrade] = useState('')
  const [notes, setNotes] = useState('')

  // Family search
  const [familySearch, setFamilySearch] = useState('')
  const [familyResults, setFamilyResults] = useState<FamilyOption[]>([])
  const [selectedFamily, setSelectedFamily] = useState<FamilyOption | null>(null)
  const [familyLoading, setFamilyLoading] = useState(false)
  const [showFamilyDropdown, setShowFamilyDropdown] = useState(false)
  const familyRef = useRef<HTMLDivElement>(null)

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Debounced family search
  useEffect(() => {
    if (!showFamilyDropdown) return
    const timer = setTimeout(async () => {
      setFamilyLoading(true)
      try {
        const res = await fetch(
          `/api/admin/families?search=${encodeURIComponent(familySearch)}`
        )
        const json = await res.json()
        if (json.success) setFamilyResults(json.data)
      } finally {
        setFamilyLoading(false)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [familySearch, showFamilyDropdown])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (familyRef.current && !familyRef.current.contains(e.target as Node)) {
        setShowFamilyDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = '请填写中文姓名 / Chinese name is required'
    if (!nameEn.trim()) errs.nameEn = '请填写英文姓名 / English name is required'
    if (!birthDate) errs.birthDate = '请选择出生日期 / Date of birth is required'
    if (!selectedFamily) errs.family = '请选择家庭账号 / Please select a family account'
    return errs
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    setErrors({})
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameEn: nameEn.trim(),
          birthDate,
          gender: gender || null,
          grade: grade.trim() || null,
          notes: notes.trim() || null,
          familyId: selectedFamily!.familyId,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setErrors({ _general: json.error ?? '创建失败 / Failed to create' })
        return
      }
      router.refresh()
      onSuccess('学生已添加 / Student added successfully')
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
          <h2 className="font-semibold text-gray-900">添加学生 / Add Student</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          {errors._general && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{errors._general}</p>
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
                placeholder="例：张小明"
                className={inputCls('name')}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                英文姓名 *
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Xiaoming Zhang"
                className={inputCls('nameEn')}
              />
              {errors.nameEn && <p className="mt-1 text-xs text-red-600">{errors.nameEn}</p>}
            </div>
          </div>

          {/* DOB + Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                出生日期 / Date of Birth *
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputCls('birthDate')}
              />
              {errors.birthDate && (
                <p className="mt-1 text-xs text-red-600">{errors.birthDate}</p>
              )}
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

          {/* Family search */}
          <div ref={familyRef}>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              家庭账号 / Family Account *
            </label>
            {selectedFamily ? (
              <div className="flex items-center justify-between rounded-md border border-green-300 bg-green-50 px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-gray-800">
                    {selectedFamily.parentName ?? '(no name)'}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">{selectedFamily.email}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {selectedFamily.studentCount} student{selectedFamily.studentCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedFamily(null); setFamilySearch('') }}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  onFocus={() => setShowFamilyDropdown(true)}
                  placeholder="搜索家长姓名或邮箱 / Search by parent name or email"
                  className={inputCls('family')}
                />
                {showFamilyDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                    {familyLoading ? (
                      <div className="px-3 py-2 text-sm text-gray-400">搜索中…</div>
                    ) : familyResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-400">
                        {familySearch ? '未找到匹配的家庭账号 / No matching families' : '输入搜索词 / Type to search'}
                      </div>
                    ) : (
                      <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {familyResults.map((f) => (
                          <li key={f.familyId}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFamily(f)
                                setShowFamilyDropdown(false)
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                            >
                              <div>
                                <span className="text-sm font-medium text-gray-800">
                                  {f.parentName ?? '(no name)'}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">{f.email}</span>
                              </div>
                              <span className="text-xs text-gray-400">
                                {f.studentCount} student{f.studentCount !== 1 ? 's' : ''}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.family && (
              <p className="mt-1 text-xs text-red-600">{errors.family}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              备注 / Notes{' '}
              <span className="font-normal text-gray-400">optional</span>
            </label>
            <textarea
              rows={2}
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
            {saving ? '保存中…' : '添加学生 / Add Student'}
          </button>
        </div>
      </div>
    </div>
  )
}
