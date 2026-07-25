import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { User, LogIn, Bell, Sparkles, MessageCircle, UserPlus, Check } from 'lucide-react'
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
  home: { tr: 'Ana Sayfa', en: 'Home', es: 'Inicio', fr: 'Accueil', de: 'Start', pt: 'Início', ru: 'Главная', ja: 'ホーム' },
  explore: { tr: 'Keşfet', en: 'Explore', es: 'Explorar', fr: 'Explorer', de: 'Entdecken', pt: 'Explorar', ru: 'Обзор', ja: '探索' },
  globe: { tr: 'Küre', en: 'Globe', es: 'Globo', fr: 'Globe', de: 'Globus', pt: 'Globo', ru: 'Глобус', ja: 'グローブ' },
  vision: { tr: 'Vizyon', en: 'Vision', es: 'Visión', fr: 'Vision', de: 'Vision', pt: 'Visão', ru: 'Видение', ja: 'ビジョン' },
}

// 8 dilde bildirim başlıkları
const NOTIF_I18N = {
  tr: {
    title: 'Bildirimler',
    empty: 'Henüz bildirim yok.',
    markAll: 'Tümünü okundu işaretle',
    mana_received: '{actor} vizyonuna mana verdi 💧',
    goal_comment: '{actor} vizyonuna yorum yaptı 💬',
    friend_request: '{actor} sana arkadaşlık isteği gönderdi 👋',
    friend_accepted: '{actor} isteğini kabul etti ✓',
    deep_analysis_ready: 'Rüya analizin hazır ✨ Tıkla ve keşfet.',
    deep_analysis_failed: 'Analiz tamamlanamadı, Aura iade edildi ↩️',
    someone: 'Biri',
  },
  en: {
    title: 'Notifications',
    empty: 'No notifications yet.',
    markAll: 'Mark all as read',
    mana_received: '{actor} gave mana to your vision 💧',
    goal_comment: '{actor} commented on your vision 💬',
    friend_request: '{actor} sent you a friend request 👋',
    friend_accepted: '{actor} accepted your request ✓',
    deep_analysis_ready: 'Your dream analysis is ready ✨ Tap to explore.',
    deep_analysis_failed: 'Analysis failed — Auras refunded ↩️',
    someone: 'Someone',
  },
  es: {
    title: 'Notificaciones',
    empty: 'Aún no hay notificaciones.',
    markAll: 'Marcar todo como leído',
    mana_received: '{actor} dio maná a tu visión 💧',
    goal_comment: '{actor} comentó en tu visión 💬',
    friend_request: '{actor} te envió una solicitud 👋',
    friend_accepted: '{actor} aceptó tu solicitud ✓',
    deep_analysis_ready: 'Tu análisis de sueño está listo ✨ Toca para explorar.',
    deep_analysis_failed: 'El análisis falló — Auras reembolsados ↩️',
    someone: 'Alguien',
  },
  fr: {
    title: 'Notifications',
    empty: 'Aucune notification pour le moment.',
    markAll: 'Tout marquer comme lu',
    mana_received: '{actor} a donné du mana à ta vision 💧',
    goal_comment: '{actor} a commenté ta vision 💬',
    friend_request: '{actor} t\'a envoyé une demande 👋',
    friend_accepted: '{actor} a accepté ta demande ✓',
    deep_analysis_ready: 'Ton analyse de rêve est prête ✨ Touche pour explorer.',
    deep_analysis_failed: 'Analyse échouée — Auras remboursés ↩️',
    someone: 'Quelqu\'un',
  },
  de: {
    title: 'Benachrichtigungen',
    empty: 'Noch keine Benachrichtigungen.',
    markAll: 'Alle als gelesen markieren',
    mana_received: '{actor} hat deiner Vision Mana gegeben 💧',
    goal_comment: '{actor} hat deine Vision kommentiert 💬',
    friend_request: '{actor} hat dir eine Anfrage gesendet 👋',
    friend_accepted: '{actor} hat deine Anfrage angenommen ✓',
    deep_analysis_ready: 'Deine Traumanalyse ist fertig ✨ Tippe zum Entdecken.',
    deep_analysis_failed: 'Analyse fehlgeschlagen — Auras erstattet ↩️',
    someone: 'Jemand',
  },
  pt: {
    title: 'Notificações',
    empty: 'Ainda não há notificações.',
    markAll: 'Marcar tudo como lido',
    mana_received: '{actor} deu mana à sua visão 💧',
    goal_comment: '{actor} comentou na sua visão 💬',
    friend_request: '{actor} enviou um pedido 👋',
    friend_accepted: '{actor} aceitou seu pedido ✓',
    deep_analysis_ready: 'Sua análise de sonho está pronta ✨ Toque para explorar.',
    deep_analysis_failed: 'Análise falhou — Auras reembolsados ↩️',
    someone: 'Alguém',
  },
  ru: {
    title: 'Уведомления',
    empty: 'Пока нет уведомлений.',
    markAll: 'Отметить всё как прочитанное',
    mana_received: '{actor} дал ману вашей визии 💧',
    goal_comment: '{actor} прокомментировал вашу визиу 💬',
    friend_request: '{actor} отправил вам запрос 👋',
    friend_accepted: '{actor} принял ваш запрос ✓',
    deep_analysis_ready: 'Ваш анализ сна готов ✨ Нажмите, чтобы изучить.',
    deep_analysis_failed: 'Анализ не удался — Ауры возвращены ↩️',
    someone: 'Кто-то',
  },
  ja: {
    title: '通知',
    empty: 'まだ通知はありません。',
    markAll: 'すべて既読にする',
    mana_received: '{actor}があなたのビジョンにマナを贈りました 💧',
    goal_comment: '{actor}があなたのビジョンにコメントしました 💬',
    friend_request: '{actor}からフレンドリクエスト 👋',
    friend_accepted: '{actor}がリクエストを承認 ✓',
    deep_analysis_ready: '夢分析が完了しました ✨ タップして確認',
    deep_analysis_failed: '分析に失敗 — オーラ返金 ↩️',
    someone: '誰か',
  },
}

function getNotifText(lang) {
  const key = String(lang).toLowerCase().split('-')[0]
  return NOTIF_I18N[key] || NOTIF_I18N.en
}

// Bildirim türüne göre ikon ve renk (tasarım tutarlılığı için)
function getNotifMeta(type) {
  switch (type) {
    case 'deep_analysis_ready':
      return { icon: Sparkles, color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/15', border: 'border-fuchsia-400/30' }
    case 'deep_analysis_failed':
      return { icon: Sparkles, color: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-400/30' }
    case 'mana_received':
      return { icon: Sparkles, color: 'text-cyan-300', bg: 'bg-cyan-500/15', border: 'border-cyan-400/30' }
    case 'goal_comment':
      return { icon: MessageCircle, color: 'text-violet-300', bg: 'bg-violet-500/15', border: 'border-violet-400/30' }
    case 'friend_request':
      return { icon: UserPlus, color: 'text-indigo-300', bg: 'bg-indigo-500/15', border: 'border-indigo-400/30' }
    case 'friend_accepted':
      return { icon: Check, color: 'text-emerald-300', bg: 'bg-emerald-500/15', border: 'border-emerald-400/30' }
    default:
      return { icon: Bell, color: 'text-slate-300', bg: 'bg-slate-500/15', border: 'border-slate-400/30' }
  }
}

export default function Navbar() {
  const router = useRouter()
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
  const nt = getNotifText(currentLang)

  // ─── Auth & Profile ───
  useEffect(() => {
    if (!mounted) return
    let active = true
    async function checkUser() {
      try {
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
          loadNotifications()
          subscribeRealtime(currentUser.id)
        }
      } catch (error) {
        console.error('Navbar user check failed:', error)
      }
    }
    checkUser()

    function handleManaUpdate(e) {
      if (typeof e.detail?.balance === 'number') setMana(e.detail.balance)
    }
    window.addEventListener('mana-balance-updated', handleManaUpdate)

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
        loadNotifications()
        subscribeRealtime(session.user.id)
      } else {
        setUser(null)
        setAuras(0)
        setMana(0)
        setAvatarUrl('')
        setNotifications([])
        setUnreadCount(0)
      }
    })

    return () => {
      active = false
      subscription?.unsubscribe()
      window.removeEventListener('mana-balance-updated', handleManaUpdate)
      supabase.removeAllChannels()
    }
  }, [mounted])

  // ─── Supabase Realtime — canlı bildirim ───
  const realtimeChannelRef = useRef(null)
  function subscribeRealtime(userId) {
    if (!userId) return
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }
    const channel = supabase
      .channel(`navbar-notifs-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const newNotif = payload.new
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50))
          setUnreadCount((c) => c + 1)
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const actorName = newNotif.actor?.display_name || nt.someone
            const msg = formatNotifMessage(newNotif.type, actorName, nt)
            try { new Notification('Lunosfer ✦', { body: msg }) } catch (_) {}
          }
        }
      )
      .subscribe()
    realtimeChannelRef.current = channel
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission() } catch (_) {}
    }
  }

  // ─── Bildirimleri yükle ───
  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (res.ok) {
        setNotifications(json.notifications || [])
        setUnreadCount(json.unreadCount || 0)
      }
    } catch (err) { /* sessiz */ }
  }

  async function markAllRead() {
    setUnreadCount(0)
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      })
    } catch (err) { /* sessiz */ }
  }

  // Bildirime tıklandığında — türüne göre yönlendir
  function handleNotifClick(n) {
    setNotifDropdownOpen(false)
    if (!n.is_read) {
      setNotifications((list) => list.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      setUnreadCount((c) => Math.max(0, c - 1))
      try {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            fetch('/api/notifications', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ id: n.id }),
            }).catch(() => {})
          }
        })
      } catch (_) {}
    }
    if (n.type === 'deep_analysis_ready' || n.type === 'deep_analysis_failed') {
      const dreamId = n.metadata?.dream_id
      if (dreamId) router.push(`/dream/${dreamId}`)
    } else if (n.type === 'friend_request' || n.type === 'friend_accepted') {
      const actorId = n.actor?.id || n.metadata?.actor_id
      if (actorId) router.push(`/profile/${actorId}`)
      else router.push('/friends')
    } else if (n.type === 'mana_received' || n.type === 'goal_comment') {
      const goalId = n.metadata?.goal_id
      if (goalId) router.push(`/vision-board?highlight=${goalId}`)
      else router.push('/vision-board')
    }
  }

  function formatNotifMessage(type, actorName, dict) {
    const tpl = dict[type] || type
    return tpl.replace('{actor}', actorName)
  }

  // ─── Dış tıklama ───
  useEffect(() => {
    if (!mounted) return
    function handleClickOutside(event) {
      if (auraDropdownRef.current && !auraDropdownRef.current.contains(event.target)) {
        setAuraDropdownOpen(false)
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mounted])

  // ═══════════════════════════════════════════════════════════
  // JSX RETURN — Parça 2'de devam ediyor
  // ═══════════════════════════════════════════════════════════
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

        {/* MASAÜSTÜ NAVİGASYONU */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(({ href, key }) => (
            <Link key={key} href={href} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              {mounted ? NAV_LABELS[key][currentLang === 'tr' ? 'tr' : 'en'] || NAV_LABELS[key].en : <TextSkeleton width="w-14" />}
            </Link>
          ))}
        </nav>

        {/* SAĞ KONTROLLER */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <div className="shrink-0">
            <LanguageSwitcher />
          </div>

          {/* MANA */}
          {user && (
            <div
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 [box-shadow:0_0_15px_rgba(34,211,238,0.1)]"
              title={currentLang === 'tr' ? 'Mana bakiyen — her gün yenilenir' : 'Your Mana — refills daily'}
            >
              <span className="text-sm">💧</span>
              <span>{mana}</span>
            </div>
          )}

          {/* ✨ BİLDİRİM ZİLİ — YENİ TASARIM ✨ */}
          {user && (
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  const willOpen = !notifDropdownOpen
                  setNotifDropdownOpen(willOpen)
                  if (willOpen && unreadCount > 0) markAllRead()
                }}
                aria-label={nt.title}
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                  unreadCount > 0
                    ? 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_20px_rgba(240,73,214,0.25)] hover:bg-fuchsia-500/25'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Bell size={18} strokeWidth={2} />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 px-1 text-[9px] font-black text-white shadow-[0_0_10px_rgba(240,73,214,0.6)] ring-2 ring-slate-950">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                    <span className="absolute inset-0 rounded-full border border-fuchsia-400/40 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
                  </>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-[340px] sm:w-[380px] max-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 animate-fade-in">
                  {/* HEADER */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-fuchsia-500/5 via-violet-500/5 to-cyan-500/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/30">
                        <Bell size={13} className="text-fuchsia-300" />
                      </div>
                      <h3 className="text-sm font-bold text-white tracking-wide">{nt.title}</h3>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold text-fuchsia-300 bg-fuchsia-500/15 border border-fuchsia-400/30 px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                        className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                      >
                        {nt.markAll}
                      </button>
                    )}
                  </div>

                  {/* LİSTE */}
                  <div className="max-h-[55vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10">
                          <Bell size={20} className="text-slate-500" />
                        </div>
                        <p className="text-sm text-slate-500">{nt.empty}</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const actorName = n.actor?.display_name || n.actor?.username || nt.someone
                        const message = formatNotifMessage(n.type, actorName, nt)
                        const meta = getNotifMeta(n.type)
                        const Icon = meta.icon
                        const isClickable = ['deep_analysis_ready', 'deep_analysis_failed', 'friend_request', 'friend_accepted', 'mana_received', 'goal_comment'].includes(n.type)
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => isClickable && handleNotifClick(n)}
                            disabled={!isClickable}
                            className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors flex items-start gap-3 ${
                              !n.is_read ? 'bg-fuchsia-500/[0.04]' : 'hover:bg-white/[0.02]'
                            } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta.bg} ${meta.border}`}>
                              <Icon size={15} className={meta.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] leading-snug ${!n.is_read ? 'text-white font-medium' : 'text-slate-300'}`}>
                                {message}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {new Date(n.created_at).toLocaleDateString(
                                  currentLang === 'tr' ? 'tr-TR' : currentLang === 'ja' ? 'ja-JP' : 'en-US',
                                  { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                                )}
                              </p>
                            </div>
                            {!n.is_read && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(240,73,214,0.6)]" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AURA */}
          {user && (
            <div className="relative" ref={auraDropdownRef}>
              <button
                type="button"
                onClick={() => setAuraDropdownOpen(!auraDropdownOpen)}
                className="hidden sm:flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-bold text-fuchsia-300 transition hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20 [box-shadow:0_0_15px_rgba(240,73,214,0.1)]"
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
          )}

          {/* PROFİL / GİRİŞ */}
          {user ? (
            <Link href="/profile" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 overflow-hidden hover:border-fuchsia-400/50 transition-all">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <User size={16} className="text-white/70" />}
            </Link>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-300/25 bg-cyan-500/10 px-4 text-xs font-bold text-cyan-100 transition-all hover:bg-cyan-500/20"
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
