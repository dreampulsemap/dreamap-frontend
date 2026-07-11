import Link from 'next/link'
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
    tagline: 'kolektif rüya ağı',
  },
  en: {
    globe: 'Globe',
    profile: 'Profile',
    addDream: 'Add Dream',
    prophecy: 'Prophecy',
    menu: 'Menu',
    close: 'Close',
    tagline: 'collective dream network',
  },
  es: {
    globe: 'Globo',
    profile: 'Perfil',
    addDream: 'Añadir Sueño',
    prophecy: 'Profecía',
    menu: 'Menú',
    close: 'Cerrar',
    tagline: 'red colectiva de sueños',
  },
  fr: {
    globe: 'Globe',
    profile: 'Profil',
    addDream: 'Ajouter un Rêve',
    prophecy: 'Prophétie',
    menu: 'Menu',
    close: 'Fermer',
    tagline: 'réseau collectif de rêves',
  },
  de: {
    globe: 'Globus',
    profile: 'Profil',
    addDream: 'Traum Hinzufügen',
    prophecy: 'Prophezeiung',
    menu: 'Menü',
    close: 'Schließen',
    tagline: 'kollektives Traumnetzwerk',
  },
  pt: {
    globe: 'Globo',
    profile: 'Perfil',
    addDream: 'Adicionar Sonho',
    prophecy: 'Profecia',
    menu: 'Menu',
    close: 'Fechar',
    tagline: 'rede coletiva de sonhos',
  },
  ru: {
    globe: 'Глобус',
    profile: 'Профиль',
    addDream: 'Добавить Сон',
    prophecy: 'Пророчество',
    menu: 'Меню',
    close: 'Закрыть',
    tagline: 'коллективная сеть снов',
  },
  ja: {
    globe: 'グローブ',
    profile: 'プロフィール',
    addDream: '夢を追加',
    prophecy: '予言',
    menu: 'メニュー',
    close: '閉じる',
    tagline: '集合的な夢のネットワーク',
  },
}

function BrandMark() {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 shadow-[0_0_30px_rgba(56,189,248,0.08)] backdrop-blur-xl">
      <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.14),transparent_45%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.16),transparent_50%)]" />
      <div className="relative h-6 w-6 rounded-full border border-cyan-200/40">
        <div className="absolute inset-[3px] rounded-full border border-violet-300/35" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.65)]" />
      </div>
    </div>
  )
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group min-w-0">
          <div className="flex items-center gap-3">
            <BrandMark />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-[1.05rem] font-semibold tracking-[0.18em] text-transparent sm:text-[1.15rem]">
                  LUNOSFER
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.24em] text-slate-500 sm:text-[11px]">
                {ui.tagline}
              </p>
            </div>
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

          <div className="ml-1">
            <LanguageSwitcher />
          </div>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />

          <button
            type="button"
            aria-label={menuOpen ? ui.close : ui.menu}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/8 bg-slate-950/92 px-4 py-4 backdrop-blur-2xl md:hidden">
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

            {user ? (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="inline-flex min-h-[48px] items-center rounded-2xl border border-emerald-300/16 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100"
              >
                👤 {profileLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  )
}