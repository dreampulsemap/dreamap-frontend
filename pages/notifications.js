// Android NotificationsScreen.kt'nin web karşılığı (aynı metinler, aynı yönlendirmeler).
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Loader2, User, UserPlus, Sparkles, AlertCircle, UserCheck, MessageCircle, Droplet, Heart, Image as ImageIcon, Bell, BellOff,
} from 'lucide-react'
import Seo from '@/components/Seo'
import GoalDetailModal from '@/components/GoalDetailModal'
import { supabase, getAuthHeader } from '@/lib/supabase'
import { relativeTime } from '@/lib/relativeTime'

const TEXT = {
  tr: {
    title: 'Bildirimler', back: 'Geri', markAll: 'Tümünü Okundu Yap', refresh: 'Yeniden Denetle', empty: 'Henüz bildiriminiz yok.',
    loadError: 'Bildirimler yüklenemedi.', accept: 'Kabul Et', reject: 'Reddet', someone: 'Biri', gone: 'Bu takip isteği artık geçerli değil.',
    types: {
      new_follower: ['Yeni Takipçi', (a) => `${a} seni takip etmeye başladı.`],
      friend_request: ['Takip İsteği', (a) => `${a} sana takip isteği gönderdi.`],
      analysis_ready: ['Rüya Analizi Hazır', () => 'Rüyanızın derin Jungcu analizi tamamlandı! Görmek için tıklayın.'],
      analysis_failed: ['Analiz Başarısız', () => 'Rüya analizi oluşturulurken bir hata oluştu.'],
      friend_accepted: ['İstek Kabul Edildi', (a) => `${a} takip isteğini kabul etti.`],
      goal_comment: ['Yeni Yorum', (a) => `${a} vizyonuna yorum yaptı.`],
      mana_received: ['Mana Geldi', (a) => `${a} vizyonuna mana gönderdi.`],
      diary_comment: ['Yeni Yorum', (a) => `${a} günlük paylaşımına yorum yaptı.`],
      dream_like: ['Yeni Beğeni', (a) => `${a} rüyanı beğendi.`],
      dream_comment: ['Yeni Yorum', (a) => `${a} rüyana yorum yaptı.`],
      dream_image_gift: ['Rüya Görseli Hazır', () => 'Senin için bir rüya görseli oluşturuldu.'],
      generic: ['Yeni Bildirim', () => 'Yeni bir bildiriminiz var.'],
    },
  },
  en: {
    title: 'Notifications', back: 'Back', markAll: 'Mark All as Read', refresh: 'Refresh', empty: 'You have no notifications yet.',
    loadError: "Couldn't load notifications.", accept: 'Accept', reject: 'Reject', someone: 'Someone', gone: 'This follow request is no longer available.',
    types: {
      new_follower: ['New Follower', (a) => `${a} started following you.`],
      friend_request: ['Follow Request', (a) => `${a} sent you a follow request.`],
      analysis_ready: ['Dream Analysis Ready', () => 'The deep Jungian analysis of your dream is complete! Tap to view.'],
      analysis_failed: ['Analysis Failed', () => 'An error occurred while generating the dream analysis.'],
      friend_accepted: ['Request Accepted', (a) => `${a} accepted your follow request.`],
      goal_comment: ['New Comment', (a) => `${a} commented on your vision.`],
      mana_received: ['Mana Received', (a) => `${a} sent mana to your vision.`],
      diary_comment: ['New Comment', (a) => `${a} commented on your journal entry.`],
      dream_like: ['New Like', (a) => `${a} liked your dream.`],
      dream_comment: ['New Comment', (a) => `${a} commented on your dream.`],
      dream_image_gift: ['Dream Image Ready', () => 'A dream image was created for you.'],
      generic: ['New Notification', () => 'You have a new notification.'],
    },
  },
}

const ICONS = {
  new_follower: User, friend_request: UserPlus, analysis_ready: Sparkles, analysis_failed: AlertCircle,
  friend_accepted: UserCheck, follow_accepted: UserCheck, goal_comment: MessageCircle, mana_received: Droplet,
  diary_comment: MessageCircle, dream_like: Heart, dream_comment: MessageCircle, dream_image_gift: ImageIcon,
}

export default function NotificationsPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted && (i18n.language || 'en').startsWith('tr') ? 'tr' : 'en'
  const t = TEXT[lang]

  const [me, setMe] = useState(null)
  const [items, setItems] = useState(null)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState(false)
  const [actionable, setActionable] = useState(new Set())
  const [toast, setToast] = useState('')
  const [goal, setGoal] = useState(null)

  const load = useCallback(async () => {
    setError(false)
    setItems(null)
    try {
      const headers = await getAuthHeader()
      const [nRes, pRes] = await Promise.all([
        fetch('/api/notifications', { headers }),
        fetch('/api/friends/list?type=pending', { headers }),
      ])
      if (!nRes.ok) throw new Error()
      const json = await nRes.json()
      setItems(json.notifications || [])
      setUnread(json.unreadCount || 0)
      if (pRes.ok) {
        const pj = await pRes.json()
        setActionable(new Set((pj.friendships || []).filter((f) => f.status === 'pending').map((f) => f.id)))
      }
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/auth')
      else { setMe(session.user.id); load() }
    })
  }, [load, router])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(id)
  }, [toast])

  async function markRead(id) {
    setItems((list) => list.map((n) => (!id || n.id === id ? { ...n, is_read: true } : n)))
    setUnread((c) => (id ? Math.max(0, c - 1) : 0))
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(id ? { notificationId: id } : {}),
      })
    } catch {}
  }

  async function open(n) {
    if (!n.is_read) markRead(n.id)
    if (n.dream_id) return router.push(`/dream/${n.dream_id}`)
    if (n.reference_type === 'goal' && n.reference_id) {
      const { data } = await supabase.from('goals').select('*').eq('id', n.reference_id).maybeSingle()
      if (data) setGoal(data)
      return
    }
    if (n.reference_type === 'diary_entry') return router.push('/profile')
    if (n.actor_id) router.push(`/u/${n.actor_id}`)
  }

  async function respond(n, action) {
    const friendshipId = n.reference_id
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ friendshipId, action }),
      })
      if (res.status === 404) setToast(t.gone)
      setActionable((s) => { const next = new Set(s); next.delete(friendshipId); return next })
      if (!n.is_read) markRead(n.id)
    } catch {}
  }

  return (
    <main className="min-h-screen bg-void-950">
      <Seo title={t.title} noindex lang={lang} />
      <header className="sticky top-0 z-40 flex h-16 items-center gap-2 bg-void-950 px-1">
        <button onClick={() => router.back()} aria-label={t.back} className="flex h-12 w-12 items-center justify-center rounded-full text-white hover:bg-white/5">
          <ArrowLeft size={24} />
        </button>
        <h1 className="flex-1 font-serif text-base font-medium text-white">{t.title}</h1>
        {unread > 0 && (
          <button onClick={() => markRead(null)} className="mr-2 rounded-full px-3 py-2 text-xs font-medium text-astral-gold hover:bg-white/5">{t.markAll}</button>
        )}
      </header>

      {items === null && !error ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-astral-gold" size={32} /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24">
          <p className="text-sm text-rose-400">{t.loadError}</p>
          <button onClick={load} className="rounded-full border border-white/20 px-5 py-2 text-sm text-astral-gold">{t.refresh}</button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-24">
          <BellOff size={48} className="text-gray-500" />
          <p className="text-sm text-gray-500">{t.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2.5 p-4">
          {items.map((n) => {
            const unreadRow = !n.is_read
            const key = n.type === 'follow_accepted' ? 'friend_accepted' : n.type
            const [title, body] = t.types[key] || t.types.generic
            const actor = n.actor?.display_name || n.actor?.username || t.someone
            const Icon = ICONS[n.type] || Bell
            const canRespond = n.type === 'friend_request' && n.reference_id && actionable.has(n.reference_id)
            return (
              <li
                key={n.id}
                className={`rounded-[14px] border p-3 ${unreadRow ? 'border-astral-gold/40 bg-[#121826]/80' : 'border-[#121826] bg-void-900'}`}
              >
                <button onClick={() => open(n)} className="flex w-full items-center gap-3 text-left">
                  {n.actor?.avatar_url ? (
                    <img src={n.actor.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${unreadRow ? 'bg-astral-gold/20 text-astral-gold' : 'bg-[#121826] text-gray-500'}`}>
                      <Icon size={20} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-white">{title}</span>
                      {n.created_at && <span className="shrink-0 text-[11px] text-gray-500">{relativeTime(n.created_at, lang)}</span>}
                    </span>
                    <span className={`mt-0.5 block text-xs leading-4 ${unreadRow ? 'text-slate-200' : 'text-gray-500'}`}>{body(actor)}</span>
                  </span>
                  {unreadRow && <span className="h-2 w-2 shrink-0 rounded-full bg-astral-gold" />}
                </button>
                {canRespond && (
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => respond(n, 'accepted')} className="h-[34px] rounded-full bg-astral-gold px-3 text-[11px] font-bold text-void-950">{t.accept}</button>
                    <button onClick={() => respond(n, 'rejected')} className="h-[34px] rounded-full border border-rose-400 px-2.5 text-[11px] text-rose-400">{t.reject}</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-void-800 px-4 py-2 text-sm text-white shadow-xl">{toast}</div>
      )}
      {goal && <GoalDetailModal goal={goal} lang={lang} currentUserId={me} onClose={() => setGoal(null)} />}
    </main>
  )
}
