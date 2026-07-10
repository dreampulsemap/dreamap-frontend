import Link from 'next/link'
import MiniGlobe from './MiniGlobe'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function Hero() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  const title = getTranslation('hero.title', lang) || 'Lunosfer'
  const subtitle =
    getTranslation('hero.subtitle', lang) ||
    'The social network of dreams'
  const description =
    getTranslation('hero.description', lang) ||
    'Lunosfer analyzes dream signals shared from around the world and turns them into a living subconscious map.'

  const ctaMap =
    getTranslation('hero.ctaMap', lang) || 'Explore the Dream Map'
  const ctaAddDream =
    getTranslation('hero.ctaAddDream', lang) || 'Share a Dream'
  const ctaProphecy =
    getTranslation('hero.ctaProphecy', lang) || 'Collective Prophecy'

  return (
    <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 px-6 py-10 shadow-[0_0_80px_rgba(76,29,149,0.18)] backdrop-blur-xl sm:px-8 sm:py-14 lg:px-12 lg:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.72),rgba(2,6,23,0.92))]" />
      <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute -right-12 bottom-0 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
            Dream Pulse Network
          </div>

          <h1 className="bg-gradient-to-r from-white via-cyan-100 to-fuchsia-200 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mt-4 text-lg font-medium text-fuchsia-100/90 sm:text-xl">
            {subtitle}
          </p>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/globe"
              className="inline-flex items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-r from-cyan-500/25 to-sky-500/25 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-all duration-300 hover:scale-[1.02] hover:border-cyan-200/50 hover:from-cyan-500/35 hover:to-sky-500/35"
            >
              🌍 {ctaMap}
            </Link>

            <Link
              href="/add-dream"
              className="inline-flex items-center justify-center rounded-full border border-fuchsia-300/20 bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-purple-500/20 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:border-fuchsia-300/40 hover:from-fuchsia-500/30 hover:via-violet-500/30 hover:to-purple-500/30"
            >
              ✨ {ctaAddDream}
            </Link>

            <a
              href="#prophecy"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              🔮 {ctaProphecy}
            </a>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Global Dreams
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">24/7</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Collective Symbols
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">∞</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Archetypal Pulse
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">Live</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 scale-95 rounded-[2rem] bg-gradient-to-br from-cyan-400/10 via-transparent to-fuchsia-500/10 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-black/20 p-4 shadow-[0_0_60px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Lunosfer Signal
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Live subconscious field visualization
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.95)]" />
                Online
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/60">
              <MiniGlobe />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}