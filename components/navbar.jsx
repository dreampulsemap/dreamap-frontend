import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { auth } from '../lib/supabase'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

const NAV_UI = {
  tr: {
    globe: 'Küre',
    profile: 'Profilim',
    addDream: 'Rüya Ekle',
    prophecy: 'Kehanet',
    menu: 'Menü',
    close: 'Kapat',
  },
  en: {
    globe: 'Globe',
    profile: 'Profile',
    addDream: 'Add Dream',
    prophecy: 'Prophecy',
    menu: 'Menu',
    close: 'Close',
  },
  es: {
    globe: 'Globo',
    profile: 'Perfil',
    addDream: 'Añadir Sueño',
    prophecy: 'Profecía',
    menu: 'Menú',
    close: 'Cerrar',
  },
  fr: {
    globe: 'Globe',
    profile: 'Profil',
    addDream: 'Ajouter un Rêve',
    prophecy: 'Prophétie',
    menu: 'Menu',
    close: 'Fermer',
  },
  de: {
    globe: 'Globus',
    profile: 'Profil',
    addDream: 'Traum Hinzufügen',
    prophecy: 'Prophezeiung',
    menu: 'Menü',
    close: 'Schließen',
  },
  pt: {
    globe: 'Globo',
    profile: 'Perfil',
    addDream: 'Adicionar Sonho',
    prophecy: 'Profecia',
    menu: 'Menu',
    close: 'Fechar',
  },
  ru: {
    globe: 'Глобус',
    profile: 'Профиль',
    addDream: 'Добавить Сон',
    prophecy: 'Пророчество',
    menu: 'Меню',
    close: 'Закрыть',
  },
  ja: {
    globe: 'グローブ',
    profile: 'プロフィール',
    addDream: '夢を追加',
    prophecy: '予言',
    menu: 'メニュー',
    close: '閉じる',
  },
}

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { i18n } = useTranslation()
  const lang = NAV_UI[i18n.language] ? i18n.language : 'en'
  const ui = NAV_UI[lang]

  useEffect(() => {
    async function checkUser() {
      try {
        if (auth && typeof auth.getUser === 'function') {
          const currentUser = await auth.getUser()
          setUser(currentUser || null)
        }
      } catch (error) {
        console.error('Navbar user check failed:', error)
      }
    }
    checkUser()
  }, [])

  const globeLabel =
    getTranslation('nav.globe', lang) &&
    getTranslation('nav.globe', lang) !== 'nav.globe'
      ? getTranslation('nav.globe', lang)
      : ui.globe

  const profileLabel =
    getTranslation('nav.profile', lang) &&
    getTranslation('nav.profile', lang) !== 'nav.profile'
      ? getTranslation('nav.profile', lang)
      : ui.profile

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 shadow-[0_0_30px_rgba(56,189,248,0.06)] transition-all duration-300 group-hover:border-cyan-300/20 group-hover:shadow-[0_0_40px_rgba(34,211,238,0.12)] sm:rounded-2xl sm:px-3 sm:py-2 shrink-0">
            <Image
              src="/logo.png"
              alt="Lunosfer"
              width={132}
              height={40}
              priority
              className="h-6 w-auto object-contain sm:h-8 md:h-10"
            />
          </div>

          <div className="flex min-w-0 flex-col leading-none">
            <span
              className="
                whitespace-nowrap text-[0.75rem] font-black uppercase
                tracking-[0.22em] text-transparent
                sm:text-[1.1rem] sm:tracking-[0.32em]
                md:text-[1.4rem]
                bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300
                [text-shadow:0_0_8px_rgba(168,85,247,0.3),0_0_16px_rgba(34,211,238,0.15)]
                transition-all duration-300
                group-hover:from-fuchsia-200 group-hover:via-cyan-100 group-hover:to-violet-200
              "
            >
              LUNOSFER
            </span>

            <span className="mt-0.5 hidden whitespace-nowrap text-[10px] uppercase tracking-[0.42em] text-cyan-200/55 md:block">
              Dream Nexus
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            href="/globe"
            className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-cyan-300/25 hover:bg-cyan-500/10 hover:text-white"
          >
            🌐 {globeLabel}
          </Link>

          <Link
            href="/add-dream"
            className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-violet-300/18 bg-violet-500/10 px-4 text-sm font-medium text-violet-100 transition hover:border-violet-300/35 hover:bg-violet-500/16"
          >
            ✨ {ui.addDream}
          </Link>

          <a
            href="/#prophecy"
            className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:border-fuchsia-300/25 hover:bg-fuchsia-500/10 hover:text-white"
          >
            🔮 {ui.prophecy}
          </a>

          {user ? (
            <Link
              href="/profile"
              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-emerald-300/16 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/30 hover:bg-emerald-500/16"
            >
              👤 {profileLabel}
            </Link>
          ) : null}

          <div className="ml-1 shrink-0">
            <LanguageSwitcher />
          </div>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 md:hidden">
          {user ? (
            <Link
              href="/profile"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/16 bg-emerald-500/10 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/30 hover:bg-emerald-500/16 sm:h-11 sm:w-11"
              aria-label={profileLabel}
            >
              👤
            </Link>
          ) : null}

          <div className="shrink-0">
            <LanguageSwitcher />
          </div>

          <button
            type="button"
            aria-label={menuOpen ? ui.close : ui.menu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10 sm:h-11 sm:w-11"
          >
            <span className="text-base sm:text-lg">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/8 bg-slate-950/92 px-3 py-4 backdrop-blur-2xl sm:px-4 md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2">
            <Link
              href="/globe"
              onClick={() => setMenuOpen(false)}
              className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100"
            >
              🌐 {globeLabel}
            </Link>

            <Link
              href="/add-dream"
              onClick={() => setMenuOpen(false)}
              className="inline-flex min-h-[48px] items-center rounded-2xl border border-violet-300/18 bg-violet-500/10 px-4 text-sm font-medium text-violet-100"
            >
              ✨ {ui.addDream}
            </Link>

            <a
              href="/#prophecy"
              onClick={() => setMenuOpen(false)}
              className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100"
            >
              🔮 {ui.prophecy}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  )
}
