import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' }
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  return (
    <div className="relative group">
      <button className="glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all">
        <span className="text-2xl">{currentLang.flag}</span>
        <span className="text-sm text-white/80">{currentLang.name}</span>
        <span className="text-white/60">▼</span>
      </button>
      
      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
              i18n.language === lang.code 
                ? 'bg-purple-500/30 text-white' 
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="text-sm">{lang.name}</span>
            {i18n.language === lang.code && <span className="ml-auto">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
