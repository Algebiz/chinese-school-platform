'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  userName: string
  initials: string
  portalLink?: { href: string; labelZh: string; labelEn: string }
}

function formatRemaining(expiresAt: number, t: (zh: string, en: string) => string): string {
  const secs = expiresAt - Math.floor(Date.now() / 1000)
  if (secs <= 0) return t('已过期', 'Expired')
  if (secs < 60) return t('不到1分钟', '< 1 min')
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} ${t('分钟', 'min')}`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  if (remainMins === 0) return `${hours} ${t('小时', 'hr')}`
  return `${hours}${t('时', 'h')} ${remainMins}${t('分', 'm')}`
}

export function AvatarMenu({ userName, initials, portalLink }: Props) {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [, forceUpdate] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const expiresAt  = (session?.user as any)?.expiresAt  as number | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rememberMe = (session?.user as any)?.rememberMe as boolean | undefined

  // Refresh the displayed time every minute while the dropdown is open
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => forceUpdate(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Avatar circle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open user menu"
        className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-700 hover:bg-gray-200 transition-colors select-none"
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 z-[100] min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] py-1 overflow-hidden">
          {/* Username */}
          <div className="px-3 py-2 text-[12px] text-gray-500 truncate border-b border-gray-100">
            {userName}
          </div>

          {/* Portal switch */}
          {portalLink && (
            <>
              <Link
                href={portalLink.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-400 text-xs">⊞</span>
                {t(portalLink.labelZh, portalLink.labelEn)} ↗
              </Link>
              <div className="border-t border-gray-100 mx-2" />
            </>
          )}

          {/* Log out */}
          <button
            onClick={() => { setOpen(false); signOut({ callbackUrl: '/login' }) }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-gray-50 transition-colors"
          >
            <span className="text-red-400">→</span>
            {t('退出登录', 'Log out')}
          </button>

          {/* Session expiry info */}
          <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--color-text-secondary)', borderTop: '0.5px solid var(--color-border-tertiary)', marginTop: 4 }}>
            {expiresAt ? (
              rememberMe
                ? `${t('会话有效期', 'Session valid for')} ${formatRemaining(expiresAt, t)}`
                : `${t('会话将在', 'Expires in')} ${formatRemaining(expiresAt, t)}`
            ) : (
              t('会话信息不可用', 'Session info unavailable')
            )}
          </div>
        </div>
      )}
    </div>
  )
}
