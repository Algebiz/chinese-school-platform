'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CARD, iconBox } from '@/lib/design'

interface Props {
  prefill: { name: string; email: string } | null
}

const INPUT: React.CSSProperties = {
  width: '100%',
  border: '0.5px solid #E5E7EB',
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 13,
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
}

export function ContactFormClient({ prefill }: Props) {
  const { t } = useLanguage()

  const SUBJECTS = [
    t('注册咨询', 'Registration Help'),
    t('课程咨询', 'Class Information'),
    t('CHL课程', 'CHL Program Inquiry'),
    t('CSL课程', 'CSL Program Inquiry'),
    t('教材问题', 'Textbook Question'),
    t('付款问题', 'Payment Issue'),
    t('班级调整', 'Class Transfer Request'),
    t('其他', 'Other'),
  ]

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
        setError(json.error ?? t('提交失败，请重试', 'Submission failed, please try again'))
      } else {
        setSuccess(true)
        setPhone(''); setSubject(''); setMessage('')
      }
    } catch {
      setError(t('网络错误，请重试', 'Network error, please try again'))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ ...CARD, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
        <p style={{ fontSize: 16, fontWeight: 500, color: '#3B6D11', marginBottom: 8 }}>
          {t('消息已发送！', 'Message sent!')}
        </p>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          {t('我们将在2个工作日内回复您。', "We'll get back to you within 2 business days.")}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button onClick={() => setSuccess(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '0.5px solid #E5E7EB', background: 'white', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
            {t('发送新消息', 'Send Another')}
          </button>
          <Link href={prefill ? '/dashboard' : '/'} style={{ padding: '8px 16px', borderRadius: 6, background: '#CC0000', color: 'white', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            {t('返回首页', 'Back to Home')}
          </Link>
        </div>
      </div>
    )
  }

  const LABEL: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }} className="contact-grid">
      {/* Left: Form */}
      <div style={CARD}>
        <div style={{ background: '#F9FAFB', padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{t('发送消息', 'Send Message')}</p>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ background: '#FCEBEB', border: '0.5px solid #FCA5A5', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#A32D2D' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>{t('姓名', 'Name')} <span style={{ color: '#CC0000' }}>*</span></label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>{t('邮箱', 'Email')} <span style={{ color: '#CC0000' }}>*</span></label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={INPUT} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>{t('电话', 'Phone')} <span style={{ fontSize: 11, color: '#9ca3af' }}>({t('可选', 'optional')})</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>{t('主题', 'Subject')} <span style={{ color: '#CC0000' }}>*</span></label>
              <select required value={subject} onChange={(e) => setSubject(e.target.value)} style={INPUT}>
                <option value="">{t('请选择主题', 'Select a subject')}</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={LABEL}>{t('留言', 'Message')} <span style={{ color: '#CC0000' }}>*</span></label>
            <textarea required rows={5} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} style={{ ...INPUT, resize: 'none' }} />
            <p style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{message.length} / 1000</p>
          </div>

          <button type="submit" disabled={submitting} style={{ width: '100%', padding: '10px', borderRadius: 6, background: submitting ? '#e5e7eb' : '#CC0000', color: submitting ? '#9ca3af' : 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? t('发送中…', 'Sending…') : t('发送消息', 'Send Message')}
          </button>
        </form>
      </div>

      {/* Right: School info */}
      <div style={CARD}>
        <div style={{ background: '#F9FAFB', padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827' }}>{t('学校信息', 'School Info')}</p>
        </div>
        {[
          { icon: '📍', color: 'red' as const,   label: t('地址', 'Address'), value: 'Charlotte, NC' },
          { icon: '📧', color: 'blue' as const,  label: t('邮箱', 'Email'),   value: 'info@charlottechineseacademy.org' },
          { icon: '🕐', color: 'amber' as const, label: t('上课时间', 'Hours'), value: t('每周日上午', 'Sundays AM') },
        ].map(({ icon, color, label, value }, i, arr) => (
          <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid #E5E7EB' : 'none' }}>
            <div style={iconBox(color)}>{icon}</div>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</p>
              <p style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`@media (max-width: 640px) { .contact-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
