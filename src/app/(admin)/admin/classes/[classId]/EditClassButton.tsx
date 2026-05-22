'use client'

import { useState } from 'react'
import { EditClassModal, type EditableClass } from '@/components/admin/EditClassModal'
import { Toast, useToast } from '@/components/ui/Toast'
import type { TeacherOption } from '@/components/admin/AddClassModal'

interface Props {
  cls: EditableClass
  teachers: TeacherOption[]
}

export function EditClassButton({ cls, teachers }: Props) {
  const [open, setOpen] = useState(false)
  const { toast, showToast, dismissToast } = useToast()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        编辑班级 / Edit Class
      </button>

      {open && (
        <EditClassModal
          cls={cls}
          teachers={teachers}
          onClose={() => setOpen(false)}
          onSuccess={(msg) => { showToast(msg); setOpen(false) }}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  )
}
