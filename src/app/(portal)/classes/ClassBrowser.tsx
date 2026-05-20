'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassCard } from '@/components/ClassCard'
import type { ClassData } from '@/components/ClassCard'

type Tab = 'CHINESE' | 'ARTS'

const TABS: { tab: Tab; label: string; labelEn: string }[] = [
  { tab: 'CHINESE', label: '中文班', labelEn: 'Chinese Classes' },
  { tab: 'ARTS', label: '才艺班', labelEn: 'Arts Classes' },
]

interface ClassBrowserProps {
  chineseClasses: ClassData[]
  artsClasses: ClassData[]
}

export function ClassBrowser({ chineseClasses, artsClasses }: ClassBrowserProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('CHINESE')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const visibleClasses = activeTab === 'CHINESE' ? chineseClasses : artsClasses
  const selectedCount = selectedIds.size

  function handleToggle(cls: ClassData) {
    if (cls.spotsRemaining === 0) {
      router.push(`/portal/enroll/waitlist?classId=${cls.id}`)
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(cls.id) ? next.delete(cls.id) : next.add(cls.id)
      return next
    })
  }

  return (
    <div className="relative pb-28">
      {/* Tab bar */}
      <div className="mb-6 flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map(({ tab, label, labelEn }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'rounded-md px-6 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {label}
            <span className="ml-1 text-xs text-gray-400">/ {labelEn}</span>
          </button>
        ))}
      </div>

      {/* Class grid */}
      {visibleClasses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-400">
          暂无班级 / No classes available
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleClasses.map((cls) => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isSelected={selectedIds.has(cls.id)}
              onClick={() => handleToggle(cls)}
            />
          ))}
        </div>
      )}

      {/* Sticky footer — only shown when something is selected */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-4 shadow-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span className="text-sm text-gray-600">
              已选{' '}
              <span className="font-semibold text-gray-900">{selectedCount}</span>{' '}
              个班级
              <span className="ml-1 text-gray-400">
                / {selectedCount} class{selectedCount !== 1 ? 'es' : ''} selected
              </span>
            </span>
            <button
              onClick={() => {
                const ids = Array.from(selectedIds).join(',')
                router.push(`/portal/enroll?classIds=${ids}`)
              }}
              className="rounded-md bg-red-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              去报名 / Proceed to Enroll →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
