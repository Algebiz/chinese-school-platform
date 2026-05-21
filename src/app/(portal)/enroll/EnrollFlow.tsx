'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import type { ClassData } from '@/components/ClassCard'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentData {
  id: string
  name: string
  nameEn: string | null
  birthDate: string | null
  grade: string | null
}

interface ReturningStudentInfo {
  isReturning: boolean
  previousChineseClass: { id: string; name: string; nameEn: string | null } | null
  previousArtsClasses: { id: string; name: string; nameEn: string | null }[]
  suggestedNextChineseClassIds: string[]
  suggestedArtsClassIds: string[]
  adminOverrideClassId: string | null
  isGraduation: boolean
}

type Step = 1 | 2 | 3 | 4

interface Props {
  initialStudents: StudentData[]
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
  preselectedClassIds: string[]
  returningStudentData: Record<string, ReturningStudentInfo>
}

// ── Schedule conflict (client-side mirror of enrollment-logic.ts) ─────────────

function parseTime(t: string): number {
  const upper = t.trim().toUpperCase()
  const isPM = upper.includes('PM')
  const isAM = upper.includes('AM')
  const [h, m] = upper.replace(/[AP]M/, '').trim().split(':').map(Number)
  let hours = h
  if (isPM && hours !== 12) hours += 12
  if (isAM && hours === 12) hours = 0
  return hours * 60 + (m || 0)
}

function hasScheduleConflict(a: ClassData, b: ClassData): boolean {
  const sa = a.schedule as Record<string, string>
  const sb = b.schedule as Record<string, string>
  if (!sa?.dayOfWeek || !sb?.dayOfWeek) return false
  if (sa.dayOfWeek.toLowerCase() !== sb.dayOfWeek.toLowerCase()) return false
  return parseTime(sa.startTime) < parseTime(sb.endTime) &&
    parseTime(sb.startTime) < parseTime(sa.endTime)
}

function fmtSchedule(schedule: unknown): string {
  const s = schedule as Record<string, string>
  if (!s?.dayOfWeek) return '待定'
  return `${s.dayOfWeek} ${s.startTime ?? ''}–${s.endTime ?? ''}${s.room ? ` | ${s.room}` : ''}`
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEP_LABELS = ['选择学生', '中文班', '才艺班', '确认']

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step
        const done = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                done && 'bg-red-600 text-white',
                active && 'bg-red-600 text-white ring-4 ring-red-100',
                !done && !active && 'bg-gray-200 text-gray-500'
              )}>
                {done ? '✓' : n}
              </div>
              <span className={clsx(
                'mt-1 text-xs',
                active ? 'font-medium text-red-600' : 'text-gray-400'
              )}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={clsx('mx-2 mb-4 h-px w-12 sm:w-20', n < step ? 'bg-red-600' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Add Student Modal ─────────────────────────────────────────────────────────

function AddStudentModal({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: (student: StudentData) => void
}) {
  const [form, setForm] = useState({ name: '', nameEn: '', birthDate: '', grade: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('请输入学生姓名'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) { setError('添加失败，请重试'); return }
      onAdded(json.data)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">添加学生</h2>
        <p className="text-sm text-gray-400 mb-5">Add Student</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <Field label="中文姓名 / Chinese Name *">
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" />
          </Field>
          <Field label="英文姓名 / English Name">
            <input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
              className="input" />
          </Field>
          <Field label="出生日期 / Date of Birth">
            <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
              className="input" />
          </Field>
          <Field label="年级 / Grade">
            <input placeholder="e.g. 3rd Grade" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              className="input" />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              取消 / Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? '保存中…' : '保存 / Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

// ── Mini class card ───────────────────────────────────────────────────────────

type BadgeVariant = 'recommended' | 'sameAsLastYear' | 'adminOverride' | 'gradeMatch'

const BADGE_CONFIG: Record<BadgeVariant, { text: string; badgeCls: string; borderCls: string; bgCls: string }> = {
  recommended:   { text: '推荐升级',   badgeCls: 'bg-blue-100 text-blue-700',    borderCls: 'border-blue-300',  bgCls: 'bg-blue-50' },
  sameAsLastYear:{ text: '去年同款',   badgeCls: 'bg-green-100 text-green-700',  borderCls: 'border-green-300', bgCls: 'bg-green-50' },
  adminOverride: { text: '管理员推荐', badgeCls: 'bg-yellow-100 text-yellow-700',borderCls: 'border-yellow-300',bgCls: 'bg-yellow-50' },
  gradeMatch:    { text: '推荐',       badgeCls: 'bg-blue-100 text-blue-700',    borderCls: 'border-blue-200',  bgCls: 'bg-blue-50' },
}

function MiniClassCard({
  cls,
  selected,
  disabled,
  conflicted,
  badgeVariant,
  onClick,
}: {
  cls: ClassData
  selected: boolean
  disabled?: boolean
  conflicted?: boolean
  badgeVariant?: BadgeVariant
  onClick: () => void
}) {
  const badge = badgeVariant ? BADGE_CONFIG[badgeVariant] : null

  return (
    <div className={clsx(
      'relative rounded-lg border p-4 transition-all',
      selected && 'border-red-500 bg-red-50 ring-2 ring-red-500',
      conflicted && !selected && 'border-orange-300 bg-orange-50',
      badge && !selected && !conflicted && `${badge.borderCls} ${badge.bgCls}`,
      !selected && !conflicted && !badge && 'border-gray-200 bg-white hover:border-gray-300',
      disabled && 'opacity-60'
    )}>
      {conflicted && (
        <span className="absolute right-2 top-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          时间冲突
        </span>
      )}
      {badge && !conflicted && (
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${badge.badgeCls}`}>
          {badge.text}
        </span>
      )}
      <h4 className="text-sm font-semibold text-gray-900 pr-20">{cls.name}</h4>
      {cls.nameEn && <p className="text-xs text-gray-400">{cls.nameEn}</p>}
      <p className="mt-2 text-xs text-gray-500">{fmtSchedule(cls.schedule)}</p>
      {cls.teacher && <p className="text-xs text-gray-500">老师：{cls.teacher.name}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">${cls.fee}</span>
        {cls.spotsRemaining === 0 ? (
          <span className="text-xs text-red-600">已满 · 可候补</span>
        ) : (
          <span className="text-xs text-green-600">余 {cls.spotsRemaining} 位</span>
        )}
      </div>
      <button
        onClick={onClick}
        disabled={disabled && !selected}
        className={clsx(
          'mt-3 w-full rounded-md py-1.5 text-xs font-medium transition-colors',
          selected ? 'bg-red-600 text-white hover:bg-red-700'
            : conflicted ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        )}
      >
        {selected ? '已选 ✓' : conflicted ? '时间冲突' : cls.spotsRemaining === 0 ? '选择（加候补）' : '选择'}
      </button>
    </div>
  )
}

// ── Returning student banner ──────────────────────────────────────────────────

function ReturningBanner({ info }: { info: ReturningStudentInfo }) {
  if (!info.isReturning) return null
  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900">欢迎回来！/ Welcome Back!</p>
      {info.isGraduation ? (
        <p className="mt-1 text-sm text-amber-800">
          恭喜！该学生已完成最高级别，请联系学校了解进一步安排。
          <br />
          <span className="text-xs text-amber-700">
            Congratulations! This student has completed the highest level. Please contact the school.
          </span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-amber-800">
          根据去年的报名记录，我们已为您预选了推荐班级，您可以自由调整。
          <br />
          <span className="text-xs text-amber-700">
            Based on last year's enrollment, we've pre-selected recommended classes. You may change them freely.
          </span>
        </p>
      )}
      {info.previousChineseClass && (
        <p className="mt-2 text-xs text-amber-700">
          去年中文班 / Last year's Chinese class：<span className="font-medium">{info.previousChineseClass.name}</span>
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EnrollFlow({ initialStudents, chineseClasses, artsClasses, preselectedClassIds, returningStudentData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [students, setStudents] = useState<StudentData[]>(initialStudents)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedChineseId, setSelectedChineseId] = useState<string | null>(
    preselectedClassIds.find(id => chineseClasses.some(c => c.id === id)) ?? null
  )
  const [selectedArtsIds, setSelectedArtsIds] = useState<Set<string>>(
    new Set(preselectedClassIds.filter(id => artsClasses.some(c => c.id === id)))
  )
  const [selectedTextbookIds, setSelectedTextbookIds] = useState<Set<string>>(
    () => {
      const preClass = chineseClasses.find(c => preselectedClassIds.includes(c.id))
      return new Set(preClass?.textbooks.map(t => t.id) ?? [])
    }
  )
  const [languageTab, setLanguageTab] = useState<'CHL' | 'CSL'>('CHL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const selectedChineseClass = chineseClasses.find(c => c.id === selectedChineseId)
  const selectedArtsClasses = artsClasses.filter(c => selectedArtsIds.has(c.id))
  const currentReturningInfo = selectedStudentId ? returningStudentData[selectedStudentId] : undefined

  const allSelectedClassIds = [
    ...(selectedChineseId ? [selectedChineseId] : []),
    ...Array.from(selectedArtsIds),
  ]
  const selectedTextbooks = (selectedChineseClass?.textbooks ?? []).filter(t => selectedTextbookIds.has(t.id))
  const tuitionFee = [...(selectedChineseClass ? [selectedChineseClass] : []), ...selectedArtsClasses]
    .reduce((sum, c) => sum + parseFloat(c.fee), 0)
  const textbookFee = selectedTextbooks.reduce((sum, t) => sum + parseFloat(t.price), 0)
  const totalFee = tuitionFee + textbookFee

  function isConflictedWithSelections(cls: ClassData): boolean {
    if (selectedChineseClass && cls.id !== selectedChineseId && hasScheduleConflict(cls, selectedChineseClass)) return true
    for (const id of selectedArtsIds) {
      if (id === cls.id) continue
      const other = artsClasses.find(c => c.id === id)
      if (other && hasScheduleConflict(cls, other)) return true
    }
    return false
  }

  function selectChineseClass(classId: string | null) {
    setSelectedChineseId(classId)
    if (classId) {
      const cls = chineseClasses.find(c => c.id === classId)
      setSelectedTextbookIds(new Set(cls?.textbooks.map(t => t.id) ?? []))
    } else {
      setSelectedTextbookIds(new Set())
    }
  }

  function toggleTextbook(textbookId: string) {
    setSelectedTextbookIds(prev => {
      const next = new Set(prev)
      if (next.has(textbookId)) next.delete(textbookId)
      else next.add(textbookId)
      return next
    })
  }

  function handleSelectStudent(studentId: string) {
    setSelectedStudentId(studentId)
    const info = returningStudentData[studentId]
    if (info?.isReturning) {
      const chineseId = info.adminOverrideClassId ?? info.suggestedNextChineseClassIds[0] ?? null
      selectChineseClass(chineseId)
      setSelectedArtsIds(new Set(info.suggestedArtsClassIds))
    } else {
      selectChineseClass(null)
      setSelectedArtsIds(new Set())
    }
  }

  function toggleArts(cls: ClassData) {
    if (selectedArtsIds.has(cls.id)) {
      setSelectedArtsIds(prev => { const n = new Set(prev); n.delete(cls.id); return n })
    } else if (!isConflictedWithSelections(cls)) {
      setSelectedArtsIds(prev => new Set([...prev, cls.id]))
    }
  }

  async function handleSubmit() {
    if (!selectedStudentId || !selectedChineseId) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          classIds: allSelectedClassIds,
          textbookIds: Array.from(selectedTextbookIds),
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setSubmitError(json.error ?? '报名失败，请重试 / Enrollment failed, please try again')
        return
      }
      const enrollmentIds = json.data.enrollments.map((e: { id: string }) => e.id).join(',')
      router.push(`/checkout?enrollmentIds=${enrollmentIds}`)
    } catch {
      setSubmitError('网络错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Step renders ────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">选择学生</h2>
        <p className="text-sm text-gray-400 mb-5">Select Student</p>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          {students.map(s => {
            const info = returningStudentData[s.id]
            const isSelected = selectedStudentId === s.id
            return (
              <button key={s.id} onClick={() => handleSelectStudent(s.id)}
                className={clsx(
                  'rounded-lg border p-4 text-left transition-all',
                  isSelected
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.nameEn && <p className="text-sm text-gray-500">{s.nameEn}</p>}
                    {s.grade && <p className="mt-1 text-xs text-gray-400">年级：{s.grade}</p>}
                    {s.birthDate && (
                      <p className="text-xs text-gray-400">
                        生日：{new Date(s.birthDate).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                  </div>
                  {info?.isReturning && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      老生
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          <button onClick={() => setShowAddModal(true)}
            className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors">
            <span className="text-2xl">+</span>
            <p className="mt-1">添加学生 / Add Student</p>
          </button>
        </div>
      </div>
    )
  }

  function renderStep2() {
    const info = currentReturningInfo
    const chlClasses = chineseClasses.filter((c) => !c.nameEn?.startsWith('CSL'))
    const cslClasses = chineseClasses.filter((c) => c.nameEn?.startsWith('CSL'))
    const activeClasses = languageTab === 'CHL' ? chlClasses : cslClasses

    return (
      <div>
        {info && <ReturningBanner info={info} />}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">选择中文课程</h2>
        <p className="text-sm text-gray-400 mb-4">Select Language Class (choose 1 — required)</p>

        {/* CHL / CSL tabs */}
        <div className="flex gap-0 mb-5 border-b border-gray-200">
          {(
            [
              { key: 'CHL', label: 'CHL 母语班', count: chlClasses.length },
              { key: 'CSL', label: 'CSL 第二语言班', count: cslClasses.length },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setLanguageTab(key)}
              className={clsx(
                'px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                languageTab === key
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {label} <span className="ml-1 text-xs opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {info?.isReturning && !info.isGraduation && info.suggestedNextChineseClassIds.length > 0 && (
          <p className="text-xs text-blue-600 mb-4">蓝色高亮为推荐升级班级 / Blue = recommended next level</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeClasses.map((cls) => {
            let badgeVariant: BadgeVariant | undefined
            if (info?.isReturning) {
              if (info.adminOverrideClassId === cls.id) {
                badgeVariant = 'adminOverride'
              } else if (info.suggestedNextChineseClassIds.includes(cls.id)) {
                badgeVariant = 'recommended'
              }
            } else if (
              selectedStudent?.grade &&
              (cls.name.includes(selectedStudent.grade) || cls.nameEn?.includes(selectedStudent.grade))
            ) {
              badgeVariant = 'gradeMatch'
            }
            return (
              <MiniClassCard
                key={cls.id}
                cls={cls}
                selected={selectedChineseId === cls.id}
                badgeVariant={badgeVariant}
                onClick={() => selectChineseClass(selectedChineseId === cls.id ? null : cls.id)}
              />
            )
          })}
        </div>

        {/* Textbook selection — shown when a class with textbooks is selected */}
        {selectedChineseClass && selectedChineseClass.textbooks.length > 0 && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-900">
              教材选择 / Textbooks for {selectedChineseClass.nameEn ?? selectedChineseClass.name}
            </p>
            <div className="space-y-2">
              {selectedChineseClass.textbooks.map((tb) => (
                <label key={tb.id} className="flex cursor-pointer items-center justify-between rounded-md border border-blue-200 bg-white px-4 py-3 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTextbookIds.has(tb.id)}
                      onChange={() => toggleTextbook(tb.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tb.name}</p>
                      <p className="text-xs text-gray-500">{tb.nameZh}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">${parseFloat(tb.price).toFixed(2)}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              默认全选 — 取消勾选可移除 / All selected by default — uncheck to remove
            </p>
            <p className="mt-1 text-xs text-blue-700">
              教材将在上课当日在学校领取 / Books are picked up at school on class day
            </p>
          </div>
        )}
      </div>
    )
  }

  function renderStep3() {
    const info = currentReturningInfo
    return (
      <div>
        {info && <ReturningBanner info={info} />}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">选择才艺课程</h2>
        <p className="text-sm text-gray-400 mb-5">Select Arts Class (optional, Sunday 11:00 AM - 12:00 PM)</p>
        {artsClasses.length === 0 ? (
          <p className="text-sm text-gray-400">暂无才艺班 / No arts classes available</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artsClasses.map(cls => {
              const conflicted = isConflictedWithSelections(cls)
              let badgeVariant: BadgeVariant | undefined
              if (info?.isReturning && info.suggestedArtsClassIds.includes(cls.id)) {
                badgeVariant = 'sameAsLastYear'
              }
              return (
                <MiniClassCard key={cls.id} cls={cls}
                  selected={selectedArtsIds.has(cls.id)}
                  conflicted={conflicted && !selectedArtsIds.has(cls.id)}
                  disabled={conflicted}
                  badgeVariant={badgeVariant}
                  onClick={() => toggleArts(cls)}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderStep4() {
    const info = currentReturningInfo
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">确认报名信息</h2>
        <p className="text-sm text-gray-400 mb-5">Confirm Enrollment</p>
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {/* Student */}
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">学生 / Student</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{selectedStudent?.name}</p>
              {info?.isReturning && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  老生续报
                </span>
              )}
            </div>
            {selectedStudent?.nameEn && <p className="text-sm text-gray-500">{selectedStudent.nameEn}</p>}
            {selectedStudent?.grade && <p className="text-sm text-gray-500">年级：{selectedStudent.grade}</p>}
          </div>
          {/* Classes */}
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">课程费用 / Tuition</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {selectedChineseClass && (
                  <tr>
                    <td className="py-2 text-gray-900">{selectedChineseClass.nameEn ?? selectedChineseClass.name}</td>
                    <td className="py-2 text-right font-medium">${parseFloat(selectedChineseClass.fee).toFixed(2)}</td>
                  </tr>
                )}
                {selectedArtsClasses.map(cls => (
                  <tr key={cls.id}>
                    <td className="py-2 text-gray-900">{cls.nameEn ?? cls.name}</td>
                    <td className="py-2 text-right font-medium">${parseFloat(cls.fee).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Textbooks */}
          {selectedTextbooks.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">教材费用 / Textbooks</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {selectedTextbooks.map(tb => (
                    <tr key={tb.id}>
                      <td className="py-2 text-gray-900">
                        {tb.name}
                        <span className="ml-2 text-xs text-gray-400">{tb.nameZh}</span>
                      </td>
                      <td className="py-2 text-right font-medium">${parseFloat(tb.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-400">教材将在上课当日在学校领取 / Books are picked up at school on class day</p>
            </div>
          )}
          {/* Total */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">合计 / Total</span>
              <span className="text-red-600">${totalFee.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {submitError && (
          <p className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{submitError}</p>
        )}
      </div>
    )
  }

  // ── Navigation guards ────────────────────────────────────────────────────────

  function canAdvance() {
    if (step === 1) return !!selectedStudentId
    if (step === 2) return !!selectedChineseId
    if (step === 3) return true // arts classes are optional
    return false
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl">
      {/* Global input style */}
      <style>{`.input { display: block; width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; font-size: 14px; outline: none; } .input:focus { border-color: #dc2626; box-shadow: 0 0 0 1px #dc2626; }`}</style>

      <StepIndicator step={step} />

      <div className="min-h-[320px]">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <button
          onClick={() => setStep(s => (s - 1) as Step)}
          disabled={step === 1}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← 上一步 / Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(s => (s + 1) as Step)}
            disabled={!canAdvance()}
            className="rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一步 / Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-red-600 px-8 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? '提交中…' : '确认并去支付 / Confirm & Pay →'}
          </button>
        )}
      </div>

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onAdded={(s) => {
            setStudents(prev => [...prev, s])
            handleSelectStudent(s.id)
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
