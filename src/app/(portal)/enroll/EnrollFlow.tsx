'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

type Step = 1 | 2

export interface ConfirmedLanguageClass {
  id: string
  name: string
  nameEn: string | null
  teacherName: string | null
  schedule: string
}

interface StudentSel {
  languageClassId: string | null
  artClassIds: string[]
  textbookIds: string[]
  skip: boolean
  error: string | null
  errorCode: string | null
}

interface Props {
  initialStudents: StudentData[]
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
  preselectedClassIds: string[]
  returningStudentData: Record<string, ReturningStudentInfo>
  initialStudentId?: string | null
  artsOnly?: boolean
  confirmedLanguageClass?: ConfirmedLanguageClass | null
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

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

function hasConflict(a: ClassData, b: ClassData): boolean {
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
  return `${s.dayOfWeek} ${s.startTime ?? ''}–${s.endTime ?? ''}${s.room ? ` · ${s.room}` : ''}`
}

// ── Step indicator (3 steps) ──────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const labels = ['选择课程', '确认 & 付款']
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((label, i) => {
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
              <span className={clsx('mt-1 text-xs', active ? 'font-medium text-red-600' : 'text-gray-400')}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={clsx('mx-2 mb-4 h-px w-12 sm:w-20', n < step ? 'bg-red-600' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Add Student Modal ─────────────────────────────────────────────────────────

function AddStudentModal({ onClose, onAdded }: { onClose: () => void; onAdded: (s: StudentData) => void }) {
  const [form, setForm] = useState({ name: '', nameEn: '', birthDate: '', grade: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('请输入学生姓名'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (!json.success) { setError('添加失败，请重试'); return }
      onAdded(json.data)
    } catch { setError('网络错误，请重试') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">添加学生</h2>
        <p className="text-sm text-gray-400 mb-5">Add Student</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {[
            { label: '中文姓名 / Chinese Name *', key: 'name', required: true },
            { label: '英文姓名 / English Name',   key: 'nameEn' },
            { label: '年级 / Grade',               key: 'grade', placeholder: 'e.g. 3rd Grade' },
          ].map(({ label, key, required, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
              <input required={required} placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">取消 / Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? '保存中…' : '保存 / Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Student enrollment card (Step 1) ─────────────────────────────────────────

function StudentCard({
  student,
  sel,
  returningInfo,
  chineseClasses,
  artsClasses,
  artsOnly,
  confirmedLanguageClass,
  onUpdate,
}: {
  student: StudentData
  sel: StudentSel
  returningInfo?: ReturningStudentInfo
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
  artsOnly?: boolean
  confirmedLanguageClass?: ConfirmedLanguageClass | null
  onUpdate: (patch: Partial<StudentSel>) => void
}) {
  const isReturning = returningInfo?.isReturning

  // When language class changes, auto-populate textbooks
  function selectLanguage(classId: string | null) {
    const cls = classId ? chineseClasses.find(c => c.id === classId) : null
    onUpdate({
      languageClassId: classId,
      textbookIds: cls?.textbooks.map(t => t.id) ?? [],
      error: null,
      errorCode: null,
    })
  }

  function toggleArt(classId: string) {
    const langCls = sel.languageClassId ? chineseClasses.find(c => c.id === sel.languageClassId) : null
    const artCls = artsClasses.find(c => c.id === classId)
    if (!artCls) return
    if (!sel.artClassIds.includes(classId) && langCls && hasConflict(artCls, langCls)) return
    const newIds = sel.artClassIds.includes(classId)
      ? sel.artClassIds.filter(id => id !== classId)
      : [...sel.artClassIds, classId]
    onUpdate({ artClassIds: newIds, error: null, errorCode: null })
  }

  function toggleTextbook(tbId: string) {
    const newIds = sel.textbookIds.includes(tbId)
      ? sel.textbookIds.filter(id => id !== tbId)
      : [...sel.textbookIds, tbId]
    onUpdate({ textbookIds: newIds })
  }

  const langCls = sel.languageClassId ? chineseClasses.find(c => c.id === sel.languageClassId) : null
  const artClasses = artsClasses.filter(c => sel.artClassIds.includes(c.id))
  const selectedTextbooks = langCls?.textbooks.filter(t => sel.textbookIds.includes(t.id)) ?? []

  const tuition = (langCls ? parseFloat(langCls.fee) : 0) + artClasses.reduce((s, c) => s + parseFloat(c.fee), 0)
  const textbookTotal = selectedTextbooks.reduce((s, t) => s + parseFloat(t.price), 0)
  const subtotal = tuition + textbookTotal

  const BADGE_MAP: Record<string, string> = {
    recommended:    'bg-blue-100 text-blue-700',
    sameAsLastYear: 'bg-green-100 text-green-700',
    adminOverride:  'bg-yellow-100 text-yellow-700',
  }
  const BADGE_TEXT: Record<string, string> = {
    recommended:    '推荐升级',
    sameAsLastYear: '去年同款',
    adminOverride:  '管理员推荐',
  }

  function languageBadge(cls: ClassData): string | null {
    if (!returningInfo?.isReturning) return null
    if (returningInfo.adminOverrideClassId === cls.id) return 'adminOverride'
    if (returningInfo.suggestedNextChineseClassIds.includes(cls.id)) return 'recommended'
    return null
  }
  function artsBadge(cls: ClassData): string | null {
    if (returningInfo?.isReturning && returningInfo.suggestedArtsClassIds.includes(cls.id)) return 'sameAsLastYear'
    return null
  }

  if (sel.skip) {
    return (
      <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#F9FAFB', opacity: 0.7 }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#9CA3AF', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
              {student.name.substring(0, 1)}
            </div>
            <div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280' }}>{student.name}</span>
              {student.nameEn && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>{student.nameEn}</span>}
            </div>
          </div>
          <button onClick={() => onUpdate({ skip: false })} style={{ fontSize: 12, color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer' }}>
            取消跳过 / Undo skip
          </button>
        </div>
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: '#9ca3af' }}>
          此学生将不参与本次报名 / This student is skipped for this enrollment
        </div>
      </div>
    )
  }

  return (
    <div style={{ border: sel.error ? '0.5px solid #FCA5A5' : '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
      {/* Student header */}
      <div style={{ padding: '12px 16px', background: '#F9FAFB', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#CC0000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
            {student.name.substring(0, 1)}
          </div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{student.name}</span>
            {student.nameEn && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>{student.nameEn}</span>}
            {isReturning && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#FAEEDA', color: '#BA7517', fontWeight: 500 }}>老生</span>}
            {!isReturning && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: '#EAF3DE', color: '#3B6D11', fontWeight: 500 }}>新生</span>}
          </div>
        </div>
        {!artsOnly && (
          <button onClick={() => onUpdate({ skip: true })} style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
            跳过 / Skip
          </button>
        )}
      </div>

      {/* Per-student error */}
      {sel.error && (
        <div style={{ background: '#FCEBEB', padding: '10px 16px', borderBottom: '0.5px solid #FCA5A5', fontSize: 13, color: '#A32D2D' }}>
          {sel.error}
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Language class section */}
        {artsOnly && confirmedLanguageClass ? (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              中文班（已注册） / Language Class (Enrolled)
            </p>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#EAF3DE', border: '0.5px solid #BBF7D0', fontSize: 13, color: '#374151' }}>
              <span style={{ fontWeight: 500 }}>{confirmedLanguageClass.name}</span>
              {confirmedLanguageClass.nameEn && <span style={{ color: '#6b7280', marginLeft: 6 }}>{confirmedLanguageClass.nameEn}</span>}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              中文班（必选） / Language Class (required)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {chineseClasses.map(cls => {
                const isSelected = sel.languageClassId === cls.id
                const badgeKey = languageBadge(cls)
                return (
                  <label key={cls.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7,
                    border: isSelected ? '0.5px solid #CC0000' : '0.5px solid #E5E7EB',
                    background: isSelected ? '#FFF5F5' : 'white',
                    cursor: 'pointer', transition: 'background 0.1s',
                  }}>
                    <input type="radio" name={`lang-${student.id}`} checked={isSelected}
                      onChange={() => selectLanguage(isSelected ? null : cls.id)}
                      style={{ accentColor: '#CC0000', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{cls.name}</span>
                        {badgeKey && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500 }} className={BADGE_MAP[badgeKey]}>
                            {BADGE_TEXT[badgeKey]}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{fmtSchedule(cls.schedule)}</span>
                      {cls.spotsRemaining === 0 && <span style={{ fontSize: 11, color: '#A32D2D', marginLeft: 6 }}>已满</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flexShrink: 0 }}>${parseFloat(cls.fee).toFixed(0)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Textbooks */}
        {langCls && langCls.textbooks.length > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              教材 / Textbooks
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {langCls.textbooks.map(tb => (
                <label key={tb.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, border: '0.5px solid #E5E7EB', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sel.textbookIds.includes(tb.id)} onChange={() => toggleTextbook(tb.id)} style={{ accentColor: '#CC0000' }} />
                  <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{tb.name}<span style={{ color: '#9ca3af', marginLeft: 4 }}>{tb.nameZh}</span></span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>${parseFloat(tb.price).toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Arts classes */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            才艺班（可选） / Arts Classes (optional)
          </p>
          {artsClasses.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>暂无才艺班 / None available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {artsClasses.map(cls => {
                const isSelected = sel.artClassIds.includes(cls.id)
                const conflicted = !isSelected && langCls ? hasConflict(cls, langCls) : false
                const badgeKey = artsBadge(cls)
                return (
                  <label key={cls.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6,
                    border: isSelected ? '0.5px solid #CC0000' : conflicted ? '0.5px solid #FCA5A5' : '0.5px solid #E5E7EB',
                    background: isSelected ? '#FFF5F5' : conflicted ? '#FCEBEB' : 'white',
                    cursor: conflicted && !isSelected ? 'not-allowed' : 'pointer', opacity: conflicted && !isSelected ? 0.6 : 1,
                  }}>
                    <input type="checkbox" checked={isSelected} disabled={conflicted && !isSelected}
                      onChange={() => toggleArt(cls.id)} style={{ accentColor: '#CC0000', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{cls.name}</span>
                        {badgeKey && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#EAF3DE', color: '#3B6D11', fontWeight: 500 }}>
                            {BADGE_TEXT[badgeKey]}
                          </span>
                        )}
                        {conflicted && <span style={{ fontSize: 10, color: '#A32D2D' }}>时间冲突</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{fmtSchedule(cls.schedule)}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flexShrink: 0 }}>${parseFloat(cls.fee).toFixed(0)}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Student subtotal */}
        <div style={{ borderTop: '0.5px solid #E5E7EB', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {langCls ? (1 + artClasses.length) : artClasses.length} 门课{selectedTextbooks.length > 0 ? ` + ${selectedTextbooks.length} 本教材` : ''}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#CC0000' }}>${subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main EnrollFlow ───────────────────────────────────────────────────────────

export function EnrollFlow({
  initialStudents,
  chineseClasses,
  artsClasses,
  preselectedClassIds,
  returningStudentData,
  initialStudentId = null,
  artsOnly = false,
  confirmedLanguageClass = null,
}: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [students, setStudents] = useState<StudentData[]>(initialStudents)
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Init per-student selections
  const initSel = useCallback((): Record<string, StudentSel> => {
    const result: Record<string, StudentSel> = {}
    for (const s of initialStudents) {
      const info = returningStudentData[s.id]
      let langId: string | null = null
      let artIds: string[] = []
      let tbIds: string[] = []

      if (!artsOnly) {
        if (info?.isReturning) {
          langId = info.adminOverrideClassId ?? info.suggestedNextChineseClassIds[0] ?? null
          artIds = [...info.suggestedArtsClassIds]
        }
        if (initialStudentId === s.id) {
          const preLang = preselectedClassIds.find(id => chineseClasses.some(c => c.id === id))
          if (preLang) langId = preLang
          const preArts = preselectedClassIds.filter(id => artsClasses.some(c => c.id === id))
          if (preArts.length > 0) artIds = preArts
        }
        if (langId) {
          const cls = chineseClasses.find(c => c.id === langId)
          tbIds = cls?.textbooks.map(t => t.id) ?? []
        }
      }

      result[s.id] = {
        languageClassId: langId,
        artClassIds: artIds,
        textbookIds: tbIds,
        skip: artsOnly ? s.id !== initialStudentId : false,
        error: null,
        errorCode: null,
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [selections, setSelections] = useState<Record<string, StudentSel>>(initSel)

  function updateSel(studentId: string, patch: Partial<StudentSel>) {
    setSelections(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }))
  }

  // Which students are active (not skipped)
  const activeStudents = students.filter(s => !selections[s.id]?.skip)

  // Can advance from step 1: each active student must have a language class (or artsOnly)
  const readyStudents = activeStudents.filter(s => {
    const sel = selections[s.id]
    if (!sel) return false
    if (artsOnly) return sel.artClassIds.length > 0
    return !!sel.languageClassId
  })
  const pendingStudents = activeStudents.filter(s => !readyStudents.some(r => r.id === s.id))
  const canAdvance = activeStudents.length > 0 && pendingStudents.length === 0

  // Build combined fee breakdown for review
  function buildBreakdown() {
    return activeStudents.map(s => {
      const sel = selections[s.id] ?? { languageClassId: null, artClassIds: [], textbookIds: [], skip: false, error: null, errorCode: null }
      const langCls = sel.languageClassId ? chineseClasses.find(c => c.id === sel.languageClassId) : null
      const artClasses = artsClasses.filter(c => sel.artClassIds.includes(c.id))
      const textbooks = langCls?.textbooks.filter(t => sel.textbookIds.includes(t.id)) ?? []
      const subtotal = (langCls ? parseFloat(langCls.fee) : 0)
        + artClasses.reduce((sum, c) => sum + parseFloat(c.fee), 0)
        + textbooks.reduce((sum, t) => sum + parseFloat(t.price), 0)
      return { student: s, langCls, artClasses, textbooks, subtotal }
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setGlobalError(null)
    // Clear per-student errors
    setSelections(prev => {
      const next = { ...prev }
      for (const id of Object.keys(next)) next[id] = { ...next[id], error: null, errorCode: null }
      return next
    })

    const enrollPayload = activeStudents.map(s => {
      const sel = selections[s.id]
      const classIds = [
        ...(!artsOnly && sel.languageClassId ? [sel.languageClassId] : []),
        ...sel.artClassIds,
      ]
      return { studentId: s.id, classIds, textbookIds: sel.textbookIds }
    }).filter(e => e.classIds.length > 0)

    if (enrollPayload.length === 0) {
      setGlobalError('请至少为一名学生选择课程 / Please select classes for at least one student')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollments: enrollPayload }),
      })
      const json = await res.json()

      if (!json.success) {
        if (json.errors && Array.isArray(json.errors)) {
          // Per-student errors — show them inline and go back to step 1
          setSelections(prev => {
            const next = { ...prev }
            for (const err of json.errors) {
              if (next[err.studentId]) {
                next[err.studentId] = { ...next[err.studentId], error: err.error, errorCode: err.code }
              }
            }
            return next
          })
          setStep(1)
        } else {
          setGlobalError(json.error ?? '报名失败，请重试 / Enrollment failed, please try again')
        }
        return
      }

      const ids: string[] = json.enrollmentIds ?? []
      router.push(`/checkout?enrollmentIds=${ids.join(',')}`)
    } catch {
      setGlobalError('网络错误，请重试 / Network error, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const breakdown = buildBreakdown()
  const totalFee = breakdown.reduce((s, b) => s + b.subtotal, 0)

  // ── Render Step 1 ───────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {students.map(s => (
            <StudentCard
              key={s.id}
              student={s}
              sel={selections[s.id] ?? { languageClassId: null, artClassIds: [], textbookIds: [], skip: false, error: null, errorCode: null }}
              returningInfo={returningStudentData[s.id]}
              chineseClasses={chineseClasses}
              artsClasses={artsClasses}
              artsOnly={artsOnly}
              confirmedLanguageClass={artsOnly && s.id === initialStudentId ? confirmedLanguageClass : null}
              onUpdate={patch => updateSel(s.id, patch)}
            />
          ))}
          {/* Add student card */}
          <button onClick={() => setShowAddModal(true)}
            style={{ border: '0.5px dashed #E5E7EB', borderRadius: 12, padding: '24px 16px', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 24, color: '#D1D5DB' }}>+</span>
            添加学生 / Add Student
          </button>
        </div>

        {/* Status summary */}
        <div style={{ marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          {pendingStudents.length > 0 ? (
            <span style={{ color: '#BA7517' }}>
              {readyStudents.length} 名学生已就绪，{pendingStudents.length} 名待选课
              {' / '}
              {readyStudents.length} ready, {pendingStudents.length} pending
            </span>
          ) : activeStudents.length > 0 ? (
            <span style={{ color: '#3B6D11' }}>
              全部 {readyStudents.length} 名学生已就绪 / All {readyStudents.length} students ready
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  // ── Render Step 2 (Review) ──────────────────────────────────────────────────

  function renderStep2() {
    return (
      <div style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111827', marginBottom: 16 }}>
          确认报名信息 / Confirm Enrollment
        </h2>

        <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
          {breakdown.map((b, i) => (
            <div key={b.student.id} style={{ borderBottom: i < breakdown.length - 1 ? '0.5px solid #E5E7EB' : 'none', padding: '14px 20px' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 10 }}>
                {b.student.name}{b.student.nameEn ? ` (${b.student.nameEn})` : ''}
              </p>
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  {b.langCls && (
                    <tr>
                      <td style={{ color: '#374151', paddingBottom: 4 }}>{b.langCls.nameEn ?? b.langCls.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: '#111827' }}>${parseFloat(b.langCls.fee).toFixed(2)}</td>
                    </tr>
                  )}
                  {b.artClasses.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: '#374151', paddingBottom: 4 }}>{c.nameEn ?? c.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: '#111827' }}>${parseFloat(c.fee).toFixed(2)}</td>
                    </tr>
                  ))}
                  {b.textbooks.map(tb => (
                    <tr key={tb.id}>
                      <td style={{ color: '#6b7280', paddingLeft: 12, paddingBottom: 4 }}>{tb.name}</td>
                      <td style={{ textAlign: 'right', color: '#6b7280' }}>${parseFloat(tb.price).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ color: '#9ca3af', fontSize: 12, borderTop: '0.5px solid #F3F4F6', paddingTop: 6 }}>小计 / Subtotal</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#111827', borderTop: '0.5px solid #F3F4F6', paddingTop: 6 }}>${b.subtotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          {/* Total */}
          <div style={{ background: '#F9FAFB', padding: '14px 20px', borderTop: '0.5px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: '#111827' }}>合计 / Total</span>
              <span style={{ color: '#CC0000' }}>${totalFee.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              * 含志愿服务押金 $100（首次报名收取，完成志愿服务后可申请退还）
              {' / '}
              Includes $100 volunteer deposit (refundable after volunteer service)
            </p>
          </div>
        </div>

        {globalError && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: '#FCEBEB', border: '0.5px solid #FCA5A5', borderRadius: 8, fontSize: 13, color: '#A32D2D' }}>
            {globalError}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <style>{`.enroll-input { display: block; width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 12px; font-size: 14px; outline: none; } .enroll-input:focus { border-color: #dc2626; }`}</style>

      <StepIndicator step={step} />

      <div style={{ minHeight: 320 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </div>

      {/* Navigation */}
      <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid #E5E7EB', paddingTop: 20 }}>
        <button
          onClick={() => step === 1 ? router.push('/dashboard') : setStep(1)}
          style={{ padding: '8px 20px', borderRadius: 6, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
        >
          {step === 1 ? '← 取消 / Cancel' : '← 返回修改 / Back'}
        </button>

        {step === 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {readyStudents.length}/{activeStudents.length} 就绪 / ready
            </span>
            <button
              onClick={() => setStep(2)}
              disabled={!canAdvance}
              style={{ padding: '8px 24px', borderRadius: 6, background: canAdvance ? '#CC0000' : '#E5E7EB', color: canAdvance ? 'white' : '#9ca3af', border: 'none', fontSize: 13, fontWeight: 600, cursor: canAdvance ? 'pointer' : 'not-allowed' }}
            >
              下一步：确认 / Next: Review →
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '8px 28px', borderRadius: 6, background: submitting ? '#E5E7EB' : '#CC0000', color: submitting ? '#9ca3af' : 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? '提交中…' : '确认并去支付 / Confirm & Pay →'}
          </button>
        )}
      </div>

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onAdded={s => {
            setStudents(prev => [...prev, s])
            setSelections(prev => ({
              ...prev,
              [s.id]: { languageClassId: null, artClassIds: [], textbookIds: [], skip: false, error: null, errorCode: null },
            }))
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
