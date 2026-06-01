'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function formatTimeLeft(secs: number, t: (zh: string, en: string) => string): string {
  if (secs < 60) return t('不到1分钟', 'Less than 1 minute')
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} ${t('分钟', mins === 1 ? 'minute' : 'minutes')}`
  const hours = Math.floor(mins / 60)
  return `${hours} ${t('小时', hours === 1 ? 'hour' : 'hours')}`
}

export function SessionExpiryWarning() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [secsLeft, setSecsLeft] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiresAt = (session?.user as any)?.expiresAt as number | undefined
    if (!expiresAt) return

    function check() {
      if (!expiresAt) return
      const remaining = expiresAt - Math.floor(Date.now() / 1000)
      setSecsLeft(remaining)
    }

    check()
    const id = setInterval(check, 15_000)
    return () => clearInterval(id)
  }, [session])

  if (secsLeft === null || dismissed) return null

  // Threshold: long sessions (>2h remaining) warn at 15 min; short sessions at 5 min
  const threshold = secsLeft > 2 * 60 * 60 ? 15 * 60 : 5 * 60
  if (secsLeft <= 0 || secsLeft > threshold) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'white',
      border: '0.5px solid #E5E7EB',
      borderRadius: 10,
      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      minWidth: 320,
      maxWidth: 480,
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginBottom: 2 }}>
          {t('会话即将过期', 'Session expiring soon')}
        </p>
        <p style={{ fontSize: 12, color: '#6b7280' }}>
          {t('还剩', 'Time left')}: <strong>{formatTimeLeft(secsLeft, t)}</strong>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => setDismissed(true)}
          style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          {t('忽略', 'Dismiss')}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ fontSize: 12, color: 'white', background: '#CC0000', border: 'none', borderRadius: 5, cursor: 'pointer', padding: '6px 12px', fontWeight: 500 }}
        >
          {t('重新登录', 'Sign in again')}
        </button>
      </div>
    </div>
  )
}
