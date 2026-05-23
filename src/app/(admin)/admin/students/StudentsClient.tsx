'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentStatusBadge } from '@/components/StudentStatusBadge'
import type { StudentStatus } from '@/lib/student-status'
import { AddStudentModal } from '@/components/admin/AddStudentModal'
import { EditStudentModal } from '@/components/admin/EditStudentModal'
import { UnenrollModal } from '@/components/admin/UnenrollModal'

export interface StudentRow {
  studentId: string
  studentName: string
  studentNameEn: string | null
  birthDate: string | null
  gender: string | null
  grade: string | null
  notes: string | null
  familyId: string
  parentName: string | null
  parentEmail: string | null
  enrolledClasses: Array<{ enrollmentId: string; name: string; type: string; enrolledAt: string }>
  status: StudentStatus
  hasConfirmedExamRegs: boolean
}

type FilterValue = 'all' | 'new' | 'returning'
type MsgType = 'success' | 'error'

interface Props {
  rows: StudentRow[]
}

const CLASS_TYPE_LABEL: Record<string, string> = {
  CHINESE: '中文班',
  ARTS: '才艺班',
}

const GENDER_LABEL: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  OTHER: '其他',
}

export function StudentsClient({ rows }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterValue>('all')
  const [query, setQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<StudentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: MsgType } | null>(null)
  const [unenrollTarget, setUnenrollTarget] = useState<{
    enrollmentId: string
    studentName: string
    studentNameEn: string | null
    className: string
    enrolledAt: string
  } | null>(null)

  const q = query.trim().toLowerCase()

  const statusFiltered =
    filter === 'new'
      ? rows.filter((r) => r.status === 'NEW')
      : filter === 'returning'
        ? rows.filter((r) => r.status === 'RETURNING')
        : rows

  const visibleRows = q
    ? statusFiltered.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          (r.studentNameEn?.toLowerCase().includes(q) ?? false) ||
          (r.parentName?.toLowerCase().includes(q) ?? false) ||
          (r.parentEmail?.toLowerCase().includes(q) ?? false)
      )
    : statusFiltered

  const newCount = rows.filter((r) => r.status === 'NEW').length
  const returningCount = rows.filter((r) => r.status === 'RETURNING').length

  function showMsg(text: string, type: MsgType = 'success') {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), type === 'error' ? 5000 : 3000)
  }

  function handleDeleteClick(row: StudentRow) {
    const hasConfirmed =
      row.enrolledClasses.length > 0 || row.hasConfirmedExamRegs
    if (hasConfirmed) {
      showMsg(
        '无法删除已有确认报名记录的学生 / Cannot delete student with confirmed enrollments',
        'error'
      )
      return
    }
    setDeleteTarget(row)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/students/${deleteTarget.studentId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) {
        const msg =
          json.code === 'HAS_CONFIRMED'
            ? '无法删除已有确认报名记录的学生 / Cannot delete student with confirmed enrollments'
            : `删除失败: ${json.error}`
        showMsg(msg, 'error')
        setDeleteTarget(null)
        return
      }
      setDeleteTarget(null)
      showMsg('学生已删除 ✓')
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <span>➕</span>
            <span>添加学生 / Add Student</span>
          </button>
        </div>
        {message && (
          <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message.text}
          </div>
        )}
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          暂无学生数据 — 本学年还没有已确认的报名记录。
          <br />
          <span className="text-xs text-gray-400">
            No students found with confirmed enrollments this year.
          </span>
        </div>
        {showAddModal && (
          <AddStudentModal
            onClose={() => setShowAddModal(false)}
            onSuccess={(msg) => { setShowAddModal(false); showMsg(msg) }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top bar: Add button + filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { value: 'all', label: `全部 / All (${rows.length})` },
              { value: 'new', label: `新生 / New (${newCount})` },
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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <span>➕</span>
          <span>添加学生 / Add Student</span>
        </button>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索学生姓名或家长邮箱 / Search by student name or parent email"
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500">
        显示 <strong>{visibleRows.length}</strong> /{' '}
        <strong>{statusFiltered.length}</strong> 名学生
        {filter !== 'all' && (
          <span className="ml-1 text-gray-400">
            （{filter === 'new' ? '新生' : '老生'}筛选中）
          </span>
        )}
        {q && <span className="ml-1 text-gray-400">· 搜索：&ldquo;{query}&rdquo;</span>}
        <span className="ml-2 text-gray-400">· 按姓氏拼音 A→Z 排序</span>
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                学生 / Student ↑
                <span className="ml-1 text-[10px] font-normal text-gray-400">姓氏拼音</span>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">状态 / Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">
                已报班级 / Enrolled Classes
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">家长 / Parent</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">邮箱 / Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  没有匹配的结果 / No matching results
                </td>
              </tr>
            ) : (
              visibleRows.map((row, i) => (
                <tr key={row.studentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.studentName}</div>
                    {row.studentNameEn && (
                      <div className="text-xs text-gray-400">{row.studentNameEn}</div>
                    )}
                    {(row.grade || row.gender) && (
                      <div className="text-xs text-gray-400">
                        {[row.grade, row.gender ? GENDER_LABEL[row.gender] : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StudentStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.enrolledClasses.map((cls) => (
                        <span
                          key={cls.enrollmentId}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            cls.type === 'CHINESE'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {cls.name}
                          <span className="opacity-60">{CLASS_TYPE_LABEL[cls.type] ?? cls.type}</span>
                          <button
                            onClick={() => setUnenrollTarget({
                              enrollmentId: cls.enrollmentId,
                              studentName: row.studentName,
                              studentNameEn: row.studentNameEn,
                              className: cls.name,
                              enrolledAt: cls.enrolledAt,
                            })}
                            className="opacity-50 hover:opacity-100 leading-none"
                            title="取消注册 / Unenroll"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.parentName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{row.parentEmail ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditTarget(row)}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-gray-400 hover:bg-gray-50"
                      >
                        编辑 / Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(row)}
                        className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
                      >
                        🗑 删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => { setShowAddModal(false); showMsg(msg) }}
        />
      )}

      {/* Edit Student Modal */}
      {editTarget && (
        <EditStudentModal
          student={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={(msg) => { setEditTarget(null); showMsg(msg) }}
        />
      )}

      {/* Unenroll modal */}
      {unenrollTarget && (
        <UnenrollModal
          enrollmentId={unenrollTarget.enrollmentId}
          studentName={unenrollTarget.studentName}
          studentNameEn={unenrollTarget.studentNameEn}
          className={unenrollTarget.className}
          enrolledAt={unenrollTarget.enrolledAt}
          waitlistCount={0}
          onClose={() => setUnenrollTarget(null)}
          onSuccess={(msg) => {
            setUnenrollTarget(null)
            showMsg(msg)
            router.refresh()
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-semibold text-gray-900">
              删除学生 / Delete Student
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              确认删除学生{' '}
              <strong>{deleteTarget.studentName}</strong>
              {deleteTarget.studentNameEn && (
                <span className="text-gray-400"> ({deleteTarget.studentNameEn})</span>
              )}
              ？此操作不可撤销。
              <br />
              <span className="text-xs text-gray-400">
                Confirm delete student? This cannot be undone.
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                取消 / Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '删除中…' : '确认删除 / Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
