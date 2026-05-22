'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface ContactMessageRow {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: 'UNREAD' | 'READ' | 'REPLIED'
  repliedAt: string | null
  createdAt: string
}

type FilterValue = 'ALL' | 'UNREAD' | 'READ' | 'REPLIED'

interface Props {
  messages: ContactMessageRow[]
}

export function ContactMessagesClient({ messages }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterValue>('ALL')
  const [selected, setSelected] = useState<ContactMessageRow | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const counts = {
    ALL: messages.length,
    UNREAD: messages.filter((m) => m.status === 'UNREAD').length,
    READ: messages.filter((m) => m.status === 'READ').length,
    REPLIED: messages.filter((m) => m.status === 'REPLIED').length,
  }

  const visible = filter === 'ALL' ? messages : messages.filter((m) => m.status === filter)

  async function updateStatus(messageId: string, status: 'READ' | 'REPLIED') {
    setUpdating(messageId)
    try {
      await fetch(`/api/admin/contact/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (selected?.id === messageId) {
        setSelected((prev) => (prev ? { ...prev, status } : null))
      }
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }

  return (
    <>
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2">
        {(['ALL', 'UNREAD', 'READ', 'REPLIED'] as FilterValue[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? 'border-red-500 bg-red-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {f === 'ALL' && `全部 / All (${counts.ALL})`}
            {f === 'UNREAD' && `未读 / Unread (${counts.UNREAD})`}
            {f === 'READ' && `已读 / Read (${counts.READ})`}
            {f === 'REPLIED' && `已回复 / Replied (${counts.REPLIED})`}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          暂无消息 / No messages
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  状态 / Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  姓名 / Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  邮箱 / Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  主题 / Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  日期 / Date
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((msg) => (
                <tr
                  key={msg.id}
                  className={`hover:bg-gray-50 ${msg.status === 'UNREAD' ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-4 py-3">
                    <StatusBadge status={msg.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{msg.name}</td>
                  <td className="px-4 py-3 text-gray-500">{msg.email}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{msg.subject}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(msg.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelected(msg)}
                        className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        查看 / View
                      </button>
                      {msg.status === 'UNREAD' && (
                        <button
                          onClick={() => updateStatus(msg.id, 'READ')}
                          disabled={updating === msg.id}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          标记已读
                        </button>
                      )}
                      {msg.status !== 'REPLIED' && (
                        <button
                          onClick={() => updateStatus(msg.id, 'REPLIED')}
                          disabled={updating === msg.id}
                          className="rounded border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors"
                        >
                          标记已回复
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="font-semibold text-gray-900">消息详情 / Message Detail</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                {selected.repliedAt && (
                  <span className="text-xs text-gray-400">
                    已回复于 {new Date(selected.repliedAt).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </div>
              <InfoRow label="姓名 / Name" value={selected.name} />
              <InfoRow label="邮箱 / Email" value={selected.email} />
              {selected.phone && <InfoRow label="电话 / Phone" value={selected.phone} />}
              <InfoRow label="主题 / Subject" value={selected.subject} />
              <InfoRow
                label="提交时间 / Submitted"
                value={new Date(selected.createdAt).toLocaleString('zh-CN')}
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">
                  留言 / Message
                </p>
                <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-800 border border-gray-200">
                  {selected.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <div className="flex gap-2">
                {selected.status === 'UNREAD' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'READ')}
                    disabled={updating === selected.id}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    标记已读 / Mark Read
                  </button>
                )}
                {selected.status !== 'REPLIED' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'REPLIED')}
                    disabled={updating === selected.id}
                    className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    标记已回复 / Mark Replied
                  </button>
                )}
              </div>
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                className="rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                回复邮件 / Reply →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: 'UNREAD' | 'READ' | 'REPLIED' }) {
  if (status === 'UNREAD') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        未读 / Unread
      </span>
    )
  }
  if (status === 'REPLIED') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        已回复 / Replied
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      已读 / Read
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}
