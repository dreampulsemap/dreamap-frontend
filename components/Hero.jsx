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
  const description =
    getTranslation('hero.description', lang) ||
    'Lunosfer turns dream signals, archetypes and emotional patterns into a living subconscious network you can explore in real time.'

  const ctaMap =
    getTranslation('hero.ctaMap', lang) || 'Dünyanın Bilinçaltına Bağlan'
  const ctaAddDream =
    getTranslation('hero.ctaAddDream', lang) || 'Rüyamı Haritaya İşle'
  const ctaProphecy =
    getTranslation('hero.ctaProphecy', lang) || 'Kolektif Kehanet'

  return (
    <section className="relative mb-10 overflow-hidden rounded-[2.25rem] border border-white/10 bg-black/40 px-6 py-8 shadow-[0_0_90px_rgba(17,24,39,0.6)] backdrop-blur-2xl sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_26%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_bottom_center,rgba(249,115,22,0.08),transparent_26%),linear-gradient(180deg,rgba(3,7,18,0.78),rgba(2,6,23,0.94))]" />
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="max-w-2xl">
          <div className="cyber-badge mb-5">
            <span className="signal-dot cyan" />
            Dream Pulse Network
          </div>

          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-6xl">
            <span className="gradient-text">{title}</span>
          </h1>

          <p className="mt-4 text-base font-medium uppercase tracking-[0.26em] text-cyan-100/80 sm:text-sm">
            {subtitle}
          </p>

          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/globe"
              className="energy-button inline-flex items-center justify-center rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-500/20 to-violet-500/16 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.12)] hover:scale-[1.02] hover:border-cyan-200/45 hover:from-cyan-500/28 hover:to-violet-500/22"
            >
              🌐 {ctaMap}
            </Link>

            <Link
              href="/add-dream"
              className="energy-button inline-flex items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10 px-6 py-3 text-sm font-semibold text-white hover:scale-[1.02] hover:border-violet-300/38 hover:bg-violet-500/16"
            >
              ✨ {ctaAddDream}
            </Link>

            <a
              href="#prophecy"
              className="energy-button inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              🔮 {ctaProphecy}
            </a>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="metric-tile p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Live Field
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">24/7</p>
              <p className="mt-1 text-sm text-slate-400">
                always awake
              </p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Archetypes
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">∞</p>
              <p className="mt-1 text-sm text-slate-400">
                evolving identities
              </p>
            </div>

            <div className="metric-tile p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Resonance
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">Live</p>
              <p className="mt-1 text-sm text-slate-400">
                collective pulse
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 scale-95 rounded-[2rem] bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/12 blur-3xl" />

          <div className="glass-card relative overflow-hidden p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Lunosfer Signal
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Real-time subconscious field preview
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="signal-dot emerald" />
                Online
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/30">
              <MiniGlobe />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Glows
                </p>
                <p className="mt-2 text-lg font-semibold text-white">Rare</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Nodes
                </p>
                <p className="mt-2 text-lg font-semibold text-white">Live</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Heat
                </p>
                <p className="mt-2 text-lg font-semibold text-white">Rising</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}