import Link from 'next/link'
import MiniGlobe from '@/components/MiniGlobe'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { useState, useEffect } from 'react'

export default function Hero() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'

  return (
    <section className="relative mb-8 overflow-hidden rounded-card border border-white/5 bg-void-900/60 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(230,198,135,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_35%)]" />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
        <div className={`transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-astral-gold/30 bg-astral-gold/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-astral-gold shadow-astral-glow">
            <span className="w-1.5 h-1.5 rounded-full bg-astral-gold animate-pulse" />
            RÜYA NABIZ AĞI
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold leading-tight text-white mb-4">
            <span className="gold-gradient-text">
              {getTranslation('hero.title', currentLang) || 'Dünyanın bilinçaltına hoş geldin.'}
            </span>
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-sans mb-6">
            {getTranslation('hero.description', currentLang) || 'Lunosfer; rüya sinyallerini, arketipleri ve duygusal örüntüleri canlı bir bilinçaltı ağına dönüştürür.'}
          </p>

          <div className="flex flex-wrap gap-3 font-sans">
            <Link
              href="/globe"
              className="inline-flex items-center justify-center rounded-full bg-astral-gold text-void-950 px-6 py-3 text-xs font-bold uppercase tracking-wider shadow-astral-glow hover:brightness-110 transition-all"
            >
              🌐 Bilinçaltına Bağlan
            </Link>

            <Link
              href="/add-dream"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
            >
              ✨ Rüyamı Haritaya İşle
            </Link>
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