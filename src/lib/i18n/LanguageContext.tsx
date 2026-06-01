'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Language = 'zh' | 'en'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (zh: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (zh) => zh,
})

export function LanguageProvider({
  children,
  initialLang = 'zh',
}: {
  children: ReactNode
  initialLang?: Language
}) {
  const [lang, setLangState] = useState<Language>(initialLang)

  useEffect(() => {
    const saved = localStorage.getItem('preferredLanguage') as Language | null
    if (saved === 'zh' || saved === 'en') {
      if (saved !== lang) setLangState(saved)
    } else {
      // First visit — use browser language as default
      const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en'
      if (browserLang !== lang) {
        setLangState(browserLang)
        localStorage.setItem('preferredLanguage', browserLang)
        document.cookie = `preferredLanguage=${browserLang}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function setLang(newLang: Language) {
    setLangState(newLang)
    localStorage.setItem('preferredLanguage', newLang)
    // Set cookie immediately for server components on next navigation
    document.cookie = `preferredLanguage=${newLang}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`
    try {
      await fetch('/api/user/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      })
    } catch {
      // silent — localStorage + cookie are the fallbacks
    }
  }

  function t(zh: string, en: string): string {
    return lang === 'zh' ? zh : en
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)

/** Returns a field() helper that picks ZH or EN value from bilingual DB fields. */
export function useLocalizedField() {
  const { lang } = useContext(LanguageContext)
  return {
    field: (zh: string | null | undefined, en: string | null | undefined): string => {
      if (lang === 'en') return en || zh || ''
      return zh || en || ''
    },
    lang,
  }
}
