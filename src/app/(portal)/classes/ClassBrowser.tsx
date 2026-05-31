'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassCard } from '@/components/ClassCard'
import type { ClassData } from '@/components/ClassCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CARD } from '@/lib/design'

type Tab = 'CHINESE' | 'ARTS'

interface ClassBrowserProps {
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
}

export function ClassBrowser({ chineseClasses, artsClasses }: ClassBrowserProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<Tab>('CHINESE')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const visibleClasses = activeTab === 'CHINESE' ? chineseClasses : artsClasses
  const selectedCount = selectedIds.size

  function handleToggle(cls: ClassData) {
    if (cls.spotsRemaining === 0) {
      router.push(`/enroll/waitlist?classId=${cls.id}`)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(cls.id) ? next.delete(cls.id) : next.add(cls.id)
      return next
    })
  }

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: active ? 500 : 400,
    color: active ? '#CC0000' : '#6b7280',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #CC0000' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s',
    marginBottom: -1,
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 100 }}>
      {/* Page hero */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>
          {t('班级', 'Classes')}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          {t('浏览并选择您心仪的班级', 'Browse and select the classes you want to enroll in')}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '0.5px solid #E5E7EB', marginBottom: 16, display: 'flex' }}>
        <button style={TAB_STYLE(activeTab === 'CHINESE')} onClick={() => setActiveTab('CHINESE')}>
          {t('中文班', 'Chinese Classes')} ({chineseClasses.length})
        </button>
        <button style={TAB_STYLE(activeTab === 'ARTS')} onClick={() => setActiveTab('ARTS')}>
          {t('才艺班', 'Arts Classes')} ({artsClasses.length})
        </button>
      </div>

      {/* Class list */}
      {visibleClasses.length === 0 ? (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
          {t('暂无班级', 'No classes available')}
        </div>
      ) : (
        <div style={CARD}>
          {visibleClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isSelected={selectedIds.has(cls.id)}
              onClick={() => handleToggle(cls)}
            />
          ))}
          {/* Remove border-bottom on last item */}
          <style>{`.class-last-row { border-bottom: none !important; }`}</style>
        </div>
      )}

      {/* Sticky footer when classes selected */}
      {selectedCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'white', borderTop: '0.5px solid #E5E7EB',
          padding: '14px 24px', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        }}>
          <span style={{ fontSize: 14, color: '#374151' }}>
            {t('已选', 'Selected')}{' '}
            <strong style={{ color: '#111827' }}>{selectedCount}</strong>{' '}
            {t('个班级', selectedCount !== 1 ? 'classes' : 'class')}
          </span>
          <button
            onClick={() => router.push(`/enroll?classIds=${Array.from(selectedIds).join(',')}`)}
            style={{ padding: '8px 20px', borderRadius: 6, background: '#CC0000', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('前往报名', 'Proceed to Enroll')} →
          </button>
        </div>
      )}
    </div>
  )
}
