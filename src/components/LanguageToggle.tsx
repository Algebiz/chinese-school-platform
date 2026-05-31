'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex h-8 items-stretch overflow-hidden rounded-md border border-gray-200 text-[13px]">
      <button
        onClick={() => setLang('zh')}
        className={`px-2.5 transition-colors ${lang === 'zh' ? 'bg-[#CC0000] font-medium text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        中文
      </button>
      <div className="w-px bg-gray-200" />
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 transition-colors ${lang === 'en' ? 'bg-[#CC0000] font-medium text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        EN
      </button>
    </div>
  )
}
