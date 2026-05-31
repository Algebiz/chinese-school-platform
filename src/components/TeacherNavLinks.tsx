'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function TeacherNavLinks() {
  const { t } = useLanguage()

  return (
    <div className="flex gap-4 ml-4">
      <Link href="/teacher/classes" className="text-sm text-gray-300 hover:text-white transition-colors">
        {t('我的班级', 'My Classes')}
      </Link>
      <Link href="/contact" className="text-sm text-gray-300 hover:text-white transition-colors">
        {t('联系管理员', 'Contact Admin')}
      </Link>
    </div>
  )
}
