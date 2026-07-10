import { useState, useEffect } from 'react'
import Link from 'next/link'
import { auth } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        if (auth && typeof auth.getUser === 'function') {
          const currentUser = await auth.getUser()
          if (mounted) {
            setUser(currentUser || null)
          }
        }
      } catch (error) {
        console.error('Navbar user check error:', error)
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.01]"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 via-sky-400/10 to-purple-500/20 text-lg text-white shadow-[0_0_30px_rgba(56,189,248,0.15)]">
              ☾
            </div>
          </div>

          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-cyan-200 via-sky-100 to-purple-200 bg-clip-text text-lg font-semibold tracking-[0.18em] text-transparent sm:text-xl">
              LUNOSFER
            </span>
            <span className="text-[10px] uppercase tracking-[0.28em] text-slate-400 sm:text-[11px]">
              Dream Pulse Network
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/globe"
            className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-300 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100 sm:inline-flex"
          >
            🌍 {getTranslation('nav.globe', lang) || 'Rüya Haritası'}
          </Link>

          {user ? (
            <Link
              href="/profile"
              className="inline-flex rounded-full border border-fuchsia-300/20 bg-gradient-to-r from-fuchsia-500/20 via-violet-500/20 to-cyan-500/20 px-4 py-2 text-sm font-medium text-white shadow-[0_0_25px_rgba(168,85,247,0.16)] transition-all duration-300 hover:scale-[1.02] hover:border-fuchsia-300/40 hover:from-fuchsia-500/30 hover:via-violet-500/30 hover:to-cyan-500/30"
            >
              ✨ {getTranslation('nav.profile', lang) || 'Profilim'}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="inline-flex rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[0_0_25px_rgba(34,211,238,0.12)] transition-all duration-300 hover:scale-[1.02] hover:border-cyan-300/40 hover:from-cyan-500/30 hover:to-sky-500/30"
            >
              {getTranslation('nav.login', lang) || 'Giriş Yap'}
            </Link>
          )}

          <div className="ml-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center px-4 pb-3 sm:hidden">
        <Link
          href="/globe"
          className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-all duration-300 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100"
        >
          🌍 {getTranslation('nav.globe', lang) || 'Rüya Haritası'}
        </Link>
      </div>
    </header>
  )
}