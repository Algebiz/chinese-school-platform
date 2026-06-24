'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type Language = 'zh' | 'en'

interface LanguageContextType {
  lang: Language
  t: (zh: string, en: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: (_zh, en) => en,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageContext.Provider value={{ lang: 'en', t: (_zh, en) => en }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)

export function useLocalizedField() {
  return {
    field: (_zh: string | null | undefined, en: string | null | undefined): string => en || '',
    lang: 'en' as Language,
  }
}
