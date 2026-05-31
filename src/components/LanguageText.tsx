'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

/**
 * Renders a single string that switches between zh and en with the language toggle.
 * Use this inside server-component layouts where you can't call useLanguage() directly.
 */
export function LanguageText({ zh, en, className }: { zh: string; en: string; className?: string }) {
  const { t } = useLanguage()
  if (className) return <span className={className}>{t(zh, en)}</span>
  return <>{t(zh, en)}</>
}
