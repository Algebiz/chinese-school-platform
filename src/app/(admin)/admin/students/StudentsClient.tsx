'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ChineseClassOption {
  id: string
  name: string
  nameEn: string | null
}

export interface ReturningStudentRow {
  studentId: string
  studentName: string
  previousChineseClass: string | null
  suggestedNextClasses: string[]
  adminOverrideClassId: string | null
  adminOverrideClassName: string | null
  enrollmentStatus: 'confirmed' | 'pending' | 'none'
  currentYearClassName: string | null
}

interface Props {
  rows: ReturningStudentRow[]
  chineseClassOptions: ChineseClassOption[]
  currentYear: string
}

export function StudentsClient({ rows, chineseClassOptions, currentYear }: Props) {
  const router = useRouter()
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.studentId, r.adminOverrideClassId ?? '']))
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleOverride(studentId: string, classId: string) {
    setSaving(studentId)
    setError(null)
    setOverrides((prev) => ({ ...prev, [studentId]: classId }))
    try {
      const res = await fetch(`/api/admin/students/${studentId}/next-class`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, academicYear: currentYear }),
      })
      const json = await res.json()
      if (!json.success) {
        setError('保存失败，请重试 / Save failed')
        setOverrides((prev) => ({ ...prev, [studentId]: rows.find((r) => r.studentId === studentId)?.adminOverrideClassId ?? '' }))
      } else {
        router.refresh()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setSaving(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        暂无老生数据 — 上学年（去年）还没有已确认的报名记录。
        <br />
        <span className="text-xs text-gray-400">No returning students found for the previous academic year.</span>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">学生 / Student</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">去年中文班 / Last Year</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">推荐升级班 / Suggested</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">管理员调整 / Override</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">报名状态 / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => {
              const currentOverride = overrides[row.studentId] ?? ''
              const isSaving = saving === row.studentId
              return (
                <tr key={row.studentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.studentName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.previousChineseClass ?? (
                      <span className="text-gray-400 italic">无 / None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.suggestedNextClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.suggestedNextClasses.map((name, i) => (
                          <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                        已毕业 / Graduated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentOverride}
                        onChange={(e) => handleOverride(row.studentId, e.target.value)}
                        disabled={isSaving}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                      >
                        <option value="">— 按推荐 / Use suggested —</option>
                        {chineseClassOptions.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}{cls.nameEn ? ` (${cls.nameEn})` : ''}
                          </option>
                        ))}
                      </select>
                      {currentOverride && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                          已调整
                        </span>
                      )}
                      {isSaving && <span className="text-xs text-gray-400">保存中…</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.enrollmentStatus} className={row.currentYearClassName} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status, className }: { status: ReturningStudentRow['enrollmentStatus']; className: string | null }) {
  if (status === 'confirmed') {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        已报名 ✓{className ? ` · ${className}` : ''}
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        待支付{className ? ` · ${className}` : ''}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      未报名
    </span>
  )
}
