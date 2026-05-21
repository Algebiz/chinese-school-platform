'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface TeacherForEdit {
  id: string
  name: string
  nameEn: string | null
  bioEn: string | null
  bioZh: string | null
  photoUrl: string | null
}

interface Props {
  teacher: TeacherForEdit
  onClose: () => void
}

export function EditTeacherModal({ teacher, onClose }: Props) {
  const router = useRouter()
  const [nameEn, setNameEn] = useState(teacher.nameEn ?? '')
  const [photoUrl, setPhotoUrl] = useState(teacher.photoUrl ?? '')
  const [bioEn, setBioEn] = useState(teacher.bioEn ?? '')
  const [bioZh, setBioZh] = useState(teacher.bioZh ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn, bioEn, bioZh, photoUrl }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Save failed')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Network error, please retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">编辑教师 / Edit Teacher</h2>
            <p className="text-sm text-gray-500">{teacher.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* English name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              English Name
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Xue Li"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Photo URL + preview */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Photo URL
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="preview"
                  className="h-10 w-10 rounded-full object-cover border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>
          </div>

          {/* Bio English */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bio (English)
            </label>
            <textarea
              value={bioEn}
              onChange={(e) => setBioEn(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Bio Chinese */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              简介（中文）
            </label>
            <textarea
              value={bioZh}
              onChange={(e) => setBioZh(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
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
