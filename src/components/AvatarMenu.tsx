'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  userName: string
  initials: string
  portalLink?: { href: string; labelZh: string; labelEn: string }
}

export function AvatarMenu({ userName, initials, portalLink }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

          {/* Profile link */}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t('个人资料', 'Profile')}
          </Link>
          <div className="border-t border-gray-100 mx-2" />

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
        </div>
      )}
    </div>
  )
}
