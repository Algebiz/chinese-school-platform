'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

const btnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: '0.5px solid #e5e7eb',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  lineHeight: 1,
  transition: 'transform 0.15s, box-shadow 0.15s',
}

export function LanguageToggle() {
  const { lang, setLang } = useLanguage()

  function onEnter(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.transform = 'scale(1.1)'
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
  }
  function onLeave(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.transform = 'scale(1)'
    e.currentTarget.style.boxShadow = 'none'
  }

  if (lang === 'zh') {
    return (
      <button
        onClick={() => setLang('en')}
        title="Switch to English"
        aria-label="Switch to English"
        style={btnStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        🇺🇸
      </button>
    )
  }

  return (
    <button
      onClick={() => setLang('zh')}
      title="切换中文"
      aria-label="切换中文"
      style={btnStyle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      🇨🇳
    </button>
  )
}
