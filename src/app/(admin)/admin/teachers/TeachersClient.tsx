'use client'

import { useState } from 'react'
import { EditTeacherModal, type TeacherForEdit } from '@/components/admin/EditTeacherModal'

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
}: {
  teacher: TeacherWithClasses
  onEdit: (t: TeacherForEdit) => void
}) {
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
                c.type === 'ARTS'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
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
      <button
        onClick={() => onEdit(teacher)}
        className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        编辑 / Edit
      </button>
    </div>
  )
}

export function TeachersClient({ groups }: { groups: TeacherGroup[] }) {
  const [editing, setEditing] = useState<TeacherForEdit | null>(null)

  return (
    <>
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
                <TeacherRow key={t.id} teacher={t} onEdit={setEditing} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <EditTeacherModal teacher={editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
