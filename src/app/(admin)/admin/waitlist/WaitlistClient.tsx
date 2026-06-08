'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface WaitlistEntry {
  waitlistId: string
  studentName: string
  position: number
  addedAt: string
  classHasSpace: boolean
  status: 'WAITING' | 'NOTIFIED' | 'EXPIRED'
  notifyExpiry: string | null
}

export interface WaitlistGroup {
  classId: string
  className: string
  capacity: number
  confirmedCount: number
  entries: WaitlistEntry[]
}

interface Props {
  groups: WaitlistGroup[]
}

function StatusBadge({ status, notifyExpiry }: { status: WaitlistEntry['status']; notifyExpiry: string | null }) {
  const expired = status === 'NOTIFIED' && !!notifyExpiry && new Date(notifyExpiry) < new Date()

  if (status === 'WAITING') {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        等待中 / Waiting
      </span>
    )
  }

  if (expired || status === 'EXPIRED') {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        已过期 / Expired
      </span>
    )
  }

  // NOTIFIED, not yet expired — show countdown
  const hoursLeft = notifyExpiry
    ? Math.max(0, Math.ceil((new Date(notifyExpiry).getTime() - Date.now()) / (60 * 60 * 1000)))
    : null

  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      已通知{hoursLeft !== null ? ` · 还剩 ${hoursLeft} 小时` : ''} / Notified
    </span>
  )
}

export function WaitlistClient({ groups }: Props) {
  const router = useRouter()
  const [notifying, setNotifying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleNotify(waitlistId: string) {
    setNotifying(waitlistId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/waitlist/${waitlistId}/promote`, { method: 'PATCH' })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败，请重试')
      } else {
        router.refresh()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setNotifying(null)
    }
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-gray-400">
        暂无候补学生 / No students on any waitlist
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {groups.map((group) => (
        <div key={group.classId} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-3">
            <div>
              <span className="font-semibold text-gray-900">{group.className}</span>
              <span className="ml-3 text-sm text-gray-500">
                {group.confirmedCount} / {group.capacity} 已报名
              </span>
            </div>
            {group.confirmedCount < group.capacity ? (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                有余位 / Space available
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                已满 / Full
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-5 py-2.5">位次</th>
                <th className="px-5 py-2.5">学生姓名</th>
                <th className="px-5 py-2.5">加入时间</th>
                <th className="px-5 py-2.5">状态</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.entries.map((entry) => (
                <tr key={entry.waitlistId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono font-semibold text-gray-500">
                    #{entry.position}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{entry.studentName}</td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(entry.addedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={entry.status} notifyExpiry={entry.notifyExpiry} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {entry.status === 'WAITING' ? (
                      <button
                        disabled={!entry.classHasSpace || notifying === entry.waitlistId}
                        onClick={() => handleNotify(entry.waitlistId)}
                        className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 transition-colors"
                      >
                        {notifying === entry.waitlistId ? '处理中…' : '通知 / Notify'}
                      </button>
                    ) : (
                      <button
                        disabled={!entry.classHasSpace || notifying === entry.waitlistId}
                        onClick={() => handleNotify(entry.waitlistId)}
                        className="rounded border border-amber-500 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 transition-colors"
                      >
                        {notifying === entry.waitlistId ? '处理中…' : '重新通知 / Re-notify'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
