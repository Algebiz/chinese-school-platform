'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassTransferModal } from '@/components/admin/ClassTransferModal'

export interface EnrolledStudent {
  enrollmentId: string
  studentName: string
  studentNameEn: string | null
  parentName: string
  phone: string | null
  email: string
  enrolledAt: string
}

export interface AvailableClass {
  id: string
  name: string
  spotsRemaining: number
}

interface Props {
  enrolledStudents: EnrolledStudent[]
  currentClassName: string
  availableClasses: AvailableClass[]
}

export function ClassDetailClient({ enrolledStudents, currentClassName, availableClasses }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<{ enrollmentId: string; studentName: string } | null>(null)

  function handleSuccess() {
    setModal(null)
    router.refresh()
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">中文姓名</th>
              <th className="px-4 py-3">英文姓名</th>
              <th className="px-4 py-3">家长姓名</th>
              <th className="px-4 py-3">电话</th>
              <th className="px-4 py-3">邮箱</th>
              <th className="px-4 py-3">报名时间</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrolledStudents.map((s, i) => (
              <tr key={s.enrollmentId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{s.studentName}</td>
                <td className="px-4 py-3 text-gray-500">{s.studentNameEn ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.parentName}</td>
                <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(s.enrolledAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setModal({ enrollmentId: s.enrollmentId, studentName: s.studentName })}
                    className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    调班 / Transfer
                  </button>
                </td>
              </tr>
            ))}
            {enrolledStudents.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  暂无已确认学生 / No confirmed students
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <ClassTransferModal
          enrollmentId={modal.enrollmentId}
          studentName={modal.studentName}
          currentClassName={currentClassName}
          availableClasses={availableClasses}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
