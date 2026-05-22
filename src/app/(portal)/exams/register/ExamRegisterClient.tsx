'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const [selectedStudentId, setSelectedStudentId] = useState(
    students.find((s) => s.hasConfirmedEnrollment)?.id ?? ''
  )
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eligibleStudents = students.filter((s) => s.hasConfirmedEnrollment)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudentId) { setError('请选择学生 / Please select a student'); return }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/exams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examSessionId: examSession.id, studentId: selectedStudentId, notes: notes || undefined }),
      })
      const json = await res.json()

      if (!json.success) {
        const msgs: Record<string, string> = {
          CAPACITY_FULL: '该考试场次已满员 / Exam session is full',
          ALREADY_REGISTERED: '该学生已报名此考试 / Student already registered',
          DEADLINE_PASSED: '报名截止日期已过 / Registration deadline passed',
          NO_CONFIRMED_ENROLLMENT: '学生需要先完成班级报名并付款 / Student must have a confirmed class enrollment',
        }
        setError(msgs[json.code] ?? json.error ?? '报名失败，请重试')
        return
      }

      router.push(`/exam-checkout?registrationId=${json.data.registrationId}`)
    } catch {
      setError('网络错误，请重试 / Network error, please try again')
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

  return (
    <div className="mx-auto max-w-lg">
      {/* Exam info card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          {examSession.examType} Level {examSession.level}
        </h2>
        <div className="space-y-1.5 text-sm text-gray-600">
          <p>📅 {fmtDate}</p>
          <p>📍 {examSession.locationZh} / {examSession.location}</p>
          <p>💰 报名费 / Fee: <span className="font-semibold text-gray-900">${parseFloat(examSession.fee).toFixed(2)}</span></p>
          <p className="text-xs text-gray-400">截止日期 / Deadline: {fmtDeadline}</p>
        </div>
      </div>

      {eligibleStudents.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-800">没有符合条件的学生</p>
          <p className="mt-1 text-sm text-amber-700">
            报名考试需要学生先完成 {examSession.examDate.slice(0, 4).slice(-4) === new Date(examSession.examDate).getFullYear().toString() ? '' : ''}班级报名并完成支付。
          </p>
          <p className="mt-1 text-xs text-amber-600">
            Students must have a confirmed class enrollment to register for exams.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              选择学生 / Select Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="">-- 请选择 / Select --</option>
              {eligibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.nameEn ? ` (${s.nameEn})` : ''}
                </option>
              ))}
            </select>
            {students.some((s) => !s.hasConfirmedEnrollment) && (
              <p className="mt-1 text-xs text-gray-400">
                仅显示已完成班级报名的学生 / Only students with confirmed class enrollment are shown
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              备注 / Notes <span className="font-normal text-gray-400">（可选 / Optional）</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="如有特殊需求请注明 / Any special requirements or notes"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={submitting || !selectedStudentId}
            className="w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {submitting ? '处理中… / Processing…' : '确认报名并前往支付 / Register & Pay'}
          </button>
        </form>
      )}
    </div>
  )
}
