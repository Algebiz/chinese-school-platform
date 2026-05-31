'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { StudentStatus } from '@/lib/student-status'

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { t } = useLanguage()
  if (status === 'RETURNING') {
    return (
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}>
        {t('老生', 'Returning')}
      </span>
    )
  }
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#EAF3DE', color: '#3B6D11', fontWeight: 500 }}>
      {t('新生', 'New')}
    </span>
  )
}
