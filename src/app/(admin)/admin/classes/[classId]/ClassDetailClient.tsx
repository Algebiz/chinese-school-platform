'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassTransferModal } from '@/components/admin/ClassTransferModal'
import { UnenrollModal } from '@/components/admin/UnenrollModal'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import type { StudentStatus } from '@/lib/student-status'

export interface EnrolledStudent {
  enrollmentId: string
  studentName: string
  studentNameEn: string | null
  parentName: string
  phone: string | null
  email: string
  enrolledAt: string
  textbookNames: string[]
  status: StudentStatus
}

export interface AvailableClass {
  id: string
  name: string
  spotsRemaining: number
}

export interface CancelledRow {
  studentName: string
  studentNameEn: string | null
  cancelledAt: string
  reason: string
  cancelledBy: string | null
}

interface Props {
  enrolledStudents: EnrolledStudent[]
  currentClassName: string
  availableClasses: AvailableClass[]
  waitlistCount: number
  cancelledRows: CancelledRow[]
}

export function ClassDetailClient({
  enrolledStudents,
  currentClassName,
  availableClasses,
  waitlistCount,
  cancelledRows,
}: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<{ enrollmentId: string; studentName: string } | null>(null)
  const [unenrollTarget, setUnenrollTarget] = useState<{
    enrollmentId: string
    studentName: string
    studentNameEn: string | null
    enrolledAt: string
  } | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleTransferSuccess() {
    setModal(null)
    router.refresh()
  }

  function handleUnenrollSuccess(msg: string) {
    setUnenrollTarget(null)
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
    router.refresh()
  }

  return (
    <>
      {successMsg && (
        <div className="mb-3 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-4 py-3">中文姓名</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">英文姓名</th>
              <th className="px-4 py-3">家长姓名</th>
              <th className="px-4 py-3">电话</th>
              <th className="px-4 py-3">邮箱</th>
              <th className="px-4 py-3">教材 / Books</th>
              <th className="px-4 py-3">报名时间</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {enrolledStudents.map((s, i) => (
              <tr key={s.enrollmentId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{s.studentName}</td>
                <td className="px-4 py-3"><StudentStatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-gray-500">{s.studentNameEn ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{s.parentName}</td>
                <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{s.email}</td>
                <td className="px-4 py-3">
                  {s.textbookNames.length === 0 ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {s.textbookNames.map((n) => (
                        <span key={n} className="block text-xs text-green-700">✓ {n}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(s.enrolledAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setModal({ enrollmentId: s.enrollmentId, studentName: s.studentName })}
                      className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      调班 / Transfer
                    </button>
                    <button
                      onClick={() => setUnenrollTarget({
                        enrollmentId: s.enrollmentId,
                        studentName: s.studentName,
                        studentNameEn: s.studentNameEn,
                        enrolledAt: s.enrolledAt,
                      })}
                      className="rounded border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {enrolledStudents.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  暂无已确认学生 / No confirmed students
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {enrolledStudents.length > 0 && enrolledStudents.some(s => s.textbookNames.length > 0) && (
          <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            ✓ = 已订购教材，可在上课当日准备发放 / ✓ = textbook ordered, prepare for pickup on class day
          </p>
        )}
      </div>

      {/* Cancelled enrollments audit trail */}
      {cancelledRows.length > 0 && (
        <details className="mt-4 rounded-lg border border-gray-200 bg-white">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
            已取消注册 / Cancelled Enrollments ({cancelledRows.length})
          </summary>
          <div className="border-t border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2">学生 / Student</th>
                  <th className="px-4 py-2">取消时间 / Cancelled</th>
                  <th className="px-4 py-2">原因 / Reason</th>
                  <th className="px-4 py-2">操作人 / By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cancelledRows.map((row, i) => (
                  <tr key={i} className="text-gray-600">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {row.studentName}
                      {row.studentNameEn && (
                        <span className="ml-1 text-xs text-gray-400">({row.studentNameEn})</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(row.cancelledAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{row.reason}</td>
                    <td className="px-4 py-2 text-gray-500">{row.cancelledBy ?? '管理员'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {modal && (
        <ClassTransferModal
          enrollmentId={modal.enrollmentId}
          studentName={modal.studentName}
          currentClassName={currentClassName}
          availableClasses={availableClasses}
          onClose={() => setModal(null)}
          onSuccess={handleTransferSuccess}
        />
      )}

      {unenrollTarget && (
        <UnenrollModal
          enrollmentId={unenrollTarget.enrollmentId}
          studentName={unenrollTarget.studentName}
          studentNameEn={unenrollTarget.studentNameEn}
          className={currentClassName}
          enrolledAt={unenrollTarget.enrolledAt}
          waitlistCount={waitlistCount}
          onClose={() => setUnenrollTarget(null)}
          onSuccess={handleUnenrollSuccess}
        />
      )}
    </>
  )
}
