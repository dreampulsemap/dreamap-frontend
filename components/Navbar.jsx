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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/55 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={lang === 'tr' ? 'Menüyü aç' : 'Open menu'}
            className="energy-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/90 shadow-[0_0_24px_rgba(139,92,246,0.12)] hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            <span className="flex flex-col gap-[3px]">
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
              <span className="h-[2px] w-4 rounded-full bg-current" />
            </span>
          </button>

          <Link
            href="/"
            className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.01]"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/25 bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/20 text-lg text-white shadow-[0_0_32px_rgba(34,211,238,0.12)]">
                ☾
              </div>
            </div>

            <div className="flex flex-col">
              <span className="gradient-text text-lg font-semibold tracking-[0.22em] sm:text-xl">
                LUNOSFER
              </span>
              <span className="text-[10px] uppercase tracking-[0.32em] text-slate-500 sm:text-[11px]">
                Collective Dream Network
              </span>
            </div>
          </Link>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/globe"
            className="energy-button inline-flex rounded-full border border-cyan-300/15 bg-cyan-500/8 px-4 py-2 text-sm font-medium text-slate-200 shadow-[0_0_20px_rgba(6,182,212,0.08)] hover:border-cyan-300/40 hover:bg-cyan-400/12 hover:text-cyan-100"
          >
            🌐 {getTranslation('nav.globe', lang) || 'Küre'}
          </Link>

          <Link
            href="/profile"
            className="energy-button inline-flex rounded-full border border-fuchsia-300/15 bg-fuchsia-500/8 px-4 py-2 text-sm font-medium text-slate-200 shadow-[0_0_20px_rgba(139,92,246,0.08)] hover:border-fuchsia-300/35 hover:bg-fuchsia-500/14 hover:text-white"
          >
            👤 {getTranslation('nav.profile', lang) || 'Profil'}
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <Link
              href="/add-dream"
              className="energy-button inline-flex rounded-full border border-emerald-300/15 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.12)] hover:border-emerald-300/35 hover:bg-emerald-500/16"
            >
              ✦ {lang === 'tr' ? 'Rüya Ekle' : 'Add Dream'}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="energy-button inline-flex rounded-full border border-cyan-300/20 bg-gradient-to-r from-cyan-500/16 to-violet-500/14 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.14)] hover:border-cyan-300/40 hover:from-cyan-500/24 hover:to-violet-500/20"
            >
              {getTranslation('nav.login', lang) || 'Giriş Yap'}
            </Link>
          )}

          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 lg:hidden sm:px-6">
        <Link
          href="/globe"
          className="energy-button inline-flex rounded-full border border-cyan-300/15 bg-cyan-500/8 px-4 py-2 text-sm font-medium text-slate-200 hover:border-cyan-300/35 hover:bg-cyan-400/12 hover:text-cyan-100"
        >
          🌐 {getTranslation('nav.globe', lang) || 'Küre'}
        </Link>
        <Link
          href="/profile"
          className="energy-button inline-flex rounded-full border border-fuchsia-300/15 bg-fuchsia-500/8 px-4 py-2 text-sm font-medium text-slate-200 hover:border-fuchsia-300/35 hover:bg-fuchsia-500/14 hover:text-white"
        >
          👤 {getTranslation('nav.profile', lang) || 'Profil'}
        </Link>
      </div>
    </header>
  )
}