'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface TextbookRow {
  id: string
  name: string
  nameZh: string
  description: string | null
  descriptionZh: string | null
  price: string
  isActive: boolean
}

interface Props {
  classId: string
  initialTextbooks: TextbookRow[]
}

const emptyForm = { name: '', nameZh: '', description: '', price: '' }

export function TextbookManager({ classId, initialTextbooks }: Props) {
  const router = useRouter()
  const [textbooks, setTextbooks] = useState<TextbookRow[]>(initialTextbooks)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdd() { setForm(emptyForm); setEditId(null); setShowAdd(true); setError(null) }
  function openEdit(tb: TextbookRow) {
    setForm({ name: tb.name, nameZh: tb.nameZh, description: tb.description ?? '', price: tb.price })
    setEditId(tb.id)
    setShowAdd(true)
    setError(null)
  }
  function closeModal() { setShowAdd(false); setEditId(null); setError(null) }

  async function handleSave() {
    if (!form.name.trim() || !form.nameZh.trim() || !form.price) {
      setError('请填写所有必填字段 / Please fill all required fields')
      return
    }
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) { setError('价格无效 / Invalid price'); return }

    setSaving(true)
    setError(null)
    try {
      const url = editId
        ? `/api/admin/classes/${classId}/textbooks/${editId}`
        : `/api/admin/classes/${classId}/textbooks`
      const res = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, nameZh: form.nameZh, description: form.description || undefined, price }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? '保存失败'); return }
      closeModal()
      router.refresh()
      // Optimistic update
      if (editId) {
        setTextbooks(prev => prev.map(t => t.id === editId ? { ...t, name: form.name, nameZh: form.nameZh, price: String(price) } : t))
      } else {
        setTextbooks(prev => [...prev, { id: json.data.id, name: form.name, nameZh: form.nameZh, description: form.description || null, descriptionZh: null, price: String(price), isActive: true }])
      }
    } catch {
      setError('网络错误 / Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认停用此教材？/ Deactivate this textbook?')) return
    const res = await fetch(`/api/admin/classes/${classId}/textbooks/${id}`, { method: 'DELETE' })
    if ((await res.json()).success) {
      setTextbooks(prev => prev.filter(t => t.id !== id))
      router.refresh()
    }
  }

  const activeBooks = textbooks.filter(t => t.isActive)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">教材管理 / Textbooks</h2>
        <button
          onClick={openAdd}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          + 添加教材 / Add Textbook
        </button>
      </div>

      {activeBooks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
          暂无教材 / No textbooks added yet
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">教材名称 / Name</th>
                <th className="px-4 py-3">中文名</th>
                <th className="px-4 py-3 text-right">价格 / Price</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeBooks.map((tb) => (
                <tr key={tb.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tb.name}</td>
                  <td className="px-4 py-3 text-gray-500">{tb.nameZh}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ${parseFloat(tb.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(tb)} className="mr-3 text-xs font-medium text-blue-600 hover:text-blue-700">编辑</button>
                    <button onClick={() => handleDelete(tb.id)} className="text-xs font-medium text-red-500 hover:text-red-700">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              {editId ? '编辑教材 / Edit Textbook' : '添加教材 / Add Textbook'}
            </h3>
            {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">英文名称 / English Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">中文名称 / Chinese Name *</label>
                <input value={form.nameZh} onChange={e => setForm(f => ({ ...f, nameZh: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">描述 / Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">价格 / Price (USD) *</label>
                <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={closeModal} className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                取消 / Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? '保存中…' : '保存 / Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
