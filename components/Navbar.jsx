import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { User, LogIn, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import TextSkeleton from '@/components/TextSkeleton'
import { usePushSubscription } from '@/hooks/usePushSubscription'

const SHOP_URL = 'https://shop.lunosfer.com'

const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/explore', key: 'explore' },
  { href: '/globe', key: 'globe' },
  { href: '/vision-board', key: 'vision' },
]
const NAV_LABELS = {
  home: { tr: 'Ana Sayfa', en: 'Home' }, explore: { tr: 'Keşfet', en: 'Explore' },
  globe: { tr: 'Küre', en: 'Globe' }, vision: { tr: 'Vizyon', en: 'Vision' },
}

export default function Navbar() {
  const router = useRouter()
  const { subscribe: subscribeToPush } = usePushSubscription()
  const [user, setUser] = useState(null)
  const [auras, setAuras] = useState(0)
  const [mana, setMana] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [auraDropdownOpen, setAuraDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const auraDropdownRef = useRef(null)
  const notifDropdownRef = useRef(null)

  const { i18n } = useTranslation()

  useEffect(() => { setMounted(true) }, [])
  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'
  const t = getDreamCardText(currentLang)

  useEffect(() => {
    if (!mounted) return
    let active = true

    async function checkUser() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!active) return
        setUser(currentUser || null)
        if (currentUser) {
          const { data: profile } = await supabase.from('user_profiles').select('avatar_url, premium_analysis_auras, mana_balance').eq('id', currentUser.id).maybeSingle()
          setAvatarUrl(profile?.avatar_url || currentUser?.user_metadata?.avatar_url || '')
          setAuras(Number(profile?.premium_analysis_auras || 0))
          setMana(Number(profile?.mana_balance ?? 0))
          loadNotifications()
        }
      } catch (error) { console.error(error) }
    }
    checkUser()

    function handleManaUpdate(e) { if (typeof e.detail?.balance === 'number') setMana(e.detail.balance) }
    window.addEventListener('mana-balance-updated', handleManaUpdate)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        const { data: profile } = await supabase.from('user_profiles').select('avatar_url, premium_analysis_auras, mana_balance').eq('id', session.user.id).maybeSingle()
        setAuras(Number(profile?.premium_analysis_auras || 0)); setMana(Number(profile?.mana_balance ?? 0)); setAvatarUrl(profile?.avatar_url || '')
      } else {
        setUser(null); setAuras(0); setMana(0); setAvatarUrl('')
      }
    })

    return () => { active = false; subscription?.unsubscribe(); window.removeEventListener('mana-balance-updated', handleManaUpdate) }
  }, [mounted])

  // Dışarı tıklandığında menüleri kapat
  useEffect(() => {
    if (!mounted) return
    function handleClickOutside(event) {
      if (auraDropdownRef.current && !auraDropdownRef.current.contains(event.target)) setAuraDropdownOpen(false)
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) setNotifDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mounted])

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = await res.json()
      if (res.ok) { setNotifications(json.notifications || []); setUnreadCount(json.unreadCount || 0) }
    } catch (err) {}
  }

  async function markAllRead() {
    setUnreadCount(0)
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({}) })
    } catch (err) {}
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-void-950/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
        
        {/* NÖRO-ECLIPSE LOGO & BRAND */}
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative shrink-0 overflow-hidden rounded-xl border border-astral-gold/20 bg-void-900/80 px-2 py-1 shadow-astral-glow transition-all duration-300 group-hover:border-astral-gold/40">
            <img src="/logo.svg" alt="Lunosfer" className="h-6 w-auto object-contain sm:h-8" />
          </div>
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-[0.9rem] font-black font-serif uppercase tracking-[0.18em] gold-gradient-text sm:text-[1.2rem]">
              LUNOSFER
            </span>
            <span className="mt-0.5 hidden text-[8px] font-sans font-medium uppercase tracking-[0.28em] text-aether-cyan/60 md:block">
              Dream Nexus
            </span>
          </div>
        </Link>

        {/* MASAÜSTÜ NAVİGASYON */}
        <nav className="hidden md:flex items-center gap-8 font-sans">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link key={key} href={href} className="text-sm font-medium text-slate-300 hover:text-astral-gold transition-colors">
              {mounted ? NAV_LABELS[key][currentLang === 'tr' ? 'tr' : 'en'] : <TextSkeleton width="w-14" />}
            </Link>
          ))}
        </nav>

        {/* SAĞ KONTROLLER */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 font-sans">
          <LanguageSwitcher />

          {/* MANA */}
          {user && (
            <div className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-aether-cyan/30 bg-aether-cyan/10 px-2.5 py-1 sm:px-3.5 text-xs font-bold text-aether-cyan shadow-aether-glow" title={currentLang === 'tr' ? 'Mana bakiyen' : 'Your Mana'}>
              <span className="text-xs">💧</span><span>{mana}</span>
            </div>
          )}

          {/* BİLDİRİM & GİZLİ AKIŞ TERCİHLERİ */}
          {user && (
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => { setNotifDropdownOpen(!notifDropdownOpen); if (!notifDropdownOpen && unreadCount > 0) markAllRead(); subscribeToPush(); }}
                className="relative flex items-center justify-center w-8 h-8 rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-shadowWork-rose px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 max-h-96 overflow-y-auto rounded-card border border-white/10 bg-void-900 shadow-2xl z-50 animate-fade-in">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bildirimler</span>
                    <span className="text-[9px] text-aether-cyan font-mono">Otomatik Hizalı</span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-6">{currentLang === 'tr' ? 'Henüz bildirim yok.' : 'No notifications yet.'}</p>
                  ) : (
                    notifications.map((n) => {
                      const actorName = n.actor?.display_name || n.actor?.username || (currentLang === 'tr' ? 'Biri' : 'Someone')
                      const messages = {
                        mana_received: currentLang === 'tr' ? `${actorName} vizyonuna mana verdi 💧` : `${actorName} gave mana to your vision 💧`,
                        goal_comment: currentLang === 'tr' ? `${actorName} vizyonuna yorum yaptı 💬` : `${actorName} commented on your vision 💬`,
                        friend_request: currentLang === 'tr' ? `${actorName} sana arkadaşlık isteği gönderdi 👋` : `${actorName} sent you a friend request 👋`,
                        analysis_ready: currentLang === 'tr' ? 'Derinlemesine analiziniz hazır ✨' : 'Your deep analysis is ready ✨',
                      }
                      return (
                        <div key={n.id} onClick={() => { if(n.dream_id) router.push(`/dream/${n.dream_id}`) }} className={`px-4 py-3 border-b border-white/5 text-sm ${n.is_read ? 'text-slate-400' : 'text-white bg-aether-indigo/10 cursor-pointer'}`}>
                          {messages[n.type] || n.type}
                          <p className="text-[10px] text-slate-600 mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                      )
                    })
                  )}
                  {/* ASİMETRİK AYAR */}
                  <div className="p-2.5 border-t border-white/5 bg-void-950/50 text-center">
                    <a href="/profile#stream-preferences" className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors">
                      {currentLang === 'tr' ? 'Akış & Frekans Tercihlerini Yönet' : 'Manage Stream & Frequency'}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AURA */}
          {user && (
            <div className="relative" ref={auraDropdownRef}>
              <button onClick={() => setAuraDropdownOpen(!auraDropdownOpen)} className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-astral-gold/30 bg-astral-gold/10 px-2.5 py-1 sm:px-3.5 text-xs font-bold text-astral-gold shadow-astral-glow hover:border-astral-gold/50 transition-all">
                <span className="text-xs">✦</span><span>{auras}</span>
              </button>
              {auraDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-card border border-white/10 bg-void-900 p-4 shadow-2xl z-50 animate-fade-in">
                  <p className="text-xs text-slate-400 mb-1">{currentLang === 'tr' ? 'Mevcut Aura:' : 'Your Auras:'}</p>
                  <p className="text-lg font-black text-astral-gold mb-3 flex items-center gap-1"><span>✦</span> {auras}</p>
                  <a href={SHOP_URL} target="_blank" rel="noopener noreferrer" className="block text-center rounded-xl bg-astral-gold text-void-950 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:brightness-110 shadow-astral-glow">{t.buyAuraLabel}</a>
                </div>
              )}
            </div>
          )}

          {user ? (
            <Link href="/profile" className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-astral-gold/30 bg-void-900 overflow-hidden hover:border-astral-gold transition-all">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <User size={15} className="text-astral-gold" />}
            </Link>
          ) : (
            <Link href="/auth" className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-astral-gold/30 bg-astral-gold/10 px-3 text-xs font-bold text-astral-gold transition-all hover:bg-astral-gold/20">
              <LogIn size={13} />
              <span className="hidden sm:inline">{mounted ? (currentLang === 'tr' ? 'Giriş' : 'Log In') : <TextSkeleton width="w-8" />}</span>
            </Link>
          )}

        </div>
      </div>
    </header>
  )
    }
