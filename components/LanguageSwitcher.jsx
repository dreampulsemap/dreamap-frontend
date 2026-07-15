import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'

const languages = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentCode = mounted ? (i18n.resolvedLanguage || i18n.language || 'en') : 'en'
  const currentLang =
    languages.find((l) => l.code === currentCode) || languages[0]

  return (
    <div className="relative group">
      <button
        type="button"
        className="glass-card px-3 sm:px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all"
      >
        <span className="text-xl sm:text-2xl">{currentLang.flag}</span>
        <span className="hidden sm:inline text-sm text-white/80">
          {currentLang.name}
        </span>
        <span className="text-white/60 text-xs">▼</span>
      </button>

      {mounted && (
        <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
                currentCode === lang.code
                  ? 'bg-purple-500/30 text-white'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-sm">{lang.name}</span>
              {currentCode === lang.code && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
