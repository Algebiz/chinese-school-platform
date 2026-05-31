'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const ITEMS = [
  { href: '/dashboard', zh: '仪表盘', en: 'Dashboard' },
  { href: '/classes',   zh: '班级',   en: 'Classes'   },
  { href: '/enroll',    zh: '报名',   en: 'Enroll'    },
  { href: '/exams',     zh: '考试报名', en: 'Exams'   },
  { href: '/volunteer', zh: '志愿服务', en: 'Volunteer'},
  { href: '/contact',   zh: '联系我们', en: 'Contact'  },
]

function useActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(href + '/')
}

/** Desktop nav links — hidden on mobile */
export function PortalNavLinks() {
  const { lang } = useLanguage()
  const isActive = useActive()

  return (
    <div className="hidden sm:flex items-center gap-0.5">
      {ITEMS.map(({ href, zh, en }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            isActive(href)
              ? 'font-semibold text-red-700 bg-red-50'
              : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          {lang === 'zh' ? zh : en}
        </Link>
      ))}
    </div>
  )
}

/** Hamburger button — visible on mobile only, triggers slide-down menu */
export function PortalHamburger() {
  const { lang } = useLanguage()
  const isActive = useActive()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
        className="sm:hidden flex flex-col justify-center gap-[5px] w-8 h-8 items-center rounded-md hover:bg-gray-100 transition-colors"
      >
        <span className={`block h-0.5 w-5 bg-gray-600 transition-all duration-200 ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
        <span className={`block h-0.5 w-5 bg-gray-600 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
        <span className={`block h-0.5 w-5 bg-gray-600 transition-all duration-200 ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
      </button>

      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-md z-50 py-1">
          {ITEMS.map(({ href, zh, en }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center px-4 py-3 text-sm transition-colors border-l-2 ${
                isActive(href)
                  ? 'border-red-600 font-semibold text-red-700 bg-red-50'
                  : 'border-transparent font-medium text-gray-700 hover:bg-gray-50'
              }`}
            >
              {lang === 'zh' ? zh : en}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
