// Android MainScreen.kt TopBar'ının web karşılığı — aynı düzen, aynı menü.
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { User, LogIn, Bell, Droplet, Star, MoreVertical, Trophy, Smartphone } from 'lucide-react'
import { supabase, auth } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useGameProgress } from '@/components/game/GameUI'
import { REPLAY_TOUR_EVENT } from '@/components/game/OnboardingTour'
import { rankColor, rankProgress, rankName } from '@/lib/game'

const SHOP_URL = 'https://shop.lunosfer.com'
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=io.lunosfer.dreamap'

const TEXT = {
  tr: {
    auras: (n) => `Auraların: ${n}`, buyAura: 'Aura Satın Al', login: 'Giriş Yap', notifications: 'Bildirimler', more: 'Diğer seçenekler',
    profile: 'Profil', journey: 'Yolculuğum', guide: 'Uygulama Rehberi', globe: 'Küre', shared: 'Paylaşılan Vizyonlar',
    spiritual: 'Ruhsal Araçlar', deep: 'Derin Analiz', settings: 'Ayarlar', help: 'Yardım ve Geri Bildirim',
    androidApp: 'Android Uygulaması', androidShort: 'Android',
  },
  en: {
    auras: (n) => `Your Auras: ${n}`, buyAura: 'Buy Aura', login: 'Log In', notifications: 'Notifications', more: 'More options',
    profile: 'Profile', journey: 'My Journey', guide: 'App guide', globe: 'Globe', shared: 'Shared Visions',
    spiritual: 'Spiritual Tools', deep: 'Deep Analysis', settings: 'Settings', help: 'Help & Feedback',
    androidApp: 'Android App', androidShort: 'Android',
  },
}

function RankRingAvatar({ lang, label }) {
  const p = useGameProgress()
  const prog = p && !p.is_guest ? p : null
  const rank = prog?.rank || 0
  const color = rankColor(rank)
  const frac = prog ? rankProgress(prog) : 0
  const r = 16.75
  const c = 2 * Math.PI * r
  return (
    <Link
      href="/profile"
      aria-label={prog ? `${label} · ${rankName(lang, rank)}` : label}
      className="relative mr-2 flex h-9 w-9 shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-9 w-9 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeOpacity="0.22" strokeWidth="2.5" />
        {prog && (
          <circle
            cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 900ms' }}
          />
        )}
      </svg>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-void-800">
        <User size={18} className="text-astral-gold" fill="currentColor" />
      </span>
      {prog && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-void-950 text-[8px] font-bold leading-none text-void-950"
          style={{ background: color }}
        >
          {rank + 1}
        </span>
      )}
    </Link>
  )
}

function useOutside(ref, open, close) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) close() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ref, open, close])
}

const menuCls = 'absolute top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-[4px] bg-[#1d2130] py-2 shadow-2xl'
const itemCls = 'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-100 hover:bg-white/5'

export default function Navbar() {
  const router = useRouter()
  const { subscribe: subscribeToPush } = usePushSubscription()
  const [user, setUser] = useState(null)
  const [auras, setAuras] = useState(0)
  const [mana, setMana] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [auraOpen, setAuraOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const auraRef = useRef(null)
  const moreRef = useRef(null)
  useOutside(auraRef, auraOpen, () => setAuraOpen(false))
  useOutside(moreRef, moreOpen, () => setMoreOpen(false))

  const { i18n } = useTranslation()
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted && (i18n?.language || 'en').startsWith('tr') ? 'tr' : 'en'
  const t = TEXT[lang]

  useEffect(() => {
    if (!mounted) return
    let active = true

    async function loadProfile(currentUser) {
      let { data: profile } = await supabase.from('user_profiles').select('premium_analysis_auras, mana_balance, username').eq('id', currentUser.id).maybeSingle()
      // user_profiles satırı eksik/username boşsa (eski veya panelden açılmış hesap) burada tamamlanıyor;
      // yoksa her yerde kullanıcı adı yerine "Bilinmeyen" görünüyordu.
      if (!profile || !profile.username) {
        const created = await auth.ensureProfile(currentUser)
        if (created) profile = created
      }
      if (!active) return
      setAuras(Number(profile?.premium_analysis_auras || 0))
      setMana(Number(profile?.mana_balance ?? 0))
    }

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!active) return
      setUser(u || null)
      if (u) loadProfile(u).catch(() => {})
    })

    function handleManaUpdate(e) { if (typeof e.detail?.balance === 'number') setMana(e.detail.balance) }
    window.addEventListener('mana-balance-updated', handleManaUpdate)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user).catch(() => {})
      } else {
        setUser(null); setAuras(0); setMana(0); setUnreadCount(0)
      }
    })

    return () => { active = false; subscription?.unsubscribe(); window.removeEventListener('mana-balance-updated', handleManaUpdate) }
  }, [mounted])

  // Bildirimler ekranından dönünce rozet tazelensin diye her sayfa geçişinde.
  useEffect(() => {
    if (!user) return
    let active = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = await res.json()
        if (res.ok && active) setUnreadCount(json.unreadCount || 0)
      } catch {}
    })
    return () => { active = false }
  }, [user, router.asPath])

  const go = (href) => { setMoreOpen(false); router.push(href) }

  return (
    <header className="sticky top-0 z-50 bg-void-950">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
        <div className="flex min-w-0 items-center gap-2 pl-4">
          {/* Android uygulama linki. Giriş yapmamışken sol taraf boş olduğu için her ekranda görünür;
              giriş yapmışken mana/aura rozetleriyle dar ekranda çakışmasın diye sadece sm+ ekranlarda
              gösterilir (mobilde aynı link ⋮ menüsünde). */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.androidApp}
            className={`h-7 shrink-0 items-center gap-1 rounded-full border border-slate-500/60 px-2 text-xs font-medium text-slate-100 hover:bg-white/5 ${user ? 'hidden sm:flex' : 'flex'}`}
          >
            <Smartphone size={14} />
            <span className="whitespace-nowrap sm:hidden">{t.androidShort}</span>
            <span className="hidden whitespace-nowrap sm:inline">{t.androidApp}</span>
          </a>
          {user && (
            <>
              <span className="flex h-7 items-center gap-1 rounded-full border border-aether-cyan bg-aether-cyan/20 px-2 text-xs font-medium text-aether-cyan">
                <Droplet size={14} fill="currentColor" />
                {mana}
              </span>
              <div className="relative" ref={auraRef}>
                <button
                  onClick={() => setAuraOpen((o) => !o)}
                  className="flex h-7 items-center gap-1 rounded-full border border-astral-gold bg-astral-gold/20 px-2 text-xs font-medium text-astral-gold"
                >
                  <Star size={14} fill="currentColor" />
                  {auras}
                </button>
                {auraOpen && (
                  <div className={`${menuCls} left-0`}>
                    <button onClick={() => setAuraOpen(false)} className={itemCls}>{t.auras(auras)}</button>
                    <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" onClick={() => setAuraOpen(false)} className={itemCls}>{t.buyAura}</a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Link href="/" className="px-1">
          <span className="whitespace-nowrap font-serif text-[clamp(11px,4.4vw,18px)] font-bold tracking-[1.5px] bg-gradient-to-r from-astral-gold to-astral-amber bg-clip-text text-transparent">
            LUNOSFER
          </span>
        </Link>

        <div className="flex min-w-0 items-center justify-end">
          {user ? (
            <>
              <Link
                href="/notifications"
                onClick={() => subscribeToPush()}
                aria-label={t.notifications}
                className="relative flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/5"
              >
                <Bell size={24} fill="currentColor" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-semantic-danger-500 px-1 text-[10px] font-medium text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <RankRingAvatar lang={lang} label={t.profile} />
              <div className="relative" ref={moreRef}>
                <button onClick={() => setMoreOpen((o) => !o)} aria-label={t.more} className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/5">
                  <MoreVertical size={24} />
                </button>
                {moreOpen && (
                  <div className={`${menuCls} right-1`}>
                    <button onClick={() => go('/journey')} className={itemCls}><Trophy size={20} className="text-astral-gold" fill="currentColor" />{t.journey}</button>
                    <button onClick={() => { setMoreOpen(false); window.dispatchEvent(new Event(REPLAY_TOUR_EVENT)) }} className={itemCls}>{t.guide}</button>
                    <button onClick={() => go('/globe')} className={itemCls}>{t.globe}</button>
                    <button onClick={() => go('/shared-visions')} className={itemCls}>{t.shared}</button>
                    <button onClick={() => go('/spiritual-tools')} className={itemCls}>{t.spiritual}</button>
                    <button onClick={() => go('/deep-analysis')} className={itemCls}>{t.deep}</button>
                    <button onClick={() => go('/profile?settings=1')} className={itemCls}>{t.settings}</button>
                    <button onClick={() => go('/support')} className={itemCls}>{t.help}</button>
                    <a
                      href={PLAY_STORE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMoreOpen(false)}
                      className={`${itemCls} sm:hidden`}
                    >
                      <Smartphone size={20} className="text-astral-gold" />{t.androidApp}
                    </a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/auth" className="mr-2 flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white hover:bg-white/5">
              <LogIn size={18} />
              {t.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

