import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { User, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import TextSkeleton from '@/components/TextSkeleton'

const SHOP_URL = 'https://shop.lunosfer.com'

const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/explore', key: 'explore' },
  { href: '/globe', key: 'globe' },
  { href: '/vision-board', key: 'vision' },
]

const NAV_LABELS = {
  home: { tr: 'Ana Sayfa', en: 'Home' },
  explore: { tr: 'Keşfet', en: 'Explore' },
  globe: { tr: 'Küre', en: 'Globe' },
  vision: { tr: 'Vizyon', en: 'Vision' },
}

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [auras, setAuras] = useState(0)
  const [mana, setMana] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [auraDropdownOpen, setAuraDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const auraDropdownRef = useRef(null)

  const { i18n } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'
  const t = getDreamCardText(currentLang)

  useEffect(() => {
    if (!mounted) return
    let active = true

    async function checkUser() {
      try {
        // DOĞRUDAN SUPABASE CORE KULLANIMI (Hatasız)
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!active) return
        
        setUser(currentUser || null)

        if (currentUser) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('avatar_url, premium_analysis_auras, mana_balance')
            .eq('id', currentUser.id)
            .maybeSingle()
            
          setAvatarUrl(profile?.avatar_url || currentUser?.user_metadata?.avatar_url || '')
          setAuras(Number(profile?.premium_analysis_auras || 0))
          setMana(Number(profile?.mana_balance ?? 0))
        }
      } catch (error) {
        console.error('Navbar user check failed:', error)
      }
    }
    
    checkUser()

    // GoalCard mana verince bu event'i fırlatır — Navbar'daki bakiyeyi
    // sayfa yenilemeden anında günceller.
    function handleManaUpdate(e) {
      if (typeof e.detail?.balance === 'number') setMana(e.detail.balance)
    }
    window.addEventListener('mana-balance-updated', handleManaUpdate)

    // Oturum değişikliklerini dinleme (Hatasız Abonelik İptali)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('avatar_url, premium_analysis_auras, mana_balance')
          .eq('id', session.user.id)
          .maybeSingle()
          
        setAuras(Number(profile?.premium_analysis_auras || 0))
        setMana(Number(profile?.mana_balance ?? 0))
        setAvatarUrl(profile?.avatar_url || '')
      } else {
        setUser(null)
        setAuras(0)
        setMana(0)
        setAvatarUrl('')
      }
    })

    return () => {
      active = false
      subscription?.unsubscribe()
      window.removeEventListener('mana-balance-updated', handleManaUpdate)
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
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
        
        {/* LOGO */}
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-[0_0_30px_rgba(56,189,248,0.06)] transition-all duration-300 group-hover:border-cyan-300/20 group-hover:shadow-[0_0_40px_rgba(34,211,238,0.12)]">
            <img src="/logo.png" alt="Lunosfer" className="h-6 w-auto object-contain sm:h-9" />
          </div>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-[0.85rem] font-black uppercase tracking-[0.14em] text-transparent sm:text-[1.05rem] md:text-[1.3rem] sm:tracking-[0.18em] bg-clip-text bg-gradient-to-r from-fuchsia-300 via-cyan-200 to-violet-300 [text-shadow:0_0_8px_rgba(168,85,247,0.3)] transition-all group-hover:from-fuchsia-200 group-hover:via-cyan-100">
              LUNOSFER
            </span>
            <span className="mt-0.5 hidden text-[9px] font-medium uppercase tracking-[0.28em] text-cyan-200/50 md:block">
              Dream Nexus
            </span>
          </div>
        </Link>

        {/* MASAÜSTÜ NAVİGASYONU (Sadece PC'de görünür — mobilde alt sekme çubuğunda) */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link key={key} href={href} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              {mounted ? NAV_LABELS[key][currentLang === 'tr' ? 'tr' : 'en'] : <TextSkeleton width="w-14" />}
            </Link>
          ))}
        </nav>

        {/* SAĞ KONTROLLER — mobilde sadece dil + avatar/giriş; Mana/Aura
            rozetleri mobil üst barda YER AÇMIYOR (Instagram/Facebook deseni:
            üst bar minimal tutulur, ikincil bilgiler menüye/profile taşınır).
            Masaüstünde (sm+) hepsi görünür kalıyor, orada yer sorunu yok. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="shrink-0">
            <LanguageSwitcher />
          </div>

          {/* MANA (Can Suyu) GÖSTERGESİ — mobilde kompakt (ikon+sayı, pill yok),
              sm+ ekranlarda tam pill. Instagram'ın takipçi sayısı gibi "ikincil
              sosyal veri" değil, Duolingo'nun can/elmas göstergesi gibi ANA
              EKONOMİ mekaniği — bu yüzden mobilde tamamen gizlemek yerine
              sadece küçültüyoruz. */}
          {user && (
            <div
              className="flex items-center gap-1 sm:gap-1.5 sm:rounded-full sm:border sm:border-cyan-400/30 sm:bg-cyan-500/10 px-1 sm:px-3.5 py-1 sm:py-1.5 text-xs font-bold text-cyan-300 sm:[box-shadow:0_0_15px_rgba(34,211,238,0.1)]"
              title={currentLang === 'tr' ? 'Mana bakiyen — her gün yenilenir' : 'Your Mana — refills daily'}
            >
              <span className="text-xs sm:text-sm">💧</span>
              <span>{mana}</span>
            </div>
          )}

          {/* PREMIUM AURA CONTAINER — aynı mantık, mobilde kompakt */}
          {user && (
            <div className="relative" ref={auraDropdownRef}>
              <button
                type="button"
                onClick={() => setAuraDropdownOpen(!auraDropdownOpen)}
                className="flex items-center gap-1 sm:gap-1.5 sm:rounded-full sm:border sm:border-fuchsia-400/30 sm:bg-fuchsia-500/10 px-1 sm:px-3.5 py-1 sm:py-1.5 text-xs font-bold text-fuchsia-300 transition sm:hover:border-fuchsia-400/50 sm:hover:bg-fuchsia-500/20 sm:[box-shadow:0_0_15px_rgba(240,73,214,0.1)]"
              >
                <span className="text-xs sm:text-sm">✦</span>
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
          )}

          {user ? (
            <Link href="/profile" className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 overflow-hidden hover:border-fuchsia-400/50 transition-all">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <User size={16} className="text-white/70" />}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/25 bg-cyan-500/10 px-2.5 sm:px-4 text-xs font-bold text-cyan-100 transition-all hover:bg-cyan-500/20"
            >
              <LogIn size={13} />
              <span className="hidden sm:inline">{mounted ? (currentLang === 'tr' ? 'Giriş' : 'Log In') : <TextSkeleton width="w-10" />}</span>
            </Link>
          )}

        </div>
      </div>
    </header>
  )
}