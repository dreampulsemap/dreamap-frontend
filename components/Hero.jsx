import Link from 'next/link'
import MiniGlobe from '@/components/MiniGlobe'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { useState, useEffect } from 'react'

export default function Hero() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'

  return (
    <section className="relative mb-8 overflow-hidden rounded-card border border-white/5 bg-void-900/60 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(230,198,135,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_35%)]" />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
        <div className={`transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-astral-gold/30 bg-astral-gold/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-astral-gold shadow-astral-glow">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-astral-gold" />
            RÜYA NABIZ AĞI
          </div>

          <h1 className="mb-4 font-serif text-3xl font-bold leading-tight text-white sm:text-5xl">
            <span className="gold-gradient-text">
              {getTranslation('hero.title', currentLang) || 'Dünyanın bilinçaltına hoş geldin.'}
            </span>
          </h1>

          <p className="mb-6 font-sans text-sm leading-relaxed text-slate-300 sm:text-base">
            {getTranslation('hero.description', currentLang) || 'Lunosfer; rüya sinyallerini, arketipleri ve duygusal örüntüleri canlı bir bilinçaltı ağına dönüştürür.'}
          </p>

          <div className="font-sans">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/globe"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-astral-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-void-950 shadow-astral-glow transition-all hover:brightness-110 active:scale-[0.98]"
              >
                🌐 Bilinçaltına Bağlan
              </Link>

              <Link
                href="/add-dream"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                ✨ Rüyamı Haritaya İşle
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/auth"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-primary-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-brand-primary-400 active:scale-[0.98]"
              >
                {currentLang === 'tr' ? 'Giriş Yap' : 'Sign in'}
              </Link>

              <Link
                href="/auth?mode=signup"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                {currentLang === 'tr' ? 'Kayıt Ol' : 'Sign up'}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[360px] glass-card p-4">
            <MiniGlobe />
          </div>
        </div>
      </div>
    </section>
  )
}
