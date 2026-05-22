'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditTeacherModal, type TeacherForEdit } from '@/components/admin/EditTeacherModal'
import { AddTeacherModal } from '@/components/admin/AddTeacherModal'
import { Toast, useToast } from '@/components/ui/Toast'

export interface TeacherWithClasses extends TeacherForEdit {
  classes: { id: string; name: string; nameEn: string | null; type: string }[]
}

interface TeacherGroup {
  label: string
  labelEn: string
  teachers: TeacherWithClasses[]
}

function TeacherAvatar({ teacher }: { teacher: TeacherForEdit }) {
  if (teacher.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={teacher.photoUrl}
        alt={teacher.name}
        className="h-10 w-10 rounded-full object-cover border border-gray-200"
      />
    )
  }
  const initials = teacher.nameEn
    ? teacher.nameEn.split(' ').map((w) => w[0]).slice(0, 2).join('')
    : teacher.name.slice(0, 1)
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700 border border-red-200">
      {initials}
    </div>
  )
}

function TeacherRow({
  teacher,
  onEdit,
  onDelete,
  deleting,
}: {
  teacher: TeacherWithClasses
  onEdit: (t: TeacherForEdit) => void
  onDelete: (t: TeacherWithClasses) => void
  deleting: boolean
}) {
  const canDelete = teacher.classes.length === 0

  return (
    <div className="flex items-start gap-4 py-4 px-5">
      <TeacherAvatar teacher={teacher} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-gray-900">{teacher.name}</span>
          {teacher.nameEn && (
            <span className="text-sm text-gray-500">{teacher.nameEn}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {teacher.classes.map((c) => (
            <span
              key={c.id}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                c.type === 'ARTS' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}
            >
              {c.nameEn ?? c.name}
            </span>
          ))}
        </div>
        {teacher.bioEn && (
          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{teacher.bioEn}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onEdit(teacher)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          编辑 / Edit
        </button>
        {canDelete ? (
          <button
            onClick={() => onDelete(teacher)}
            disabled={deleting}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? '…' : '删除'}
          </button>
        ) : (
          <span
            title="请先将该老师的班级转给其他老师 / Please reassign this teacher's classes first"
            className="cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-300"
          >
            删除
          </span>
        )}
      </div>
    </div>
  )
}

export function TeachersClient({ groups }: { groups: TeacherGroup[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<TeacherForEdit | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  async function handleDelete(teacher: TeacherWithClasses) {
    if (!confirm(`确认删除老师 "${teacher.name}"？\nConfirm delete teacher "${teacher.nameEn ?? teacher.name}"?`)) return
    setDeletingId(teacher.id)
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) {
        showToast(json.error ?? 'Delete failed', 'error')
        return
      }
      router.refresh()
      showToast('老师已删除 / Teacher deleted successfully')
    } catch {
      showToast('Network error, please retry.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const totalTeachers = groups.reduce((sum, g) => sum + g.teachers.length, 0)

  return (
    <>
      {/* Add Teacher button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{totalTeachers} teachers</p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          ➕ 添加老师 / Add Teacher
        </button>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.labelEn} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
              <h2 className="font-semibold text-gray-900">
                {group.label}
                <span className="ml-2 text-sm font-normal text-gray-500">{group.labelEn}</span>
                <span className="ml-2 text-sm text-gray-400">({group.teachers.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {group.teachers.map((t) => (
                <TeacherRow
                  key={t.id}
                  teacher={t}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                  deleting={deletingId === t.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditTeacherModal teacher={editing} onClose={() => setEditing(null)} />
      )}

      {addOpen && (
        <AddTeacherModal
          onClose={() => setAddOpen(false)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  )
}
