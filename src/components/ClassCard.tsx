'use client'

import { useState } from 'react'
import { useLanguage, useLocalizedField } from '@/lib/i18n/LanguageContext'
import { badge } from '@/lib/design'

export interface TextbookInfo {
  id: string; name: string; nameZh: string; price: string; description?: string | null
}

export interface TeacherInfo {
  id: string; name: string; nameEn: string | null
  bioEn: string | null; bioZh: string | null; photoUrl: string | null
}

export interface ClassData {
  id: string; name: string; nameEn: string | null; type: 'CHINESE' | 'ARTS'
  description: string | null; teacher: TeacherInfo | null; schedule: unknown
  capacity: number; fee: string; year: string; enrolledCount: number
  spotsRemaining: number; textbooks: TextbookInfo[]
}

interface ClassCardProps {
  cls: ClassData
  isSelected?: boolean
  onClick: () => void
}

function fmtSchedule(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '待定 / TBD'
  const s = schedule as Record<string, string>
  return [s.dayOfWeek, s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : ''].filter(Boolean).join(' ')
}

export function ClassCard({ cls, isSelected = false, onClick }: ClassCardProps) {
  const { t, lang } = useLanguage()
  const { field } = useLocalizedField()
  const [showBio, setShowBio] = useState(false)
  const isFull = cls.spotsRemaining === 0
  const hasBio = cls.teacher && (cls.teacher.bioEn || cls.teacher.bioZh)
  const enrolled = cls.capacity - cls.spotsRemaining
  const pct = Math.min(100, Math.round((enrolled / cls.capacity) * 100))

  function typeBadge() {
    if (cls.type === 'ARTS') return <span style={badge('pink')}>{t('才艺班', 'Arts')}</span>
    if (cls.name.includes('第二语言')) return <span style={badge('green')}>CSL</span>
    return <span style={badge('blue')}>CHL</span>
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderBottom: '0.5px solid #E5E7EB',
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

        {hasBio && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowBio(v => !v) }}
            style={{ marginTop: 4, fontSize: 11, color: '#CC0000', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {showBio ? t('收起', 'Hide') : t('了解老师', 'About teacher')}
          </button>
        )}
        {showBio && cls.teacher && (
          <p style={{ marginTop: 6, fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
            {field(cls.teacher.bioZh, cls.teacher.bioEn)}
          </p>
        )}
      </div>

      {/* Fee + capacity */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(cls.fee).toFixed(0)}</p>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{enrolled}/{cls.capacity}</p>
        {/* Progress bar */}
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
  )
}
