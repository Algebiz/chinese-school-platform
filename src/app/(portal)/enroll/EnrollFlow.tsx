'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import type { ClassData } from '@/components/ClassCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useCart } from '@/lib/cart/CartContext'
import type { EarlyBirdInfo } from '@/lib/early-bird'

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

export interface ConfirmedLanguageClass {
  id: string
  name: string
  nameEn: string | null
  teacherName: string | null
  schedule: string
}

interface Props {
  initialStudents: StudentData[]
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
  preselectedClassIds: string[]
  returningStudentData: Record<string, ReturningStudentInfo>
  initialStudentId?: string | null
  initialStep?: Step
  artsOnly?: boolean
  confirmedLanguageClass?: ConfirmedLanguageClass | null
  earlyBird?: EarlyBirdInfo
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
  if (!s?.dayOfWeek) return 'TBD'
  return `${s.dayOfWeek} ${s.startTime ?? ''}–${s.endTime ?? ''}${s.room ? ` | ${s.room}` : ''}`
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const { t } = useLanguage()
  const STEP_LABELS = [
    t('选择学生', 'Student'),
    t('中文班', 'Language Class'),
    t('才艺班', 'Arts Class'),
    t('确认', 'Confirm'),
  ]
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
  const { t } = useLanguage()
  const [form, setForm] = useState({ name: '', nameEn: '', birthDate: '', grade: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('请输入学生姓名', 'Please enter student name')); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) { setError(t('添加失败，请重试', 'Add failed, please try again')); return }
      onAdded(json.data)
    } catch {
      setError(t('网络错误，请重试', 'Network error, please try again'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('添加学生', 'Add Student')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('中文姓名', 'Chinese Name')} *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('英文姓名', 'English Name')}</label>
            <input value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('出生日期', 'Date of Birth')}</label>
            <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('年级', 'Grade')}</label>
            <input placeholder="e.g. 3rd Grade" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('取消', 'Cancel')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? t('保存中…', 'Saving…') : t('保存', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Mini class card ───────────────────────────────────────────────────────────

type BadgeVariant = 'recommended' | 'sameAsLastYear' | 'adminOverride' | 'gradeMatch'

const BADGE_STYLE: Record<BadgeVariant, { badgeCls: string; borderCls: string; bgCls: string }> = {
  recommended:    { badgeCls: 'bg-blue-100 text-blue-700',   borderCls: 'border-blue-300',   bgCls: 'bg-blue-50'   },
  sameAsLastYear: { badgeCls: 'bg-green-100 text-green-700', borderCls: 'border-green-300',  bgCls: 'bg-green-50'  },
  adminOverride:  { badgeCls: 'bg-yellow-100 text-yellow-700', borderCls: 'border-yellow-300', bgCls: 'bg-yellow-50' },
  gradeMatch:     { badgeCls: 'bg-blue-100 text-blue-700',   borderCls: 'border-blue-200',   bgCls: 'bg-blue-50'   },
}

function MiniClassCard({
  cls, selected, disabled, conflicted, badgeVariant, onClick, earlyBird,
}: {
  cls: ClassData; selected: boolean; disabled?: boolean; conflicted?: boolean
  badgeVariant?: BadgeVariant; onClick: () => void; earlyBird?: EarlyBirdInfo
}) {
  const { t, lang } = useLanguage()

  const badgeText: Record<BadgeVariant, string> = {
    recommended:    t('推荐升级', 'Recommended'),
    sameAsLastYear: t('去年同款', 'Same as last year'),
    adminOverride:  t('管理员推荐', 'Admin recommended'),
    gradeMatch:     t('推荐', 'Recommended'),
  }

  const style = badgeVariant ? BADGE_STYLE[badgeVariant] : null
  const displayName = lang === 'en' ? (cls.nameEn || cls.name) : cls.name
  const teacherName = cls.teacher
    ? (lang === 'en' ? (cls.teacher.nameEn || cls.teacher.name) : cls.teacher.name)
    : null

  const originalFee = parseFloat(cls.fee)
  const ebActive = earlyBird?.isActive && cls.type === 'CHINESE'
  const ebDiscount = ebActive ? Math.min(earlyBird!.discount, originalFee) : 0
  const discountedFee = originalFee - ebDiscount

  return (
    <div className={clsx(
      'relative rounded-lg border p-4 transition-all cursor-pointer',
      selected && 'border-red-500 bg-red-50 ring-2 ring-red-500',
      conflicted && !selected && 'border-orange-300 bg-orange-50',
      style && !selected && !conflicted && `${style.borderCls} ${style.bgCls}`,
      !selected && !conflicted && !style && 'border-gray-200 bg-white hover:border-gray-300',
      disabled && 'opacity-60'
    )}>
      {conflicted && (
        <span className="absolute right-2 top-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          {t('时间冲突', 'Time conflict')}
        </span>
      )}
      {style && !conflicted && badgeVariant && (
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${style.badgeCls}`}>
          {badgeText[badgeVariant]}
        </span>
      )}
      <h4 className="text-sm font-semibold text-gray-900 pr-20">{displayName}</h4>
      {cls.nameEn && lang === 'zh' && <p className="text-xs text-gray-400">{cls.nameEn}</p>}
      <p className="mt-2 text-xs text-gray-500">{fmtSchedule(cls.schedule)}</p>
      {teacherName && <p className="text-xs text-gray-500">{t('老师', 'Teacher')}: {teacherName}</p>}
      <div className="mt-2 flex items-center justify-between">
        {ebActive ? (
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 line-through">${originalFee.toFixed(0)}</span>
            <span className="text-sm font-semibold text-green-700">${discountedFee.toFixed(0)}</span>
            <span className="text-xs bg-green-100 text-green-700 rounded px-1">-${ebDiscount.toFixed(0)}</span>
          </span>
        ) : (
          <span className="text-sm font-medium text-gray-900">${cls.fee}</span>
        )}
        {cls.spotsRemaining === 0 ? (
          <span className="text-xs text-red-600">{t('已满', 'Full')} · {t('可候补', 'waitlist')}</span>
        ) : (
          <span className="text-xs text-green-600">{t('余', '')} {cls.spotsRemaining} {t('位', 'spots')}</span>
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
        {selected
          ? `${t('已选', 'Selected')} ✓`
          : conflicted
            ? t('时间冲突', 'Time conflict')
            : cls.spotsRemaining === 0
              ? t('选择（加候补）', 'Join Waitlist')
              : t('选择', 'Select')}
      </button>
    </div>
  )
}

// ── Returning student banner ──────────────────────────────────────────────────

function ReturningBanner({ info }: { info: ReturningStudentInfo }) {
  const { t, lang } = useLanguage()
  if (!info.isReturning) return null
  return (
    <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900">{t('欢迎回来！', 'Welcome Back!')}</p>
      {info.isGraduation ? (
        <p className="mt-1 text-sm text-amber-800">
          {t(
            '恭喜！该学生已完成最高级别，请联系学校了解进一步安排。',
            'Congratulations! This student has completed the highest level. Please contact the school.'
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm text-amber-800">
          {t(
            '根据去年的报名记录，我们已为您预选了推荐班级，您可以自由调整。',
            "Based on last year's enrollment, we've pre-selected recommended classes. You may change them freely."
          )}
        </p>
      )}
      {info.previousChineseClass && (
        <p className="mt-2 text-xs text-amber-700">
          {t('去年中文班', "Last year's class")}: <span className="font-medium">
            {lang === 'en'
              ? (info.previousChineseClass.nameEn || info.previousChineseClass.name)
              : info.previousChineseClass.name}
          </span>
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function EnrollFlow({
  initialStudents, chineseClasses, artsClasses, preselectedClassIds,
  returningStudentData, initialStudentId = null, initialStep = 1,
  artsOnly = false, confirmedLanguageClass = null, earlyBird,
}: Props) {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const { addToCart, total: cartTotal } = useCart()
  const [addedToCart, setAddedToCart] = useState(false)
  const [cartAddedInfo, setCartAddedInfo] = useState<{ studentName: string; classes: string[]; subtotal: number; waitlistedClasses: string[] } | null>(null)
  const [waitlistedOnly, setWaitlistedOnly] = useState<{ classes: string[] } | null>(null)

  const [step, setStep] = useState<Step>(initialStep)
  const [isArtsOnly, setIsArtsOnly] = useState(artsOnly)
  const [students, setStudents] = useState<StudentData[]>(initialStudents)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId ?? null)
  const [selectedChineseId, setSelectedChineseId] = useState<string | null>(
    artsOnly ? null : (preselectedClassIds.find(id => chineseClasses.some(c => c.id === id)) ?? null)
  )
  const [selectedArtsIds, setSelectedArtsIds] = useState<Set<string>>(
    new Set(preselectedClassIds.filter(id => artsClasses.some(c => c.id === id)))
  )
  const [selectedTextbookIds, setSelectedTextbookIds] = useState<Set<string>>(() => {
    if (artsOnly) return new Set<string>()
    const preClass = chineseClasses.find(c => preselectedClassIds.includes(c.id))
    return new Set(preClass?.textbooks.map(tb => tb.id) ?? [])
  })
  const [languageTab, setLanguageTab] = useState<'CHL' | 'CSL'>('CHL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<{ code: string; message: string } | null>(null)

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const selectedChineseClass = chineseClasses.find(c => c.id === selectedChineseId)
  const selectedArtsClasses = artsClasses.filter(c => selectedArtsIds.has(c.id))
  const currentReturningInfo = selectedStudentId ? returningStudentData[selectedStudentId] : undefined

  const allSelectedClassIds = [
    ...(!isArtsOnly && selectedChineseId ? [selectedChineseId] : []),
    ...Array.from(selectedArtsIds),
  ]
  const selectedTextbooks = (selectedChineseClass?.textbooks ?? []).filter(tb => selectedTextbookIds.has(tb.id))
  const tuitionFee = [...(selectedChineseClass ? [selectedChineseClass] : []), ...selectedArtsClasses]
    .reduce((sum, c) => sum + parseFloat(c.fee), 0)
  const textbookFee = selectedTextbooks.reduce((sum, tb) => sum + parseFloat(tb.price), 0)
  const earlyBirdDiscount = (!isArtsOnly && selectedChineseClass && earlyBird?.isActive)
    ? Math.min(earlyBird.discount, parseFloat(selectedChineseClass.fee))
    : 0
  const totalFee = tuitionFee + textbookFee - earlyBirdDiscount

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
    setSubmitError(null)
    if (classId) {
      const cls = chineseClasses.find(c => c.id === classId)
      setSelectedTextbookIds(new Set(cls?.textbooks.map(tb => tb.id) ?? []))
    } else {
      setSelectedTextbookIds(new Set())
    }
  }

  function toggleTextbook(textbookId: string) {
    setSelectedTextbookIds(prev => {
      const next = new Set(prev)
      next.has(textbookId) ? next.delete(textbookId) : next.add(textbookId)
      return next
    })
  }

  function handleSelectStudent(studentId: string) {
    const exitingArtsOnly = isArtsOnly && studentId !== (initialStudentId ?? '')
    if (exitingArtsOnly) setIsArtsOnly(false)
    setSelectedStudentId(studentId)
    if (!isArtsOnly || exitingArtsOnly) {
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
  }

  function toggleArts(cls: ClassData) {
    if (selectedArtsIds.has(cls.id)) {
      setSelectedArtsIds(prev => { const n = new Set(prev); n.delete(cls.id); return n })
    } else if (!isConflictedWithSelections(cls)) {
      setSelectedArtsIds(prev => new Set([...prev, cls.id]))
    }
  }

  async function handleSubmit() {
    if (!selectedStudentId) return
    if (!isArtsOnly && !selectedChineseId) return
    if (allSelectedClassIds.length === 0) {
      setSubmitError({ code: 'NO_CLASSES', message: t('请至少选择一门才艺课程', 'Please select at least one arts class') })
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await addToCart({
        type: 'ENROLLMENT',
        studentId: selectedStudentId,
        classIds: allSelectedClassIds,
        textbookIds: Array.from(selectedTextbookIds),
      })
      if (!result.ok) {
        setSubmitError({ code: 'CART_ERROR', message: result.error ?? t('加入购物车失败，请重试', 'Failed to add to cart, please try again') })
        return
      }
      const selectedClasses = [
        ...(!isArtsOnly && selectedChineseClass ? [selectedChineseClass] : []),
        ...selectedArtsClasses,
      ]
      const waitlistedIds = new Set((result.waitlistedClasses ?? []).map(c => c.id))
      const nameOf = (c: ClassData) => lang === 'en' ? (c.nameEn || c.name) : c.name
      const cartedClasses = selectedClasses.filter(c => !waitlistedIds.has(c.id))
      const waitlistedNames = selectedClasses.filter(c => waitlistedIds.has(c.id)).map(nameOf)

      if (waitlistedIds.size > 0 && cartedClasses.length === 0) {
        // Every selected class was full — joined the waitlist only, nothing added to cart
        setWaitlistedOnly({ classes: waitlistedNames })
      } else {
        // Show "Added to Cart" screen (with a supplementary waitlist note for any other class that was full)
        setCartAddedInfo({
          studentName: selectedStudent?.name ?? '',
          classes: cartedClasses.map(nameOf),
          subtotal: totalFee,
          waitlistedClasses: waitlistedNames,
        })
        setAddedToCart(true)
      }
    } catch {
      setSubmitError({ code: 'NETWORK_ERROR', message: t('网络错误，请重试', 'Network error, please try again') })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Step 1: Select Student ───────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('选择学生', 'Select Student')}</h2>
        <p className="text-sm text-gray-400 mb-5">{t('请选择要报名的学生', 'Choose the student to enroll')}</p>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          {students.map(s => {
            const info = returningStudentData[s.id]
            const isSelected = selectedStudentId === s.id
            return (
              <button key={s.id} onClick={() => handleSelectStudent(s.id)}
                className={clsx(
                  'rounded-lg border p-4 text-left transition-all',
                  isSelected ? 'border-red-500 bg-red-50 ring-2 ring-red-500' : 'border-gray-200 bg-white hover:border-gray-300'
                )}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.nameEn && <p className="text-sm text-gray-500">{s.nameEn}</p>}
                    {s.grade && <p className="mt-1 text-xs text-gray-400">{t('年级', 'Grade')}: {s.grade}</p>}
                    {s.birthDate && (
                      <p className="text-xs text-gray-400">
                        {t('生日', 'DOB')}: {new Date(s.birthDate).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                      </p>
                    )}
                  </div>
                  {info?.isReturning && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {t('老生', 'Returning')}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          <button onClick={() => setShowAddModal(true)}
            className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors">
            <span className="text-2xl">+</span>
            <p className="mt-1">{t('添加学生', 'Add Student')}</p>
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Language Class ───────────────────────────────────────────────────

  function renderStep2() {
    if (isArtsOnly && confirmedLanguageClass) {
      return (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('中文课程', 'Language Class')}</h2>
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-1.5">
            <p className="text-sm font-semibold text-green-800">✅ {t('已注册中文课程', 'Language Class Already Enrolled')}</p>
            <p className="text-base font-medium text-green-900">
              {lang === 'en' ? (confirmedLanguageClass.nameEn || confirmedLanguageClass.name) : confirmedLanguageClass.name}
              {confirmedLanguageClass.nameEn && lang === 'zh' && (
                <span className="ml-2 text-sm font-normal text-green-700">{confirmedLanguageClass.nameEn}</span>
              )}
            </p>
            {confirmedLanguageClass.teacherName && (
              <p className="text-sm text-green-700">{confirmedLanguageClass.teacherName}</p>
            )}
            {confirmedLanguageClass.schedule && (
              <p className="text-sm text-green-700">{confirmedLanguageClass.schedule}</p>
            )}
            <p className="mt-3 text-sm text-gray-600">
              {t('如需更改中文班级，请联系管理员。', 'To change your language class, please contact admin.')}
            </p>
          </div>
          <button onClick={() => setStep(3)} className="mt-5 rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors">
            {t('继续选择才艺课程', 'Continue to Arts Classes')} →
          </button>
        </div>
      )
    }

    const info = currentReturningInfo
    const chlClasses = chineseClasses.filter(c => !c.nameEn?.startsWith('CSL'))
    const cslClasses = chineseClasses.filter(c => c.nameEn?.startsWith('CSL'))
    const activeClasses = languageTab === 'CHL' ? chlClasses : cslClasses

    return (
      <div>
        {info && <ReturningBanner info={info} />}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('选择中文课程', 'Select Language Class')}</h2>
        <p className="text-sm text-gray-400 mb-4">{t('必选1个', 'Required — select 1')}</p>

        {/* CHL / CSL tabs */}
        <div className="flex gap-0 mb-5 border-b border-gray-200">
          {([
            { key: 'CHL', label: t('CHL 母语班', 'CHL Classes'), count: chlClasses.length },
            { key: 'CSL', label: t('CSL 第二语言班', 'CSL Classes'), count: cslClasses.length },
          ] as const).map(({ key, label, count }) => (
            <button key={key} onClick={() => setLanguageTab(key)}
              className={clsx(
                'px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                languageTab === key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}>
              {label} <span className="ml-1 text-xs opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {info?.isReturning && !info.isGraduation && info.suggestedNextChineseClassIds.length > 0 && (
          <p className="text-xs text-blue-600 mb-4">{t('蓝色高亮为推荐升级班级', 'Blue = recommended next level')}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeClasses.map(cls => {
            let badgeVariant: BadgeVariant | undefined
            if (info?.isReturning) {
              if (info.adminOverrideClassId === cls.id) badgeVariant = 'adminOverride'
              else if (info.suggestedNextChineseClassIds.includes(cls.id)) badgeVariant = 'recommended'
            } else if (
              selectedStudent?.grade &&
              (cls.name.includes(selectedStudent.grade) || cls.nameEn?.includes(selectedStudent.grade))
            ) {
              badgeVariant = 'gradeMatch'
            }
            return (
              <MiniClassCard key={cls.id} cls={cls} selected={selectedChineseId === cls.id}
                badgeVariant={badgeVariant} earlyBird={earlyBird}
                onClick={() => selectChineseClass(selectedChineseId === cls.id ? null : cls.id)} />
            )
          })}
        </div>

        {/* Textbooks */}
        {selectedChineseClass && selectedChineseClass.textbooks.length > 0 && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-3 text-sm font-semibold text-blue-900">
              {t('教材选择', 'Textbooks')} — {lang === 'en' ? (selectedChineseClass.nameEn ?? selectedChineseClass.name) : selectedChineseClass.name}
            </p>
            <div className="space-y-2">
              {selectedChineseClass.textbooks.map(tb => (
                <label key={tb.id} className="flex cursor-pointer items-center justify-between rounded-md border border-blue-200 bg-white px-4 py-3 hover:bg-blue-50">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedTextbookIds.has(tb.id)} onChange={() => toggleTextbook(tb.id)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lang === 'en' ? tb.name : tb.nameZh}</p>
                      {lang === 'zh' && <p className="text-xs text-gray-500">{tb.name}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">${parseFloat(tb.price).toFixed(2)}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {t('默认全选 — 取消勾选可移除', 'All selected by default — uncheck to remove')}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {t('教材将在上课当日在学校领取', 'Books are picked up at school on class day')}
            </p>
          </div>
        )}
      </div>
    )
  }

  // ── Step 3: Arts Classes ─────────────────────────────────────────────────────

  function renderStep3() {
    const info = currentReturningInfo
    return (
      <div>
        {isArtsOnly && confirmedLanguageClass ? (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-3">
            <div>
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">{t('已注册中文课', 'Language Class Confirmed')}</p>
              <p className="text-sm font-semibold text-green-900">
                {lang === 'en' ? (confirmedLanguageClass.nameEn || confirmedLanguageClass.name) : confirmedLanguageClass.name}
              </p>
              {confirmedLanguageClass.teacherName && (
                <p className="text-xs text-green-700">{confirmedLanguageClass.teacherName} · {confirmedLanguageClass.schedule}</p>
              )}
            </div>
          </div>
        ) : (
          info && <ReturningBanner info={info} />
        )}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('选择才艺课程', 'Select Arts Classes')}</h2>
        <p className="text-sm text-gray-400 mb-5">{t('可选，可多选', 'Optional — select multiple')}</p>
        {artsClasses.length === 0 ? (
          <p className="text-sm text-gray-400">{t('暂无才艺班', 'No arts classes available')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {artsClasses.map(cls => {
              const conflicted = isConflictedWithSelections(cls)
              let badgeVariant: BadgeVariant | undefined
              if (info?.isReturning && info.suggestedArtsClassIds.includes(cls.id)) badgeVariant = 'sameAsLastYear'
              return (
                <MiniClassCard key={cls.id} cls={cls}
                  selected={selectedArtsIds.has(cls.id)}
                  conflicted={conflicted && !selectedArtsIds.has(cls.id)}
                  disabled={conflicted}
                  badgeVariant={badgeVariant}
                  onClick={() => toggleArts(cls)} />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Step 4: Confirm ──────────────────────────────────────────────────────────

  function renderStep4() {
    const info = currentReturningInfo
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('确认报名信息', 'Confirm Enrollment')}</h2>
        <p className="text-sm text-gray-400 mb-5">{t('请确认以下报名信息', 'Please review your enrollment details')}</p>
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
          {/* Student */}
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">{t('学生', 'Student')}</p>
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{selectedStudent?.name}</p>
              {info?.isReturning && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {t('老生续报', 'Returning')}
                </span>
              )}
            </div>
            {selectedStudent?.nameEn && <p className="text-sm text-gray-500">{selectedStudent.nameEn}</p>}
            {selectedStudent?.grade && <p className="text-sm text-gray-500">{t('年级', 'Grade')}: {selectedStudent.grade}</p>}
          </div>

          {/* Classes */}
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">{t('课程费用', 'Tuition')}</p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {isArtsOnly && confirmedLanguageClass && (
                  <tr>
                    <td className="py-2 text-gray-400">
                      {lang === 'en' ? (confirmedLanguageClass.nameEn ?? confirmedLanguageClass.name) : confirmedLanguageClass.name}
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {t('已注册', 'Already Enrolled')}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-400">—</td>
                  </tr>
                )}
                {!isArtsOnly && selectedChineseClass && (
                  <tr>
                    <td className="py-2 text-gray-900">{lang === 'en' ? (selectedChineseClass.nameEn ?? selectedChineseClass.name) : selectedChineseClass.name}</td>
                    <td className="py-2 text-right font-medium">${parseFloat(selectedChineseClass.fee).toFixed(2)}</td>
                  </tr>
                )}
                {earlyBirdDiscount > 0 && (
                  <tr>
                    <td className="py-2 text-green-700 text-sm">🏷️ {t('早鸟优惠折扣', 'Early Bird Discount')}</td>
                    <td className="py-2 text-right font-medium text-green-700">-${earlyBirdDiscount.toFixed(2)}</td>
                  </tr>
                )}
                {selectedArtsClasses.map(cls => (
                  <tr key={cls.id}>
                    <td className="py-2 text-gray-900">{lang === 'en' ? (cls.nameEn ?? cls.name) : cls.name}</td>
                    <td className="py-2 text-right font-medium">${parseFloat(cls.fee).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Textbooks */}
          {selectedTextbooks.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">{t('教材费用', 'Textbooks')}</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {selectedTextbooks.map(tb => (
                    <tr key={tb.id}>
                      <td className="py-2 text-gray-900">
                        {lang === 'en' ? tb.name : tb.nameZh}
                        {lang === 'zh' && <span className="ml-2 text-xs text-gray-400">{tb.name}</span>}
                      </td>
                      <td className="py-2 text-right font-medium">${parseFloat(tb.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-400">{t('教材将在上课当日在学校领取', 'Books are picked up at school on class day')}</p>
            </div>
          )}

          {/* Total */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between text-base font-bold">
              <span className="text-gray-900">{t('合计', 'Total')}</span>
              <span className="text-red-600">${totalFee.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Error messages */}
        {submitError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
            {submitError.code === 'TIME_CONFLICT' ? (
              <>
                <p className="text-sm font-semibold text-red-800">⚠ {t('无法完成报名', 'Enrollment Blocked')}</p>
                <p className="text-sm text-red-700">
                  {t(
                    '该学生已注册同一时间段的课程，无法再选择其他中文课程。每位学生每学年只能注册一门中文课。',
                    'This student already has a language class at this time. Each student can only enroll in one language class per academic year.'
                  )}
                </p>
                <button onClick={() => { setSubmitError(null); setStep(2) }}
                  className="mt-1 rounded-md border border-red-300 bg-white px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                  {t('返回选课', 'Back to Class Selection')}
                </button>
              </>
            ) : submitError.code === 'ALREADY_ENROLLED' ? (
              <>
                <p className="text-sm font-semibold text-red-800">⚠ {t('已报名', 'Already Enrolled')}</p>
                <p className="text-sm text-red-700">{t('该学生已成功注册此课程。', 'This student is already enrolled in this class.')}</p>
                <Link href="/dashboard"
                  className="mt-1 inline-block rounded-md border border-red-300 bg-white px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                  {t('前往仪表盘', 'Go to Dashboard')} →
                </Link>
              </>
            ) : submitError.code === 'PENDING_EXISTS' ? (
              <>
                <p className="text-sm font-semibold text-red-800">⚠ {t('有待付款记录', 'Pending Enrollment Exists')}</p>
                <p className="text-sm text-red-700">
                  {t('该学生有一个待付款的注册记录，请先完成付款或取消后再重新报名。',
                    'This student has a pending enrollment. Please complete payment or cancel it before enrolling again.')}
                </p>
                <Link href="/dashboard"
                  className="mt-1 inline-block rounded-md border border-red-300 bg-white px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                  {t('前往仪表盘查看', 'View Dashboard')} →
                </Link>
              </>
            ) : (
              <p className="text-sm text-red-700">{submitError.message}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  function canAdvance() {
    if (step === 1) return !!selectedStudentId
    if (step === 2) return isArtsOnly ? true : !!selectedChineseId
    if (step === 3) return isArtsOnly ? selectedArtsIds.size > 0 : true
    return false
  }

  // ── Added to Cart screen ─────────────────────────────────────────────────────

  if (waitlistedOnly) {
    const classNames = waitlistedOnly.classes.join(lang === 'en' ? ', ' : '、')
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#FEF3C7', padding: '20px 24px', borderBottom: '0.5px solid #FDE68A' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#92400E' }}>
              📋 {t('已加入候补名单！', 'Added to waitlist!')}
            </p>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
              {t(
                `${classNames} 已满员，您已成功加入候补名单。如有名额空出，我们将立即通知您。`,
                `${classNames} is full. You have been added to the waitlist. We will notify you if a spot opens.`
              )}
            </p>
            <button
              onClick={() => router.push('/classes')}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' as const, color: '#374151', marginTop: 6 }}
            >
              → {t('继续浏览班级', 'Browse other classes')}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: '#CC0000', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {t('前往仪表盘', 'Go to dashboard')} →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (addedToCart && cartAddedInfo) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#EAF3DE', padding: '20px 24px', borderBottom: '0.5px solid #BBF7D0' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#3B6D11' }}>
              ✅ {t('已加入购物车！', 'Added to Cart!')}
            </p>
            <p style={{ fontSize: 13, color: '#4a7d1e', marginTop: 4 }}>
              {cartAddedInfo.studentName} → {cartAddedInfo.classes.join(' + ')}
            </p>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cartAddedInfo.waitlistedClasses.length > 0 && (
              <div style={{ background: '#FEF3C7', border: '0.5px solid #FDE68A', borderRadius: 8, padding: '12px 16px', marginBottom: 4 }}>
                <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                  📋 {t(
                    `已加入候补名单：${cartAddedInfo.waitlistedClasses.join('、')}。如有名额将通知您。`,
                    `Added to waitlist: ${cartAddedInfo.waitlistedClasses.join(', ')}. You will be notified if a spot becomes available.`
                  )}
                </p>
              </div>
            )}
            <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              {t('接下来您可以：', 'What would you like to do next?')}
            </p>

            {/* Enroll another student */}
            {students.filter(s => s.id !== selectedStudentId).length > 0 && (
              <button
                onClick={() => { setAddedToCart(false); setStep(1); setSelectedStudentId(null); setSelectedChineseId(null); setSelectedArtsIds(new Set()); setSelectedTextbookIds(new Set()) }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' as const, color: '#374151' }}
              >
                → {t('为其他学生报名', 'Enroll Another Student')}
              </button>
            )}

            {/* Browse arts for same student if no arts yet */}
            {!selectedArtsClasses.length && !isArtsOnly && (
              <button
                onClick={() => { setAddedToCart(false); setIsArtsOnly(true); setStep(3) }}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left' as const, color: '#374151' }}
              >
                → {t('继续为该学生选择才艺班', 'Add Arts Classes for This Student')}
              </button>
            )}

            {/* Go to cart */}
            <button
              onClick={() => router.push('/cart')}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: '#CC0000', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{t('前往购物车结账', 'Go to Cart & Checkout')}</span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>${(cartTotal).toFixed(2)} →</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
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
        <button onClick={() => setStep(s => (s - 1) as Step)} disabled={step === 1}
          className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
          ← {t('上一步', 'Back')}
        </button>

        {step < 4 ? (
          <button onClick={() => setStep(s => (s + 1) as Step)} disabled={!canAdvance()}
            className="rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
            {t('下一步', 'Next')} →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="rounded-md bg-red-600 px-8 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            {isSubmitting ? t('提交中…', 'Submitting…') : `${t('确认并去支付', 'Confirm & Pay')} →`}
          </button>
        )}
      </div>

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onAdded={s => { setStudents(prev => [...prev, s]); handleSelectStudent(s.id); setShowAddModal(false) }}
        />
      )}
    </div>
  )
}
