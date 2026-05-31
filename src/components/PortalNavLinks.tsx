'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const ITEMS = [
  { href: '/dashboard', zh: '仪表盘', en: 'Dashboard' },
  { href: '/classes',   zh: '班级',   en: 'Classes'   },
  { href: '/enroll',    zh: '报名',   en: 'Enroll'    },
  { href: '/exams',     zh: '考试报名', en: 'Exams'   },
  { href: '/volunteer', zh: '志愿服务', en: 'Volunteer'},
  { href: '/contact',   zh: '联系我们', en: 'Contact'  },
]

export function PortalNavLinks() {
  const { lang } = useLanguage()

  return (
    <div className="hidden sm:flex items-center gap-1">
      {ITEMS.map(({ href, zh, en }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center rounded-md px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 hover:text-red-700 transition-colors"
        >
          {lang === 'zh' ? (
            <>
              <span className="text-sm font-medium leading-tight">{zh}</span>
              <span className="text-[10px] text-gray-400 leading-tight">{en}</span>
            </>
          ) : (
            <span className="text-sm font-medium leading-tight">{en}</span>
          )}
        </Link>
      ))}
    </div>
  )
}

export function PortalNavLinksMobile() {
  const { lang } = useLanguage()

  return (
    <div className="flex sm:hidden items-center gap-1 overflow-x-auto px-3 pb-2 scrollbar-none">
      {ITEMS.map(({ href, zh, en }) => (
        <Link
          key={href}
          href={href}
          className="shrink-0 rounded-md px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-700 transition-colors"
        >
          {lang === 'zh' ? zh : en}
        </Link>
      ))}
    </div>
  )
}
