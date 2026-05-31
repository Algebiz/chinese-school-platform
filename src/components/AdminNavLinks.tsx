'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const NAV = [
  { href: '/admin',                    zh: '仪表盘',  en: 'Dashboard' },
  { href: '/admin/classes',            zh: '班级管理', en: 'Classes'   },
  { href: '/admin/teachers',           zh: '教师管理', en: 'Teachers'  },
  { href: '/admin/students',           zh: '学生管理', en: 'Students'  },
  { href: '/admin/waitlist',           zh: '候补名单', en: 'Waitlist'  },
  { href: '/admin/exams',              zh: '考试管理', en: 'Exams'     },
  { href: '/admin/volunteer',          zh: '志愿服务', en: 'Volunteer' },
  { href: '/admin/export',             zh: '数据导出', en: 'Export'    },
  { href: '/admin/enrollment-settings',zh: '注册设置', en: 'Settings'  },
  { href: '/admin/contact',            zh: '联系消息', en: 'Messages'  },
]

interface Props {
  unreadContactCount: number
  pendingExamCount: number
  pendingClaimsCount: number
  isSuperAdmin: boolean
}

export function AdminNavLinks({ unreadContactCount, pendingExamCount, pendingClaimsCount, isSuperAdmin }: Props) {
  const { lang, t } = useLanguage()

  return (
    <div className="flex gap-4 ml-4 overflow-x-auto">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="shrink-0 text-sm text-gray-300 hover:text-white transition-colors"
        >
          {lang === 'zh' ? item.zh : item.en}
          {item.href === '/admin/contact' && unreadContactCount > 0 && (
            <span className="ml-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {unreadContactCount}
            </span>
          )}
          {item.href === '/admin/exams' && pendingExamCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {pendingExamCount}
            </span>
          )}
          {item.href === '/admin/volunteer' && pendingClaimsCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {pendingClaimsCount}
            </span>
          )}
        </Link>
      ))}
      {isSuperAdmin && (
        <Link
          href="/super-admin"
          className="shrink-0 flex items-center gap-1 rounded-md bg-red-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
        >
          ⚙ {t('超级管理员', 'Super Admin')}
        </Link>
      )}
    </div>
  )
}
