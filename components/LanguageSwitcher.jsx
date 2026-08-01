import { useTranslation } from 'react-i18next'
import { useState, useEffect, useRef } from 'react'
import TextSkeleton from '@/components/TextSkeleton'

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

export default function LanguageSwitcher({ onLanguageChange }) {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ÖNCEDEN: menü CSS `:hover` ile açılıp kapanıyordu — dokunmatik
  // ekranlarda "hover" güvenilir değildir; bir dil seçtikten sonra bile
  // menü açık kalabiliyordu (kullanım zorluğu buradan geliyordu). Artık
  // gerçek bir açık/kapalı state'i var: butona dokunarak açılıyor, bir dil
  // seçilince ya da dışarı dokunulunca kapanıyor.
  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  // i18n?. optional chaining ile çökme tamamen engellenmiştir
  const currentCode = mounted ? (i18n?.resolvedLanguage || i18n?.language || 'en') : 'en'
  const currentLang = languages.find((l) => l.code === currentCode) || languages[0]

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="glass-card px-3 sm:px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all"
      >
        <span className="text-xl sm:text-2xl">{mounted ? currentLang.flag : <TextSkeleton width="w-6" height="h-6" className="rounded-full" />}</span>
        <span className="hidden sm:inline text-sm text-white/80">
          {mounted ? currentLang.name : <TextSkeleton width="w-14" />}
        </span>
        <span className={`text-white/60 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {mounted && open && (
        <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[200px] z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                i18n?.changeLanguage(lang.code)
                onLanguageChange?.(lang.code) // YENİ
                setOpen(false)
              }}
              className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
                currentCode === lang.code
                  ? 'bg-brand-accent-500/30 text-white'
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