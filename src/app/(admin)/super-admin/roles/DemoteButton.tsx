'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  userName: string
  currentRole: string
  superAdminCount: number
}

export function DemoteButton({ userId, userName, currentRole, superAdminCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLastSuperAdmin = currentRole === 'SUPER_ADMIN' && superAdminCount <= 1

  async function handleDemote() {
    if (isLastSuperAdmin) return
    const label = currentRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN → PARENT' : 'ADMIN → PARENT'
    if (!confirm(`将 ${userName} 降级为 PARENT (${label})？\n\nDemote ${userName} to PARENT?`)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'PARENT' }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? '操作失败')
      } else {
        router.refresh()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (isLastSuperAdmin) {
    return <span className="text-xs text-gray-400 italic">最后一位超管 / Last super admin</span>
  }

  return (
    <div>
      <button
        onClick={handleDemote}
        disabled={loading}
        className="rounded-md border border-orange-300 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
      >
        {loading ? '处理中…' : '降级为 PARENT / Demote'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
