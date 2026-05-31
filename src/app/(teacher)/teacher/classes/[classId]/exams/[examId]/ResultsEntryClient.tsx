'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StudentRow {
  studentId: string
  studentName: string
  studentNameEn: string | null
  score: number | null
  passed: boolean | null
  notes: string
}

interface Props {
  classId: string
  examId: string
  maxScore: number
  isPublished: boolean
  rows: StudentRow[]
  enteredCount: number
  totalCount: number
}

type RowState = Omit<StudentRow, 'studentId' | 'studentName' | 'studentNameEn'> & { saving: boolean; saved: boolean; error: string | null }

export function ResultsEntryClient({ classId, examId, maxScore, isPublished: initialPublished, rows, enteredCount: initialEntered, totalCount }: Props) {
  const router = useRouter()

  const [state, setState] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, { score: r.score, passed: r.passed, notes: r.notes, saving: false, saved: false, error: null }]))
  )

  const [savingAll, setSavingAll] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishMsg, setPublishMsg] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(initialPublished)
  const [enteredCount, setEnteredCount] = useState(initialEntered)

  function update(studentId: string, patch: Partial<RowState>) {
    setState((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }))
  }

  function handleScoreChange(studentId: string, val: string) {
    const score = val === '' ? null : Math.min(maxScore, Math.max(0, parseInt(val, 10) || 0))
    const suggestedPass = score !== null ? score >= maxScore * 0.6 : null
    update(studentId, { score, passed: suggestedPass, saved: false, error: null })
  }

  async function saveRow(studentId: string) {
    const row = state[studentId]
    update(studentId, { saving: true, error: null, saved: false })
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/exams/${examId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, score: row.score, passed: row.passed, notes: row.notes || undefined }),
      })
      const json = await res.json()
      if (!json.success) { update(studentId, { saving: false, error: json.error ?? 'Failed' }); return }
      update(studentId, { saving: false, saved: true })
      setEnteredCount(Object.values(state).filter((s) => s.score !== null).length + (row.score !== null ? 1 : 0))
    } catch {
      update(studentId, { saving: false, error: 'Network error' })
    }
  }

  async function saveAll() {
    setSavingAll(true)
    const toSave = rows.filter((r) => state[r.studentId].score !== null)
    for (const row of toSave) {
      await saveRow(row.studentId)
    }
    setSavingAll(false)
    router.refresh()
  }

  async function handlePublish() {
    if (!confirm(`确认发布？发布后家长将收到成绩通知邮件。\nConfirm publish? Parents will be notified by email.`)) return
    setPublishing(true)
    setPublishMsg(null)
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/exams/${examId}/publish`, { method: 'POST' })
      const json = await res.json()
      if (!json.success) { setPublishMsg(json.error ?? 'Publish failed'); return }
      setIsPublished(true)
      const { notified, missingCount } = json.data
      setPublishMsg(`已发布！已通知 ${notified} 位家长${missingCount > 0 ? `，${missingCount} 名学生成绩未录入` : ''}。`)
      router.refresh()
    } catch {
      setPublishMsg('Network error')
    } finally {
      setPublishing(false)
    }
  }

  const enteredNow = Object.values(state).filter((s) => s.score !== null).length

  return (
    <div className="space-y-4">
      {/* Top actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-5 py-3">
        <div className="text-sm text-gray-600">
          已录入{' '}
          <span className="font-bold text-gray-900">{enteredNow}</span>
          {' '}/ {totalCount} 名学生成绩
          {' '}/ Results entered for {enteredNow} of {totalCount} students
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveAll}
            disabled={savingAll || isPublished}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {savingAll ? '保存中…' : '全部保存 / Save All'}
          </button>
          {!isPublished ? (
            <button
              onClick={handlePublish}
              disabled={publishing || enteredNow === 0}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {publishing ? '发布中…' : '发布成绩 / Publish Results'}
            </button>
          ) : (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
              ✅ 已发布 / Published
            </span>
          )}
        </div>
      </div>

      {publishMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${publishMsg.includes('failed') || publishMsg.includes('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {publishMsg}
        </div>
      )}

      {/* Results table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">学生姓名</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">English Name</th>
              <th className="px-4 py-3 text-left w-28">分数 / Score</th>
              <th className="px-4 py-3 text-left">结果 / Result</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">备注 / Notes</th>
              <th className="px-4 py-3 text-left w-16">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const s = state[row.studentId]
              return (
                <tr key={row.studentId} className={`hover:bg-gray-50 ${s.saved ? 'bg-green-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.studentName}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{row.studentNameEn ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        value={s.score ?? ''}
                        onChange={(e) => handleScoreChange(row.studentId, e.target.value)}
                        disabled={isPublished}
                        placeholder="—"
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-center focus:border-red-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                      />
                      <span className="text-xs text-gray-400">/{maxScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`passed-${row.studentId}`}
                          checked={s.passed === true}
                          onChange={() => update(row.studentId, { passed: true, saved: false })}
                          disabled={isPublished}
                          className="accent-green-600"
                        />
                        <span className="text-xs text-green-700">通过</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name={`passed-${row.studentId}`}
                          checked={s.passed === false}
                          onChange={() => update(row.studentId, { passed: false, saved: false })}
                          disabled={isPublished}
                          className="accent-red-500"
                        />
                        <span className="text-xs text-red-600">未通过</span>
                      </label>
                    </div>
                    {s.score !== null && s.passed === null && (
                      <p className="text-xs text-amber-600 mt-0.5">请选择结果</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <input
                      type="text"
                      value={s.notes}
                      onChange={(e) => update(row.studentId, { notes: e.target.value, saved: false })}
                      disabled={isPublished}
                      placeholder="可选备注…"
                      className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-red-500 focus:outline-none disabled:bg-gray-50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {!isPublished ? (
                      <button
                        onClick={() => saveRow(row.studentId)}
                        disabled={s.saving || s.score === null}
                        title="保存此行 / Save this row"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"
                      >
                        {s.saving ? '…' : s.saved ? '✓' : '💾'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                    {s.error && <p className="text-xs text-red-500">{s.error}</p>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isPublished && (
        <p className="text-xs text-gray-400 text-center">
          成绩已发布，无法修改 / Results are published and cannot be edited.
        </p>
      )}
    </div>
  )
}
