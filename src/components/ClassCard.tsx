'use client'

import { clsx } from 'clsx'

export interface TextbookInfo {
  id: string
  name: string
  nameZh: string
  price: string
  description?: string | null
}

export interface ClassData {
  id: string
  name: string
  nameEn: string | null
  type: 'CHINESE' | 'ARTS'
  description: string | null
  teacher: { id: string; name: string; email: string | null } | null
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

function formatSchedule(schedule: unknown): string {
  if (!schedule || typeof schedule !== 'object') return '待定 / TBD'
  const s = schedule as Record<string, string>
  const parts = [s.dayOfWeek, s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : ''].filter(Boolean)
  return parts.join(' ') + (s.room ? ` | ${s.room}` : '')
}

export function ClassCard({ cls, isSelected = false, onClick }: ClassCardProps) {
  const isFull = cls.spotsRemaining === 0

  return (
    <div
      className={clsx(
        'flex flex-col rounded-lg border bg-white p-5 shadow-sm transition-all',
        isSelected ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{cls.name}</h3>
          {cls.nameEn && <p className="text-sm text-gray-500">{cls.nameEn}</p>}
        </div>
        {isFull ? (
          <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            已满 / Full
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            余 {cls.spotsRemaining} 位
          </span>
        )}
      </div>

      <div className="mt-3 grow space-y-1.5 text-sm text-gray-600">
        {cls.teacher && (
          <p>
            <span className="text-gray-400">老师：</span>
            {cls.teacher.name}
          </p>
        )}
        <p>
          <span className="text-gray-400">时间：</span>
          {formatSchedule(cls.schedule)}
        </p>
        <p>
          <span className="text-gray-400">费用：</span>
          <span className="font-medium text-gray-900">${cls.fee}</span>
        </p>
      </div>

      {cls.description && (
        <p className="mt-3 line-clamp-2 text-xs text-gray-400">{cls.description}</p>
      )}

      <div className="mt-4">
        {isFull ? (
          <button
            onClick={onClick}
            className="w-full rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            加入候补 / Join Waitlist
          </button>
        ) : (
          <button
            onClick={onClick}
            className={clsx(
              'w-full rounded-md px-4 py-2 text-sm font-medium transition-colors',
              isSelected
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            {isSelected ? '已选 ✓ / Selected' : '选择 / Select'}
          </button>
        )}
      </div>
    </div>
  )
}
