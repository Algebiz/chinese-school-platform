'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { badge, iconBox } from '@/lib/design'

export interface TextbookInfo {
  id: string
  name: string
  nameZh: string
  price: string
  description?: string | null
}

export interface TeacherInfo {
  id: string
  name: string
  nameEn: string | null
  bioEn: string | null
  bioZh: string | null
  photoUrl: string | null
}

export interface ClassData {
  id: string
  name: string
  nameEn: string | null
  type: 'CHINESE' | 'ARTS'
  description: string | null
  teacher: TeacherInfo | null
  schedule: unknown
  capacity: number
  fee: string
  year: string
  enrolledCount: number
  spotsRemaining: number
  textbooks: TextbookInfo[]
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

function classTypeBadge(cls: ClassData, t: (zh: string, en: string) => string) {
  if (cls.type === 'ARTS') return <span style={badge('pink')}>{t('才艺班', 'Arts')}</span>
  if (cls.name.includes('第二语言')) return <span style={badge('green')}>{t('CSL', 'CSL')}</span>
  return <span style={badge('blue')}>{t('CHL', 'CHL')}</span>
}

export function ClassCard({ cls, isSelected = false, onClick }: ClassCardProps) {
  const { t, lang } = useLanguage()
  const [showBio, setShowBio] = useState(false)
  const isFull = cls.spotsRemaining === 0
  const hasBio = cls.teacher && (cls.teacher.bioEn || cls.teacher.bioZh)
  const pct = Math.min(100, Math.round(((cls.capacity - cls.spotsRemaining) / cls.capacity) * 100))
  const isArts = cls.type === 'ARTS'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '0.5px solid #E5E7EB',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#FFF5F5' : 'transparent',
        borderLeft: isSelected ? '3px solid #CC0000' : '3px solid transparent',
        transition: 'background 0.1s',
      }}
    >
      {/* Icon box */}
      <div style={iconBox(isArts ? 'pink' : 'blue')}>
        {isArts ? '🎨' : '📖'}
      </div>

      {/* Class info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{cls.name}</span>
          {classTypeBadge(cls, t)}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cls.teacher && <span>{cls.teacher.name}</span>}
          <span>{fmtSchedule(cls.schedule)}</span>
        </div>

        {/* Teacher bio expand */}
        {hasBio && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowBio((v) => !v) }}
            style={{ fontSize: 11, color: '#CC0000', marginTop: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            {showBio ? t('收起', 'Hide') : t('了解老师 ▸', 'About teacher ▸')}
          </button>
        )}
        {showBio && cls.teacher && (
          <div style={{ marginTop: 6, padding: '8px 10px', background: '#F9FAFB', borderRadius: 6, fontSize: 12, color: '#374151' }}>
            {lang === 'zh' ? cls.teacher.bioZh || cls.teacher.bioEn : cls.teacher.bioEn || cls.teacher.bioZh}
          </div>
        )}
      </div>

      {/* Fee + capacity */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>${parseFloat(cls.fee).toFixed(0)}</p>
        <div style={{ width: 72, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginTop: 4, marginLeft: 'auto' }}>
          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 80 ? '#CC0000' : '#6B7280', borderRadius: 2 }} />
        </div>
        <p style={{ fontSize: 11, color: isFull ? '#A32D2D' : '#6b7280', marginTop: 2 }}>
          {isFull ? t('已满', 'Full') : `${cls.spotsRemaining} ${t('余位', 'left')}`}
        </p>
      </div>

      {/* Select button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClick() }}
        style={{
          flexShrink: 0,
          padding: '7px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
          ...(isSelected
            ? { background: '#CC0000', color: 'white', border: 'none' }
            : isFull
              ? { background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #CC0000' }
              : { background: 'white', color: '#374151', border: '0.5px solid #E5E7EB' }
          ),
        }}
      >
        {isSelected ? `✓ ${t('已选', 'Selected')}` : isFull ? t('候补', 'Waitlist') : t('选择', 'Select')}
      </button>
    </div>
  )
}
