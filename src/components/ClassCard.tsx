'use client'

import { useState } from 'react'
import { useLanguage, useLocalizedField } from '@/lib/i18n/LanguageContext'
import { badge } from '@/lib/design'
import type { EarlyBirdInfo } from '@/lib/early-bird'

export interface TextbookInfo {
  id: string; name: string; nameZh: string; price: string; description?: string | null
}

export interface TeacherInfo {
  id: string; name: string; nameEn: string | null
  bioEn: string | null; bioZh: string | null; photoUrl: string | null
}

export interface ClassData {
  id: string; name: string; nameEn: string | null; type: 'CHINESE' | 'ARTS'
  description: string | null; descriptionZh?: string | null
  teacher: TeacherInfo | null; schedule: unknown
  capacity: number; fee: string; year: string; enrolledCount: number
  spotsRemaining: number; textbooks: TextbookInfo[]
}

interface ClassCardProps {
  cls: ClassData
  isSelected?: boolean
  onClick: () => void
  earlyBird?: EarlyBirdInfo
}

function fmtSchedule(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '待定 / TBD'
  const s = schedule as Record<string, string>
  return [s.dayOfWeek, s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : ''].filter(Boolean).join(' ')
}

export function ClassCard({ cls, isSelected = false, onClick, earlyBird }: ClassCardProps) {
  const { t, lang } = useLanguage()
  const { field } = useLocalizedField()
  const [showBio, setShowBio] = useState(false)
  const [showClassInfo, setShowClassInfo] = useState(false)
  const isFull = cls.spotsRemaining === 0
  const originalFee = parseFloat(cls.fee)
  const ebActive = earlyBird?.isActive && cls.type === 'CHINESE'
  const ebDiscount = ebActive ? earlyBird!.discount : 0
  const discountedFee = originalFee - ebDiscount
  const ebDeadlineFmt = earlyBird?.deadline
    ? new Date(earlyBird.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const hasBio = cls.teacher && (cls.teacher.bioEn || cls.teacher.bioZh)
  const hasDesc = cls.description || cls.descriptionZh
  const enrolled = cls.capacity - cls.spotsRemaining
  const pct = Math.min(100, Math.round((enrolled / cls.capacity) * 100))

  function typeBadge() {
    if (cls.type === 'ARTS') return <span style={badge('pink')}>{t('才艺班', 'Arts')}</span>
    if (cls.name.includes('第二语言') || cls.nameEn?.startsWith('CSL')) return <span style={badge('green')}>CSL</span>
    return <span style={badge('blue')}>CHL</span>
  }

  function typeLabel() {
    if (cls.type === 'ARTS') return t('才艺班', 'Arts Class')
    if (cls.name.includes('第二语言') || cls.nameEn?.startsWith('CSL'))
      return t('中文第二语言', 'Chinese Second Language (CSL)')
    return t('中文母语', 'Chinese Home Language (CHL)')
  }

  const description = field(cls.descriptionZh, cls.description)

  return (
    <div style={{ borderBottom: '0.5px solid #E5E7EB' }}>
      {/* Main row */}
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          cursor: 'pointer',
          borderLeft: isSelected ? '3px solid #CC0000' : '3px solid transparent',
          background: isSelected ? '#FFF5F5' : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        {/* Class info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
              {field(cls.name, cls.nameEn)}
            </span>
            {typeBadge()}
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {cls.teacher && <span>{field(cls.teacher.name, cls.teacher.nameEn)}</span>}
            <span>{fmtSchedule(cls.schedule)}</span>
          </p>

          {/* Expand links */}
          {(hasBio || hasDesc) && (
            <div style={{ display: 'flex', gap: 14, marginTop: 5 }}>
              {hasBio && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowBio(v => !v); setShowClassInfo(false) }}
                  style={{ fontSize: 11, color: '#CC0000', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showBio ? t('收起', 'Hide') : t('了解老师', 'About teacher')}
                </button>
              )}
              {hasDesc && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowClassInfo(v => !v); setShowBio(false) }}
                  style={{ fontSize: 11, color: '#CC0000', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {showClassInfo ? t('收起', 'Hide') : t('了解班级', 'About this class')}
                </button>
              )}
            </div>
          )}

          {/* Teacher bio */}
          {showBio && cls.teacher && (
            <p style={{ marginTop: 6, fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
              {field(cls.teacher.bioZh, cls.teacher.bioEn)}
            </p>
          )}
        </div>

        {/* Fee + capacity */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
          {ebActive ? (
            <>
              <p style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>${originalFee.toFixed(0)}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3B6D11' }}>${discountedFee.toFixed(0)}</p>
              <span style={{ fontSize: 10, background: '#EAF3DE', color: '#3B6D11', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' }}>
                {t('节省', 'Save')} ${ebDiscount.toFixed(0)}
              </span>
            </>
          ) : (
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${originalFee.toFixed(0)}</p>
          )}
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{enrolled}/{cls.capacity}</p>
          <div style={{ width: 64, height: 3, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 4, marginLeft: 'auto' }}>
            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 80 ? '#CC0000' : '#9CA3AF', borderRadius: 2 }} />
          </div>
          {isFull && <p style={{ fontSize: 11, color: '#A32D2D', marginTop: 2 }}>{t('已满', 'Full')}</p>}
        </div>

        {/* Action button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClick() }}
          style={{
            flexShrink: 0,
            padding: '7px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            ...(isSelected
              ? { background: '#CC0000', color: 'white', border: 'none' }
              : isFull
                ? { background: 'transparent', color: '#CC0000', border: '0.5px solid #CC0000' }
                : { background: 'transparent', color: '#374151', border: '0.5px solid #E5E7EB' }
            ),
          }}
        >
          {isSelected ? t('已选 ✓', '✓ Selected') : isFull ? t('候补', 'Waitlist') : t('选择', 'Select')}
        </button>
      </div>

      {/* Class info panel */}
      {showClassInfo && (
        <div style={{
          padding: '14px 20px',
          background: 'var(--color-background-secondary)',
          borderTop: '0.5px solid var(--color-border-tertiary)',
          fontSize: 13,
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="class-info-grid">
            {/* Left: basic info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                {t('班级信息', 'Class Information')}
              </p>
              <div><span style={{ color: 'var(--color-text-secondary)' }}>{t('类型', 'Type')}:</span> <span style={{ color: 'var(--color-text-primary)' }}>{typeLabel()}</span></div>
              <div><span style={{ color: 'var(--color-text-secondary)' }}>{t('上课时间', 'Schedule')}:</span> <span style={{ color: 'var(--color-text-primary)' }}>{fmtSchedule(cls.schedule)}</span></div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('学费', 'Tuition')}:</span>{' '}
                {ebActive ? (
                  <>
                    <span style={{ color: 'var(--color-text-secondary)', textDecoration: 'line-through', marginRight: 4 }}>${originalFee.toFixed(0)}</span>
                    <span style={{ color: '#3B6D11', fontWeight: 500 }}>${discountedFee.toFixed(0)}{t('/年', '/yr')}</span>
                    {ebDeadlineFmt && (
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'block', marginTop: 2 }}>⏰ {t('截止', 'Ends')} {ebDeadlineFmt}</span>
                    )}
                  </>
                ) : (
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>${originalFee.toFixed(0)}{t('/年', '/yr')}</span>
                )}
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>{t('班级容量', 'Capacity')}:</span>{' '}
                <span style={{ color: 'var(--color-text-primary)' }}>{enrolled}/{cls.capacity} {t('人', 'students')}</span>
              </div>
              {cls.textbooks.length > 0 && (
                <div>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{t('教材', 'Textbooks')}:</span>{' '}
                  <span style={{ color: 'var(--color-text-primary)' }}>{cls.textbooks.map(tb => lang === 'zh' ? tb.nameZh : tb.name).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Right: description */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                {t('课程描述', 'Description')}
              </p>
              <p style={{ lineHeight: 1.6 }}>
                {description || t('暂无描述', 'No description available')}
              </p>
            </div>
          </div>
          <style>{`@media (max-width: 560px) { .class-info-grid { grid-template-columns: 1fr !important; } }`}</style>
        </div>
      )}
    </div>
  )
}
