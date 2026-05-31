'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface StudentRow {
  index: number
  id: string
  name: string
  nameEn: string | null
  parentName: string | null
  parentPhone: string | null
  parentEmail: string | null
  enrolledAt: string
  isReturning: boolean
}

export interface TextbookRow {
  id: string
  name: string
  nameZh: string
  description: string | null
  descriptionZh: string | null
  price: string
  isActive: boolean
}

export interface ExamRow {
  id: string
  studentName: string
  studentNameEn: string | null
  examType: string
  level: number
  examDate: string
  status: string
  studentNameZh: string
}

export interface ClassExamRow {
  id: string
  name: string
  nameZh: string
  examDate: string
  maxScore: number
  isPublished: boolean
  totalStudents: number
  enteredCount: number
}

interface ClassInfo {
  name: string
  nameEn: string | null
  type: string
  description: string | null
  descriptionZh: string | null
  notes: string | null
  scheduleDisplay: string
  capacity: number
  fee: string
  year: string
}

interface Props {
  classId: string
  cls: ClassInfo
  students: StudentRow[]
  textbooks: TextbookRow[]
  examRegistrations: ExamRow[]
  classExams: ClassExamRow[]
}

type Tab = 'roster' | 'textbooks' | 'info' | 'exams'

const TABS: { id: Tab; zh: string; en: string }[] = [
  { id: 'roster',    zh: '学生名单', en: 'Student Roster' },
  { id: 'textbooks', zh: '教材管理', en: 'Textbooks' },
  { id: 'info',      zh: '班级信息', en: 'Class Details' },
  { id: 'exams',     zh: '考试管理', en: 'Exams' },
]

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: '待支付',   color: 'bg-amber-100 text-amber-700' },
  PAID:            { label: '待审核',   color: 'bg-blue-100 text-blue-700' },
  CONFIRMED:       { label: '已确认',   color: 'bg-green-100 text-green-700' },
  REJECTED:        { label: '未通过',   color: 'bg-red-100 text-red-700' },
}

// ── Textbook sub-component ────────────────────────────────────────────────────

const emptyTbForm = { name: '', nameZh: '', description: '', price: '' }

function TextbookManager({ classId, initial }: { classId: string; initial: TextbookRow[] }) {
  const router = useRouter()
  const [textbooks, setTextbooks] = useState<TextbookRow[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyTbForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openAdd() { setForm(emptyTbForm); setEditId(null); setShowForm(true); setError(null) }
  function openEdit(tb: TextbookRow) {
    setForm({ name: tb.name, nameZh: tb.nameZh, description: tb.description ?? '', price: tb.price })
    setEditId(tb.id)
    setShowForm(true)
    setError(null)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.nameZh.trim() || !form.price) {
      setError('请填写所有必填字段 / Please fill all required fields')
      return
    }
    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) { setError('价格无效 / Invalid price'); return }

    setSaving(true)
    setError(null)
    try {
      const url = editId
        ? `/api/admin/classes/${classId}/textbooks/${editId}`
        : `/api/admin/classes/${classId}/textbooks`
      const res = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, nameZh: form.nameZh, description: form.description || undefined, price }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? 'Failed'); return }

      router.refresh()
      if (editId) {
        setTextbooks((prev) => prev.map((t) => t.id === editId ? { ...t, ...form, price: String(price) } : t))
      } else {
        setTextbooks((prev) => [...prev, { id: json.data.id, name: form.name, nameZh: form.nameZh, description: form.description || null, descriptionZh: null, price: String(price), isActive: true }])
      }
      setShowForm(false)
      setEditId(null)
    } catch {
      setError('Network error, please retry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此教材？/ Confirm delete textbook?')) return
    try {
      await fetch(`/api/admin/classes/${classId}/textbooks/${id}`, { method: 'DELETE' })
      setTextbooks((prev) => prev.filter((t) => t.id !== id))
      router.refresh()
    } catch {
      alert('Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{textbooks.length} textbook(s)</p>
        <button
          onClick={openAdd}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          + 添加教材 / Add Textbook
        </button>
      </div>

      {textbooks.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">暂无教材 / No textbooks yet</p>
      ) : (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
          {textbooks.map((tb) => (
            <div key={tb.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{tb.nameZh}</p>
                <p className="text-xs text-gray-500">{tb.name} · ${parseFloat(tb.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(tb)} className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2 py-1">
                  编辑
                </button>
                <button onClick={() => handleDelete(tb.id)} className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">{editId ? '编辑教材' : '添加教材'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {[
                { label: '中文名称 *', key: 'nameZh', placeholder: '例：欢乐伙伴 第三册' },
                { label: 'English Name *', key: 'name', placeholder: 'e.g. Happy Friends Book 3' },
                { label: 'Price (USD) *', key: 'price', placeholder: '0.00', type: 'number' },
                { label: 'Description', key: 'description', placeholder: '' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              ))}
              {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button onClick={() => setShowForm(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {saving ? '保存中…' : '保存 / Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main tabs component ───────────────────────────────────────────────────────

const emptyExamForm = { name: '', nameZh: '', examDate: '', maxScore: '100', description: '' }

export function TeacherClassTabs({ classId, cls, students, textbooks, examRegistrations, classExams: initialClassExams }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('roster')
  const [search, setSearch] = useState('')
  const [examSubTab, setExamSubTab] = useState<'class' | 'official'>('class')

  // Class exams state
  const [classExams, setClassExams] = useState<ClassExamRow[]>(initialClassExams)
  const [showCreateExam, setShowCreateExam] = useState(false)
  const [examForm, setExamForm] = useState(emptyExamForm)
  const [examSaving, setExamSaving] = useState(false)
  const [examError, setExamError] = useState<string | null>(null)
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null)

  // Class info form state
  const [descEn, setDescEn] = useState(cls.description ?? '')
  const [descZh, setDescZh] = useState(cls.descriptionZh ?? '')
  const [notes, setNotes] = useState(cls.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function handleCreateExam() {
    if (!examForm.name.trim() || !examForm.nameZh.trim() || !examForm.examDate) {
      setExamError('请填写所有必填字段 / Please fill all required fields')
      return
    }
    setExamSaving(true)
    setExamError(null)
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: examForm.name,
          nameZh: examForm.nameZh,
          examDate: examForm.examDate,
          maxScore: parseInt(examForm.maxScore, 10) || 100,
          description: examForm.description || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) { setExamError(json.error ?? 'Failed'); return }
      // Navigate to results entry page
      router.push(`/teacher/classes/${classId}/exams/${json.data.id}`)
    } catch {
      setExamError('Network error')
    } finally {
      setExamSaving(false)
    }
  }

  async function handleDeleteExam(examId: string, examName: string) {
    if (!confirm(`确认删除考试 "${examName}"？\nConfirm delete exam?`)) return
    setDeletingExamId(examId)
    try {
      const res = await fetch(`/api/teacher/classes/${classId}/exams/${examId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) { alert(json.error ?? 'Delete failed'); return }
      setClassExams((prev) => prev.filter((e) => e.id !== examId))
      router.refresh()
    } catch {
      alert('Network error')
    } finally {
      setDeletingExamId(null)
    }
  }

  const filtered = search.trim()
    ? students.filter((s) =>
        s.name.includes(search) ||
        (s.nameEn ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.parentName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : students

  async function handleSaveInfo() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/teacher/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descEn, descriptionZh: descZh, notes }),
      })
      const json = await res.json()
      if (json.success) {
        setSaveMsg('已保存 / Saved')
        router.refresh()
      } else {
        setSaveMsg(json.error ?? 'Failed')
      }
    } catch {
      setSaveMsg('Network error')
    } finally {
      setSaving(false)
    }
  }

  function downloadExamCsv() {
    const header = ['Student (ZH)', 'Student (EN)', 'Exam Type', 'Level', 'Exam Date', 'Status']
    const rows = examRegistrations.map((r) => [
      r.studentName,
      r.studentNameEn ?? '',
      r.examType,
      r.level,
      new Date(r.examDate).toLocaleDateString('en-US'),
      r.status,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exams-${cls.name}-${cls.year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.zh}
            <span className="ml-1 text-xs text-gray-400 hidden sm:inline">/ {t.en}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索学生姓名 / Search student name…"
              className="flex-1 max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <a
              href={`/api/teacher/classes/${classId}/roster`}
              download
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              ↓ 下载名单 / Download Roster
            </a>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">学生</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">家长</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">联系方式</th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">报名日期</th>
                  <th className="px-4 py-3 text-left w-20">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      {search ? '无匹配结果 / No results' : '暂无学生 / No students enrolled'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{s.index}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        {s.nameEn && <p className="text-xs text-gray-400">{s.nameEn}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {s.parentName ?? '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-gray-600">{s.parentPhone ?? '—'}</p>
                        <p className="text-xs text-gray-400">{s.parentEmail ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden xl:table-cell">
                        {new Date(s.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isReturning ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {s.isReturning ? '续读' : '新生'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">
            共 {filtered.length} 名学生{search ? `（已筛选，共 ${students.length} 名）` : ''}
          </p>
        </div>
      )}

      {/* Tab 2: Textbooks */}
      {activeTab === 'textbooks' && (
        <div>
          {cls.type !== 'CHINESE' ? (
            <p className="rounded-lg bg-gray-50 border border-gray-200 px-5 py-8 text-center text-sm text-gray-500">
              才艺班不设教材 / Arts classes do not have textbooks
            </p>
          ) : (
            <TextbookManager classId={classId} initial={textbooks} />
          )}
        </div>
      )}

      {/* Tab 3: Class Details */}
      {activeTab === 'info' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-5 max-w-2xl">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">上课时间 / Schedule</p>
              <p className="mt-1 font-medium text-gray-900">{cls.scheduleDisplay}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">容量 / Capacity</p>
              <p className="mt-1 font-medium text-gray-900">{cls.capacity}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">学费 / Fee</p>
              <p className="mt-1 font-medium text-gray-900">${parseFloat(cls.fee).toFixed(2)}</p>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              班级介绍（English）
            </label>
            <textarea
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              班级介绍（中文）
            </label>
            <textarea
              value={descZh}
              onChange={(e) => setDescZh(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              学生须知 / Notes for Students
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="供学生查阅的补充说明…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveInfo}
              disabled={saving}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存 / Save'}
            </button>
            {saveMsg && (
              <span className={`text-sm ${saveMsg.includes('Failed') || saveMsg.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Exam Management (two sub-tabs) */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {/* Sub-tab bar */}
          <div className="flex gap-1 border-b border-gray-200">
            {([
              { id: 'class' as const, zh: '班级考试', en: 'Class Exams' },
              { id: 'official' as const, zh: '官方考试', en: 'Official Exams (YCT/HSK)' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setExamSubTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  examSubTab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.zh} <span className="hidden sm:inline text-xs text-gray-400">/ {t.en}</span>
              </button>
            ))}
          </div>

          {/* Sub-tab A: Class Exams */}
          {examSubTab === 'class' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{classExams.length} 场考试</p>
                <button
                  onClick={() => { setExamForm(emptyExamForm); setExamError(null); setShowCreateExam(true) }}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  + 创建考试 / Create Exam
                </button>
              </div>

              {classExams.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-10 text-center text-sm text-gray-400">
                  暂无班级考试 / No class exams yet
                </p>
              ) : (
                <div className="space-y-2">
                  {classExams.map((exam) => (
                    <div key={exam.id} className="rounded-lg border border-gray-200 bg-white px-5 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{exam.nameZh}</span>
                          <span className="text-sm text-gray-500">{exam.name}</span>
                          {exam.isPublished ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">已发布</span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">草稿</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {new Date(exam.examDate).toLocaleDateString('zh-CN')} · 满分 {exam.maxScore} ·{' '}
                          已录入 {exam.enteredCount}/{exam.totalStudents} 名学生
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/teacher/classes/${classId}/exams/${exam.id}`}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          录入成绩 / Enter Results
                        </a>
                        {!exam.isPublished && exam.enteredCount === 0 && (
                          <button
                            onClick={() => handleDeleteExam(exam.id, exam.nameZh)}
                            disabled={deletingExamId === exam.id}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingExamId === exam.id ? '…' : '删除'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create Exam Modal */}
              {showCreateExam && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                      <h2 className="font-semibold text-gray-900">创建考试 / Create Exam</h2>
                      <button onClick={() => setShowCreateExam(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="space-y-4 px-6 py-5">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">考试名称（中文）*</label>
                        <input type="text" value={examForm.nameZh} onChange={(e) => setExamForm((f) => ({ ...f, nameZh: e.target.value }))}
                          placeholder="例：期中考试、期末考试" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Exam Name (English) *</label>
                        <input type="text" value={examForm.name} onChange={(e) => setExamForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="e.g. Mid-term Exam, Final Exam" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">考试日期 / Exam Date *</label>
                        <input type="date" value={examForm.examDate} onChange={(e) => setExamForm((f) => ({ ...f, examDate: e.target.value }))}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">满分 / Max Score *</label>
                        <input type="number" value={examForm.maxScore} onChange={(e) => setExamForm((f) => ({ ...f, maxScore: e.target.value }))}
                          min={1} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">备注 / Description（可选）</label>
                        <textarea value={examForm.description} onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" />
                      </div>
                      {examError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{examError}</p>}
                    </div>
                    <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                      <button onClick={() => setShowCreateExam(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">取消</button>
                      <button onClick={handleCreateExam} disabled={examSaving} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                        {examSaving ? '创建中…' : '创建并录入成绩 / Create & Enter Results'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab B: Official Exams (YCT/HSK) */}
          {examSubTab === 'official' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={downloadExamCsv} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  ↓ 下载考试名单 / Download Exam List
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">学生</th>
                      <th className="px-4 py-3 text-left">考试</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">级别</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">考试日期</th>
                      <th className="px-4 py-3 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {examRegistrations.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无官方考试报名 / No official exam registrations</td></tr>
                    ) : (
                      examRegistrations.map((r) => {
                        const badge = STATUS_LABEL[r.status]
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{r.studentName}</p>
                              {r.studentNameEn && <p className="text-xs text-gray-400">{r.studentNameEn}</p>}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{r.examType}</td>
                            <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">Level {r.level}</td>
                            <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                              {new Date(r.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3">
                              {badge && <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>{badge.label}</span>}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
