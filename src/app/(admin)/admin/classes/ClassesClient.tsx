'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AddClassModal, type TeacherOption } from '@/components/admin/AddClassModal'
import { Toast, useToast } from '@/components/ui/Toast'

export interface ClassRow {
  id: string
  name: string
  nameEn: string | null
  type: 'CHINESE' | 'ARTS'
  teacherName: string | null
  capacity: number
  enrolledCount: number
}

const TYPE_LABEL: Record<string, string> = {
  CHINESE: '中文班',
  ARTS: '才艺班',
}

interface Props {
  initialClasses: ClassRow[]
  teachers: TeacherOption[]
}

export function ClassesClient({ initialClasses, teachers }: Props) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  async function handleDelete(cls: ClassRow) {
    if (!confirm(`确认删除班级 "${cls.name}"？\nConfirm delete class "${cls.nameEn ?? cls.name}"?`)) return
    setDeleting(cls.id)
    try {
      const res = await fetch(`/api/admin/classes/${cls.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        showToast(json.error ?? 'Delete failed', 'error')
        return
      }
      router.refresh()
      showToast('班级已删除 / Class deleted successfully')
    } catch {
      showToast('Network error, please retry.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      {/* Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{initialClasses.length} classes</p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          ➕ 添加班级 / Add Class
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3">班级名称</th>
              <th className="px-6 py-3">类型</th>
              <th className="px-6 py-3">老师</th>
              <th className="px-6 py-3 text-center">已报名</th>
              <th className="px-6 py-3 text-center">总名额</th>
              <th className="px-6 py-3 text-center">剩余</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialClasses.map((cls) => {
              const enrolled = cls.enrolledCount
              const remaining = Math.max(0, cls.capacity - enrolled)
              const canDelete = enrolled === 0
              return (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{cls.name}</p>
                    {cls.nameEn && <p className="text-xs text-gray-400">{cls.nameEn}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      cls.type === 'CHINESE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {TYPE_LABEL[cls.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{cls.teacherName ?? '—'}</td>
                  <td className="px-6 py-4 text-center font-medium text-gray-900">{enrolled}</td>
                  <td className="px-6 py-4 text-center text-gray-500">{cls.capacity}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={remaining === 0 ? 'font-medium text-red-600' : 'font-medium text-green-600'}>
                      {remaining}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/classes/${cls.id}`}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        查看 →
                      </Link>
                      {canDelete ? (
                        <button
                          onClick={() => handleDelete(cls)}
                          disabled={deleting === cls.id}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deleting === cls.id ? '…' : '删除'}
                        </button>
                      ) : (
                        <span
                          title="无法删除已有学生的班级 / Cannot delete a class with enrolled students"
                          className="cursor-not-allowed rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-300"
                        >
                          删除
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {initialClasses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  暂无班级数据 / No classes found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <AddClassModal
          teachers={teachers}
          onClose={() => setAddOpen(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  )
}
