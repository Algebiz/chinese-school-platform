'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  displayName: string
  isAdmin: boolean
  logout: () => Promise<void>
}

export function PortalNavRight({ displayName, isAdmin, logout }: Props) {
  const { t } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link
          href="/admin"
          className="rounded-md border border-[#CC0000] px-3 py-1.5 text-sm font-medium text-[#CC0000] bg-white hover:bg-[#CC0000] hover:text-white transition-colors whitespace-nowrap"
        >
          {t('管理后台', 'Admin')} ↗
        </Link>
      )}
      <span className="hidden lg:block text-sm text-gray-500 max-w-[140px] truncate">
        {displayName}
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          {t('退出', 'Log out')}
        </button>
      </form>
    </div>
  )
}
