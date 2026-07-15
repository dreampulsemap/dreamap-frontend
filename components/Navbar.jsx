import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { auth } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getDreamCardText } from '@/lib/dreamCardTranslations'

const SHOP_URL = 'https://shop.lunosfer.com'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [auras, setAuras] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [auraDropdownOpen, setAuraDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const auraDropdownRef = useRef(null)

  const { i18n } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const t = getDreamCardText(currentLang)

  useEffect(() => {
    if (!mounted) return

    async function checkUser() {
      try {
        const { data: { user: currentUser } } = await auth.getUser()
        setUser(currentUser || null)

        if (currentUser) {
          const profile = await auth.getProfile(currentUser.id)
          setAvatarUrl(profile?.avatar_url || currentUser?.user_metadata?.avatar_url || '')
          setAuras(Number(profile?.premium_analysis_auras || 0))
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

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-slate-950/70 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 py-3 sm:px-6">
        
        {/* LOGO */}
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-3">
          <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 shadow-[0_0_30px_rgba(56,189,248,0.06)] transition-all duration-300 group-hover:border-cyan-300/20 group-hover:shadow-[0_0_40px_rgba(34,211,238,0.12)]">
            <img src="/logo.png" alt="Lunosfer" className="h-7 w-auto object-contain sm:h-9" />
          </div>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-[1.05rem] font-black uppercase tracking-[0.18em] text-transparent md:text-[1.3rem] bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300 [text-shadow:0_0_8px_rgba(168,85,247,0.3)] transition-all group-hover:from-fuchsia-200 group-hover:via-cyan-100">
              LUNOSFER
            </span>
            <span className="mt-0.5 hidden text-[9px] font-medium uppercase tracking-[0.28em] text-cyan-200/50 md:block">
              Dream Nexus
            </span>
          </div>
        </Link>

        {/* MASAÜSTÜ NAVİGASYONU (Sadece PC'de görünür) */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Ana Sayfa</Link>
          <Link href="/explore" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Keşfet</Link>
          <Link href="/globe" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Küre</Link>
        </nav>

        {/* SAĞ KONTROLLER (Aura & Dil) */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="shrink-0">
            <LanguageSwitcher />
          </div>

          {user ? (
            <div className="relative" ref={auraDropdownRef}>
              <button
                type="button"
                onClick={() => setAuraDropdownOpen(!auraDropdownOpen)}
                className="flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3.5 py-1.5 text-xs font-bold text-fuchsia-300 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20 [box-shadow:0_0_15px_rgba(240,73,214,0.1)]"
              >
                <span className="text-sm">✦</span>
                <span>{auras}</span>
              </button>

              {auraDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50 animate-fade-in">
                  <p className="text-xs text-slate-400 mb-1">{currentLang === 'tr' ? 'Mevcut Aura:' : 'Your Auras:'}</p>
                  <p className="text-lg font-black text-fuchsia-300 mb-3 flex items-center gap-1.5">
                    <span>✦</span> {auras}
                  </p>
                  <a
                    href={SHOP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-2.5 text-xs font-bold text-white transition hover:scale-[1.02] shadow-[0_0_20px_rgba(240,73,214,0.2)]"
                  >
                    {t.buyAuraLabel}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-100 transition-all hover:bg-cyan-500/20"
            >
              🔑 {currentLang === 'tr' ? 'Giriş' : 'Log In'}
            </Link>
          )}

          {/* Masaüstü Profil Avatarı */}
          {user && (
            <Link href="/profile" className="hidden md:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 overflow-hidden hover:border-fuchsia-400/50 transition-all">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <span className="text-sm">👤</span>}
            </Link>
          )}
        </div>

      </div>
    </header>
  )
}