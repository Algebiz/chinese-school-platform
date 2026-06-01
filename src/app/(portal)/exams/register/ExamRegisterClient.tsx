'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useCart } from '@/lib/cart/CartContext'

interface Student {
  id: string
  name: string
  nameEn: string | null
  hasConfirmedEnrollment: boolean
}

interface ExamSessionInfo {
  id: string
  examType: string
  level: number
  examDate: string
  location: string
  locationZh: string
  fee: string
  registrationDeadline: string
}

interface Props {
  session: ExamSessionInfo
  students: Student[]
}

export function ExamRegisterClient({ session: examSession, students }: Props) {
  const router = useRouter()
  const { t } = useLanguage()
  const { refreshCart, total: cartTotal } = useCart()
  const [selectedStudentId, setSelectedStudentId] = useState(
    students.find(s => s.hasConfirmedEnrollment)?.id ?? ''
  )
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedToCart, setAddedToCart] = useState(false)
  const [addedStudent, setAddedStudent] = useState<Student | null>(null)

  const eligibleStudents = students.filter(s => s.hasConfirmedEnrollment)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudentId) { setError(t('请选择学生', 'Please select a student')); return }
    setSubmitting(true)
    setError(null)

    try {
      // Step 1: Create the exam registration record (PENDING_PAYMENT)
      const regRes = await fetch('/api/exams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examSessionId: examSession.id, studentId: selectedStudentId, notes: notes || undefined }),
      })
      const regJson = await regRes.json()

      if (!regJson.success) {
        const msgs: Record<string, string> = {
          CAPACITY_FULL:           t('该考试场次已满员', 'Exam session is full'),
          ALREADY_REGISTERED:      t('该学生已报名此考试', 'Student already registered for this exam'),
          DEADLINE_PASSED:         t('报名截止日期已过', 'Registration deadline has passed'),
          NO_CONFIRMED_ENROLLMENT: t('学生需要先完成班级报名并付款', 'Student must have a confirmed class enrollment first'),
        }
        setError(msgs[regJson.code] ?? regJson.error ?? t('报名失败，请重试', 'Registration failed, please try again'))
        return
      }

      // Step 2: Add to cart with the registration ID
      const student = students.find(s => s.id === selectedStudentId)!
      const examDateStr = new Date(examSession.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const desc = `${examSession.examType} Level ${examSession.level} — ${student.name} (${examDateStr})`

      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXAM_REGISTRATION',
          studentId: selectedStudentId,
          examSessionId: examSession.id,
          examRegistrationId: regJson.data.registrationId,
          description: desc,
          descriptionEn: desc,
        }),
      })
      await refreshCart()

      setAddedStudent(student)
      setAddedToCart(true)
    } catch {
      setError(t('网络错误，请重试', 'Network error, please try again'))
    } finally {
      setSubmitting(false)
    }
  }

  const fmtDate = new Date(examSession.examDate).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const fmtDeadline = new Date(examSession.registrationDeadline).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Added to Cart screen ─────────────────────────────────────────────────────
  if (addedToCart && addedStudent) {
    const examDateShort = new Date(examSession.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return (
      <div className="mx-auto max-w-lg">
        <div style={{ border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
          <div style={{ background: '#EAF3DE', padding: '20px 24px', borderBottom: '0.5px solid #BBF7D0' }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#3B6D11' }}>
              ✅ {t('考试报名已加入购物车！', 'Exam Registration Added to Cart!')}
            </p>
            <p style={{ fontSize: 13, color: '#4a7d1e', marginTop: 4 }}>
              {addedStudent.name} → {examSession.examType} Level {examSession.level} ({examDateShort})
            </p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#3B6D11', marginTop: 4 }}>
              ${parseFloat(examSession.fee).toFixed(2)}
            </p>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => router.push('/exams')}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', color: '#374151' }}
            >
              → {t('报名其他考试', 'Register Another Exam')}
            </button>
            <button
              onClick={() => router.push('/cart')}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: '#CC0000', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{t('前往购物车结账', 'Go to Cart & Checkout')}</span>
              <span style={{ fontSize: 13, opacity: 0.9 }}>${cartTotal.toFixed(2)} →</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg">
      {/* Exam info */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          {examSession.examType} Level {examSession.level}
        </h2>
        <div className="space-y-1.5 text-sm text-gray-600">
          <p>{fmtDate}</p>
          <p>{examSession.locationZh} / {examSession.location}</p>
          <p>{t('报名费', 'Fee')}: <span className="font-semibold text-gray-900">${parseFloat(examSession.fee).toFixed(2)}</span></p>
          <p className="text-xs text-gray-400">{t('截止日期', 'Deadline')}: {fmtDeadline}</p>
        </div>
      </div>

      {eligibleStudents.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-800">{t('没有符合条件的学生', 'No eligible students')}</p>
          <p className="mt-1 text-sm text-amber-700">
            {t('学生需要先完成班级报名并付款才可报名考试。', 'Students must have a confirmed class enrollment to register for exams.')}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('选择学生', 'Select Student')}
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">{t('-- 请选择', '-- Please select')}</option>
              {eligibleStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.nameEn ? ` (${s.nameEn})` : ''}
                </option>
              ))}
            </select>
            {students.some(s => !s.hasConfirmedEnrollment) && (
              <p className="mt-1 text-xs text-gray-400">
                {t('仅显示已完成班级报名的学生', 'Only students with confirmed class enrollment are shown')}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('备注', 'Notes')} <span className="font-normal text-gray-400">({t('可选', 'Optional')})</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t('如有特殊需求请注明', 'Any special requirements or notes')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={submitting || !selectedStudentId}
            className="w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {submitting ? t('处理中…', 'Processing…') : t('加入购物车', 'Add to Cart')}
          </button>
        </form>
      )}
    </div>
  )
}
