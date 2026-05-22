'use client'

import { useState } from 'react'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import type { StudentStatus } from '@/lib/student-status'

export interface StudentRow {
  studentId: string
  studentName: string
  studentNameEn: string | null
  parentName: string | null
  parentEmail: string | null
  enrolledClasses: Array<{ name: string; type: string }>
  status: StudentStatus
}

type FilterValue = 'all' | 'new' | 'returning'

interface Props {
  rows: StudentRow[]
}

const CLASS_TYPE_LABEL: Record<string, string> = {
  CHINESE: '中文班',
  ARTS: '才艺班',
}

export function StudentsClient({ rows }: Props) {
  const [filter, setFilter] = useState<FilterValue>('all')

  const newCount       = rows.filter((r) => r.status === 'NEW').length
  const returningCount = rows.filter((r) => r.status === 'RETURNING').length
  const visibleRows    = filter === 'new'
    ? rows.filter((r) => r.status === 'NEW')
    : filter === 'returning'
      ? rows.filter((r) => r.status === 'RETURNING')
      : rows

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        暂无学生数据 — 本学年还没有已确认的报名记录。
        <br />
        <span className="text-xs text-gray-400">No students found with confirmed enrollments this year.</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(
          [
            { value: 'all',       label: `全部 / All (${rows.length})` },
            { value: 'new',       label: `新生 / New (${newCount})` },
            { value: 'returning', label: `老生 / Returning (${returningCount})` },
          ] as { value: FilterValue; label: string }[]
        ).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === value
                ? 'border-red-500 bg-red-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">学生 / Student</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">状态 / Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">已报班级 / Enrolled Classes</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">家长 / Parent</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">邮箱 / Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {visibleRows.map((row, i) => (
              <tr key={row.studentId} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.studentName}</div>
                  {row.studentNameEn && (
                    <div className="text-xs text-gray-400">{row.studentNameEn}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StudentStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.enrolledClasses.map((cls) => (
                      <span
                        key={cls.name}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          cls.type === 'CHINESE'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {cls.name}
                        <span className="ml-1 opacity-60">{CLASS_TYPE_LABEL[cls.type] ?? cls.type}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{row.parentName ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{row.parentEmail ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
