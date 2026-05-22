'use client'

import { useState } from 'react'
import Link from 'next/link'

const SUBJECTS = [
  '注册咨询 / Registration Help',
  '课程咨询 / Class Information',
  'CHL课程 / CHL Program Inquiry',
  'CSL课程 / CSL Program Inquiry',
  '教材问题 / Textbook Question',
  '付款问题 / Payment Issue',
  '班级调整 / Class Transfer Request',
  '其他 / Other',
]

interface Props {
  prefill: { name: string; email: string } | null
}

export function ContactFormClient({ prefill }: Props) {
  const [name, setName] = useState(prefill?.name ?? '')
  const [email, setEmail] = useState(prefill?.email ?? '')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || undefined, subject, message }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '提交失败，请重试 / Submission failed, please try again')
      } else {
        setSuccess(true)
        setPhone('')
        setSubject('')
        setMessage('')
      }
    } catch {
      setError('网络错误，请重试 / Network error, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-lg font-semibold text-green-800">
          ✅ 您的消息已成功发送！我们将在2个工作日内回复您。
        </p>
        <p className="mt-2 text-sm text-green-700">
          Your message has been sent! We&apos;ll get back to you within 2 business days.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => setSuccess(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            发送新消息 / Send Another
          </button>
          <Link
            href={prefill ? '/dashboard' : '/'}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            返回首页 / Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            姓名 / Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            邮箱 / Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            电话 / Phone{' '}
            <span className="text-gray-400 text-xs font-normal">(可选 / Optional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            主题 / Subject <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="">请选择主题 / Select a subject</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          留言 / Message <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={5}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
        />
        <p className="text-right text-xs text-gray-400 mt-1">{message.length} / 1000</p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? '发送中… / Sending…' : '发送消息 / Send Message'}
      </button>
    </form>
  )
}
