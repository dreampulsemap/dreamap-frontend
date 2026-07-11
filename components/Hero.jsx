import Link from 'next/link'
import MiniGlobe from './MiniGlobe'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function Hero() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  const title =
    getTranslation('hero.title', lang) || 'Dünyanın bilinçaltına hoş geldin.'
  const subtitle =
    getTranslation('hero.subtitle', lang) || 'Collective dream intelligence'
  const rawDescription =
    getTranslation('hero.description', lang) ||
    'Lunosfer turns dream signals, archetypes and emotional patterns into a living subconscious network you can explore in real time.'

  const description =
    rawDescription === 'hero.description'
      ? 'Rüya sinyallerini, arketipleri ve duygusal izleri gerçek zamanlı kolektif bilinç haritasına dönüştüren canlı bir ağ.'
      : rawDescription

  const ctaMap =
    getTranslation('hero.ctaMap', lang) || 'Dünyanın Bilinçaltına Bağlan'
  const ctaAddDream =
    getTranslation('hero.ctaAddDream', lang) || 'Rüyamı Haritaya İşle'
  const ctaProphecy =
    getTranslation('hero.ctaProphecy', lang) || 'Kolektif Kehanet'

  return (
    <section className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-black/35 px-4 py-5 shadow-[0_0_80px_rgba(3,7,18,0.55)] backdrop-blur-2xl sm:mb-8 sm:rounded-[32px] sm:px-5 sm:py-6 lg:mb-10 lg:px-8 lg:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_bottom_center,rgba(249,115,22,0.08),transparent_24%),linear-gradient(180deg,rgba(3,7,18,0.76),rgba(2,6,23,0.94))]" />
      <div className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl sm:h-36 sm:w-36" />
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl sm:h-48 sm:w-48" />
      <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-orange-500/10 blur-3xl sm:h-36 sm:w-36" />

      <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="cyber-badge mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-100/85 sm:mb-5 sm:px-4">
            <span className="signal-dot cyan" />
            Dream Pulse Network
          </div>

          <h1 className="max-w-3xl text-[2rem] font-semibold leading-[0.98] text-white sm:text-[2.45rem] lg:text-6xl">
            <span className="gradient-text break-words">{title}</span>
          </h1>

          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100/75 sm:mt-4 sm:text-xs">
            {subtitle}
          </p>

          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-300 sm:mt-5 sm:text-base sm:leading-8 lg:max-w-xl lg:text-lg">
            {description}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 xl:flex xl:flex-wrap">
            <Link
              href="/globe"
              className="energy-button inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-500/20 to-violet-500/16 px-5 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.12)] transition hover:scale-[1.01] hover:border-cyan-200/45 hover:from-cyan-500/28 hover:to-violet-500/22 sm:px-6"
            >
              🌐 {ctaMap}
            </Link>

            <Link
              href="/add-dream"
              className="energy-button inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] hover:border-violet-300/38 hover:bg-violet-500/16 sm:px-6"
            >
              ✨ {ctaAddDream}
            </Link>

            <a
              href="#prophecy"
              className="energy-button inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:scale-[1.01] hover:border-white/20 hover:bg-white/10 hover:text-white sm:col-span-2 xl:w-auto"
            >
              🔮 {ctaProphecy}
            </a>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3">
            <div className="metric-tile rounded-[20px] border border-white/8 bg-white/4 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Live Field
              </p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">24/7</p>
              <p className="mt-1 text-sm text-slate-400">always awake</p>
            </div>

            <div className="metric-tile rounded-[20px] border border-white/8 bg-white/4 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Archetypes
              </p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">∞</p>
              <p className="mt-1 text-sm text-slate-400">evolving identities</p>
            </div>

            <div className="metric-tile rounded-[20px] border border-white/8 bg-white/4 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Resonance
              </p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">Live</p>
              <p className="mt-1 text-sm text-slate-400">collective pulse</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 justify-center lg:justify-end">
          <div className="relative w-full max-w-[420px] sm:max-w-[460px]">
            <div className="absolute inset-0 scale-95 rounded-[1.8rem] bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/12 blur-3xl" />

            <div className="glass-card relative overflow-hidden rounded-[26px] p-3 sm:p-4 lg:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    Lunosfer Signal
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Real-time subconscious field preview
                  </p>
                </div>

                <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="signal-dot emerald" />
                  Online
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30">
                <div className="min-h-[280px] py-3 sm:min-h-[340px] sm:py-4 lg:min-h-[380px]">
                  <MiniGlobe />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Glows
                  </p>
                  <p className="mt-2 text-base font-semibold text-white sm:text-lg">Rare</p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Nodes
                  </p>
                  <p className="mt-2 text-base font-semibold text-white sm:text-lg">Live</p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    Heat
                  </p>
                  <p className="mt-2 text-base font-semibold text-white sm:text-lg">Rising</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}