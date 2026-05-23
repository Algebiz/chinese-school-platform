'use client'

import { useState } from 'react'

export interface ServiceForEdit {
  id: string
  name: string
  nameZh: string
  description: string | null
  descriptionZh: string | null
  isActive: boolean
}

interface Props {
  service: ServiceForEdit
  onClose: () => void
  onSuccess: (updated: ServiceForEdit) => void
}

export function EditServiceModal({ service, onClose, onSuccess }: Props) {
  const [name, setName] = useState(service.name)
  const [nameZh, setNameZh] = useState(service.nameZh)
  const [description, setDescription] = useState(service.description ?? '')
  const [descriptionZh, setDescriptionZh] = useState(service.descriptionZh ?? '')
  const [isActive, setIsActive] = useState(service.isActive)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !nameZh.trim()) {
      setError('中英文名称均为必填 / Both names are required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/volunteer/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nameZh: nameZh.trim(),
          description: description.trim() || null,
          descriptionZh: descriptionZh.trim() || null,
          isActive,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败 / Operation failed')
        return
      }
      onSuccess(json.data as ServiceForEdit)
    } catch {
      setError('网络错误，请重试 / Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">编辑服务项目 / Edit Service</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                中文名称 / Chinese Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={nameZh}
                onChange={(e) => setNameZh(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                English Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">中文描述 / Chinese Description</label>
              <input
                value={descriptionZh}
                onChange={(e) => setDescriptionZh(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">English Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            启用 / Active
          </label>

          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消 / Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? '保存中…' : '保存 / Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
