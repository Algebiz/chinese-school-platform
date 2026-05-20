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

type Step = 1 | 2 | 3 | 4

interface Props {
  initialStudents: StudentData[]
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
  preselectedClassIds: string[]
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

// ── Mini class card (for steps 2 & 3) ────────────────────────────────────────

function MiniClassCard({
  cls,
  selected,
  disabled,
  conflicted,
  highlighted,
  onClick,
}: {
  cls: ClassData
  selected: boolean
  disabled?: boolean
  conflicted?: boolean
  highlighted?: boolean
  onClick: () => void
}) {
  return (
    <div className={clsx(
      'relative rounded-lg border p-4 transition-all',
      selected && 'border-red-500 bg-red-50 ring-2 ring-red-500',
      conflicted && !selected && 'border-orange-300 bg-orange-50',
      highlighted && !selected && !conflicted && 'border-blue-300 bg-blue-50',
      !selected && !conflicted && !highlighted && 'border-gray-200 bg-white hover:border-gray-300',
      disabled && 'opacity-60'
    )}>
      {conflicted && (
        <span className="absolute right-2 top-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          时间冲突
        </span>
      )}
      {highlighted && !conflicted && (
        <span className="absolute right-2 top-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          推荐
        </span>
      )}
      <h4 className="text-sm font-semibold text-gray-900">{cls.name}</h4>
      {cls.nameEn && <p className="text-xs text-gray-400">{cls.nameEn}</p>}
      <p className="mt-2 text-xs text-gray-500">{fmtSchedule(cls.schedule)}</p>
      {cls.teacher && <p className="text-xs text-gray-500">老师：{cls.teacher.name}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">${cls.fee}</span>
        {cls.spotsRemaining === 0 ? (
          <span className="text-xs text-red-600">已满</span>
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
        {selected ? '已选 ✓' : conflicted ? '时间冲突' : '选择'}
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EnrollFlow({ initialStudents, chineseClasses, artsClasses, preselectedClassIds }: Props) {
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const selectedChineseClass = chineseClasses.find(c => c.id === selectedChineseId)
  const selectedArtsClasses = artsClasses.filter(c => selectedArtsIds.has(c.id))

  const allSelectedClassIds = [
    ...(selectedChineseId ? [selectedChineseId] : []),
    ...Array.from(selectedArtsIds),
  ]
  const totalFee = [...(selectedChineseClass ? [selectedChineseClass] : []), ...selectedArtsClasses]
    .reduce((sum, c) => sum + parseFloat(c.fee), 0)

  function isConflictedWithSelections(cls: ClassData): boolean {
    if (selectedChineseClass && cls.id !== selectedChineseId && hasScheduleConflict(cls, selectedChineseClass)) return true
    for (const id of selectedArtsIds) {
      if (id === cls.id) continue
      const other = artsClasses.find(c => c.id === id)
      if (other && hasScheduleConflict(cls, other)) return true
    }
    return false
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
        body: JSON.stringify({ studentId: selectedStudentId, classIds: allSelectedClassIds }),
      })
      const json = await res.json()
      if (!json.success) {
        setSubmitError('报名失败，请重试 / Enrollment failed, please try again')
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
          {students.map(s => (
            <button key={s.id} onClick={() => setSelectedStudentId(s.id)}
              className={clsx(
                'rounded-lg border p-4 text-left transition-all',
                selectedStudentId === s.id
                  ? 'border-red-500 bg-red-50 ring-2 ring-red-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}>
              <p className="font-medium text-gray-900">{s.name}</p>
              {s.nameEn && <p className="text-sm text-gray-500">{s.nameEn}</p>}
              {s.grade && <p className="mt-1 text-xs text-gray-400">年级：{s.grade}</p>}
              {s.birthDate && (
                <p className="text-xs text-gray-400">
                  生日：{new Date(s.birthDate).toLocaleDateString('zh-CN')}
                </p>
              )}
            </button>
          ))}
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
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">选择中文班</h2>
        <p className="text-sm text-gray-400 mb-1">Select Chinese Class (required, choose one)</p>
        {selectedStudent?.grade && (
          <p className="text-xs text-blue-600 mb-4">蓝色标注为推荐年级班级 / Blue = recommended for {selectedStudent.grade}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chineseClasses.map(cls => {
            const highlighted = !!(selectedStudent?.grade &&
              (cls.name.includes(selectedStudent.grade) || cls.nameEn?.includes(selectedStudent.grade)))
            return (
              <MiniClassCard key={cls.id} cls={cls}
                selected={selectedChineseId === cls.id}
                highlighted={highlighted}
                onClick={() => setSelectedChineseId(prev => prev === cls.id ? null : cls.id)}
              />
            )
          })}
        </div>
      </div>
    )
  }

  function renderStep3() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">选择才艺班</h2>
        <p className="text-sm text-gray-400 mb-5">Select Arts Classes (optional, choose any)</p>
        {artsClasses.length === 0 ? (
          <p className="text-sm text-gray-400">暂无才艺班 / No arts classes available</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artsClasses.map(cls => {
              const conflicted = isConflictedWithSelections(cls)
              return (
                <MiniClassCard key={cls.id} cls={cls}
                  selected={selectedArtsIds.has(cls.id)}
                  conflicted={conflicted && !selectedArtsIds.has(cls.id)}
                  disabled={conflicted}
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
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">确认报名信息</h2>
        <p className="text-sm text-gray-400 mb-5">Confirm Enrollment</p>
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {/* Student */}
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">学生 / Student</p>
            <p className="font-medium text-gray-900">{selectedStudent?.name}</p>
            {selectedStudent?.nameEn && <p className="text-sm text-gray-500">{selectedStudent.nameEn}</p>}
            {selectedStudent?.grade && <p className="text-sm text-gray-500">年级：{selectedStudent.grade}</p>}
          </div>
          {/* Classes */}
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">班级 / Classes</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {selectedChineseClass && (
                  <tr>
                    <td className="py-2 text-gray-900">{selectedChineseClass.name}</td>
                    <td className="py-2 text-right font-medium">${selectedChineseClass.fee}</td>
                  </tr>
                )}
                {selectedArtsClasses.map(cls => (
                  <tr key={cls.id}>
                    <td className="py-2 text-gray-900">{cls.name}</td>
                    <td className="py-2 text-right font-medium">${cls.fee}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td className="pt-3 font-semibold text-gray-900">合计 / Total</td>
                  <td className="pt-3 text-right text-lg font-bold text-red-600">
                    ${totalFee.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
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
            setSelectedStudentId(s.id)
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
