import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { auth, supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'

const SHOP_URL = 'https://shop.lunosfer.com'

const NAV_UI = {
  tr: { globe: 'Rüya Haritası', profile: 'Profilim', addDream: 'Rüya Ekle', prophecy: 'Kehanet', menu: 'Menü', close: 'Kapat', signIn: 'Giriş Yap', currentAura: 'Aura Bakiyeniz:' },
  en: { globe: 'Dream Map', profile: 'Profile', addDream: 'Add Dream', prophecy: 'Prophecy', menu: 'Menu', close: 'Close', signIn: 'Sign In', currentAura: 'Your Aura:' },
}

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [auras, setAuras] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [auraDropdownOpen, setAuraDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const auraDropdownRef = useRef(null)

  const { i18n } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const lang = NAV_UI[currentLang] ? currentLang : 'en'
  const ui = NAV_UI[lang]
  const t = getDreamCardText(currentLang)

  useEffect(() => {
    if (!mounted) return

    async function checkUser() {
      try {
        if (auth && typeof auth.getUser === 'function') {
          const currentUser = await auth.getUser()
          setUser(currentUser || null)

          if (currentUser && typeof auth.getProfile === 'function') {
            const profile = await auth.getProfile(currentUser.id)
            setAvatarUrl(
              profile?.avatar_url ||
                profile?.avatar ||
                currentUser?.user_metadata?.avatar_url ||
                ''
            )
            setAuras(Number(profile?.premium_analysis_auras || 0))
          }
        }
      } catch (error) {
        console.error('Navbar user check failed:', error)
      }
    }
    checkUser()

    const { data: authSubscription } = auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const profile = await auth.getProfile(session.user.id)
        setAuras(Number(profile?.premium_analysis_auras || 0))
        setAvatarUrl(profile?.avatar_url || '')
      } else {
        setUser(null)
        setAuras(0)
        setAvatarUrl('')
      }
    })

    return () => {
      authSubscription?.subscription?.unsubscribe()
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    function handleClickOutside(event) {
      if (auraDropdownRef.current && !auraDropdownRef.current.contains(event.target)) {
        setAuraDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mounted])

  const globeLabel =
    getTranslation('nav.globe', lang) && getTranslation('nav.globe', lang) !== 'nav.globe'
      ? getTranslation('nav.globe', lang)
      : ui.globe

  const profileLabel =
    getTranslation('nav.profile', lang) && getTranslation('nav.profile', lang) !== 'nav.profile'
      ? getTranslation('nav.profile', lang)
      : ui.profile

  const AvatarCircle = ({ size = 28 }) => (
    <div
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-full border border-emerald-300/30 bg-white/5 shrink-0"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={profileLabel}
          className="h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm">👤</div>
      )}
    </div>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        
        {/* LOGO */}
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 shadow-[0_0_30px_rgba(56,189,248,0.06)] transition-all duration-300 group-hover:border-cyan-300/20 group-hover:shadow-[0_0_40px_rgba(34,211,238,0.12)] sm:rounded-2xl sm:px-3 sm:py-2">
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
                tracking-[0.1em] text-transparent
                sm:text-[1.05rem] sm:tracking-[0.18em]
                md:text-[1.3rem]
                bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300
                [text-shadow:0_0_8px_rgba(168,85,247,0.3),0_0_16px_rgba(34,211,238,0.15)]
                transition-all duration-300
                group-hover:from-fuchsia-200 group-hover:via-cyan-100 group-hover:to-violet-200
              "
            >
              LUNOSFER
            </span>
            <span className="mt-0.5 hidden whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.28em] text-cyan-200/50 md:block">
              Dream Nexus
            </span>
          </div>
        </Link>

        {/* DESKTOP NAV LINKS */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/globe" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            {globeLabel}
          </Link>
          <Link href="/add-dream" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            {ui.addDream}
          </Link>
          <a href="/#prophecy" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            {ui.prophecy}
          </a>
        </nav>

        {/* SAĞ KONTROLLER */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          
          <div className="hidden sm:block shrink-0">
            <LanguageSwitcher />
          </div>

          {/* PREMIUM AURA CONTAINER */}
          {user && (
            <div className="relative" ref={auraDropdownRef}>
              <button
                type="button"
                onClick={() => setAuraDropdownOpen(!auraDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-300 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20 [box-shadow:0_0_15px_rgba(240,73,214,0.1)]"
              >
                <span>✦</span>
                <span>{auras} Aura</span>
                <span className="text-[9px] text-fuchsia-400/60">▼</span>
              </button>

              {auraDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50">
                  <p className="text-xs text-slate-400 mb-1">{ui.currentAura}</p>
                  <p className="text-lg font-black text-fuchsia-300 mb-3 flex items-center gap-1.5">
                    <span>✦</span> {auras} Aura
                  </p>
                  <a
                    href={SHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 shadow-[0_0_20px_rgba(240,73,214,0.2)] animate-pulse"
                  >
                    {t.buyAuraLabel}
                  </a>
                </div>
              )}
            </div>
          )}

          {user ? (
            <Link
              href="/profile"
              aria-label={profileLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/10 transition-all duration-200 hover:border-emerald-300/40 hover:bg-emerald-500/18"
            >
              <AvatarCircle size={28} />
            </Link>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 text-xs font-medium text-cyan-100 transition-all duration-200 hover:border-cyan-300/45 hover:bg-cyan-500/20 sm:px-4 sm:text-sm"
            >
              <span aria-hidden="true">🔑</span>
              <span>{ui.signIn}</span>
            </Link>
          )}

          {/* HAMBURGER BUTTON */}
          <button
            type="button"
            aria-label={menuOpen ? ui.close : ui.menu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition-all duration-200 hover:border-white/20 hover:bg-white/10"
          >
            <span className="text-base">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* MOBILE EXPANDED MENU */}
      {menuOpen ? (
        <div className="border-t border-white/8 bg-slate-950/95 px-3 py-4 backdrop-blur-2xl sm:px-4">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-2">
            
            <div className="sm:hidden flex justify-center py-1">
              <LanguageSwitcher />
            </div>

            <Link
              href="/globe"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-100"
            >
              <span aria-hidden="true">🌐</span>
              <span>{globeLabel}</span>
            </Link>

            <Link
              href="/add-dream"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 text-sm font-medium text-violet-100"
            >
              <span aria-hidden="true">✨</span>
              <span>{ui.addDream}</span>
            </Link>

            <a
              href="/#prophecy"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-100"
            >
              <span aria-hidden="true">🔮</span>
              <span>{ui.prophecy}</span>
            </a>

            {user && (
              <div className="mt-2 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 text-center">
                <p className="text-xs text-fuchsia-300/80 mb-2">{ui.currentAura} ✦ {auras} Aura</p>
                <a
                  href={SHOP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 text-xs font-bold text-white shadow-lg"
                >
                  {t.buyAuraLabel}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}