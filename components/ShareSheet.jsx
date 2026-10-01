// Rüya / günce / vizyon paylaşım sayfası — Android ShareSheet.kt'nin web
// karşılığı: arkadaşa DM (sunucu kartı kendisi kurar, bkz. lib/shareSnapshot.js)
// + dış platformlar (web intent bağlantıları) + bağlantı kopyalama.
// Dış paylaşımlar record_share ile XP'ye sayılır (sunucu tekilleştirir).
import { useEffect, useRef, useState } from 'react'
import { X, Link2, Send, Check, Share2, Loader2 } from 'lucide-react'
import { supabase, getAuthHeader } from '@/lib/supabase'
import { recordShare } from '@/lib/game'
import { sharePath } from '@/lib/shareUtils'
import { useModalA11y } from '@/lib/useModalA11y'

const TEXT = {
  tr: {
    title: 'Paylaş', sendTo: 'Arkadaşına gönder', external: 'Dış platformlar', note: 'Bir not ekle (isteğe bağlı)',
    copy: 'Bağlantıyı kopyala', copied: 'Bağlantı kopyalandı', more: 'Diğer', send: 'Gönder', sent: 'Gönderildi',
    noRecipients: 'Henüz mesajlaştığın ya da arkadaşın olan kimse yok.', failed: 'Gönderilemedi',
    notAllowed: 'Bu içerik paylaşılamıyor (gizli).', privateNote: 'Bu içerik gizli — bağlantıyı yalnızca sen açabilirsin.',
    label: { dream: 'Lunosfer\'de bir rüya:', diary: 'Lunosfer\'de bir günce:', vision: 'Lunosfer\'de bir vizyon:' },
  },
  en: {
    title: 'Share', sendTo: 'Send to a friend', external: 'Other platforms', note: 'Add a note (optional)',
    copy: 'Copy link', copied: 'Link copied', more: 'More', send: 'Send', sent: 'Sent',
    noRecipients: 'No conversations or friends yet.', failed: 'Failed to send',
    notAllowed: "This content can't be shared (private).", privateNote: 'This content is private — only you can open the link.',
    label: { dream: 'A dream on Lunosfer:', diary: 'A diary entry on Lunosfer:', vision: 'A vision on Lunosfer:' },
  },
}

// channel adları record_share izin listesiyle aynı olmalı (migration 017).
const PLATFORMS = [
  { channel: 'whatsapp', label: 'WhatsApp', url: (u, txt) => `https://wa.me/?text=${encodeURIComponent(`${txt}\n${u}`)}` },
  { channel: 'x', label: 'X', url: (u, txt) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(u)}` },
  { channel: 'telegram', label: 'Telegram', url: (u, txt) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(txt)}` },
  { channel: 'facebook', label: 'Facebook', url: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { channel: 'linkedin', label: 'LinkedIn', url: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { channel: 'reddit', label: 'Reddit', url: (u, txt) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(txt)}` },
  { channel: 'pinterest', label: 'Pinterest', url: (u, txt) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(txt)}` },
]

async function loadRecipients(myId) {
  const headers = await getAuthHeader()
  const [conv, fr] = await Promise.all([
    fetch('/api/messages/conversations', { headers }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    fetch('/api/friends/list?type=accepted', { headers }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ])
  // Konuşma geçmişi olanlar önce, sonra arkadaşlar (tekrar etmeden).
  const byId = new Map()
  for (const c of conv.conversations || []) {
    const u = c.otherUser
    if (u?.id && !byId.has(u.id)) byId.set(u.id, u)
  }
  for (const f of fr.friendships || []) {
    const other = f.user_id === myId ? f.target : f.requester
    if (other?.id && !byId.has(other.id)) byId.set(other.id, other)
  }
  byId.delete(myId)
  return [...byId.values()]
}

/**
 * content: { type: 'dream'|'diary'|'vision', id, title, isPublic }
 */
export default function ShareSheet({ content, lang = 'en', onClose }) {
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']
  const dialogRef = useRef(null)
  useModalA11y(dialogRef, onClose)
  const [me, setMe] = useState(null)
  const [recipients, setRecipients] = useState(null)
  const [note, setNote] = useState('')
  const [sendState, setSendState] = useState({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const id = session?.user?.id || null
      if (!active) return
      setMe(id)
      if (id) {
        const list = await loadRecipients(id)
        if (active) setRecipients(list)
      } else {
        setRecipients([])
      }
    })
    return () => { active = false }
  }, [])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lunosfer.com'
  const link = `${origin}${sharePath(content.type, content.id)}`
  const title = (content.title || '').trim()
  const text = `${t.label[content.type]}${title ? ` “${title.slice(0, 120)}”` : ''}`

  function openPlatform(p) {
    window.open(p.url(link, text), '_blank', 'noopener,noreferrer')
    recordShare(content.type, content.id, p.channel)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      flash(t.copied)
      recordShare(content.type, content.id, 'other')
    } catch {
      // pano erişimi yok
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: title || 'Lunosfer', text, url: link })
      recordShare(content.type, content.id, 'other')
    } catch {
      // kullanıcı iptal etti
    }
  }

  async function sendTo(user) {
    const cur = sendState[user.id]
    if (cur === 'sending' || cur === 'sent') return
    setSendState((s) => ({ ...s, [user.id]: 'sending' }))
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ recipientId: user.id, content: note.trim(), lang, share: { type: content.type, id: String(content.id) } }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSendState((s) => ({ ...s, [user.id]: 'failed' }))
        flash(json.error === 'not_shareable' ? t.notAllowed : t.failed)
        return
      }
      setSendState((s) => ({ ...s, [user.id]: 'sent' }))
    } catch {
      setSendState((s) => ({ ...s, [user.id]: 'failed' }))
      flash(t.failed)
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-void-900 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-white">{t.title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        {title && <p className="line-clamp-2 text-sm text-slate-300">“{title}”</p>}

        {me && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.sendTo}</h3>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder={t.note}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            {recipients === null ? (
              <div className="flex justify-center py-3"><Loader2 size={20} className="animate-spin text-astral-gold" /></div>
            ) : recipients.length === 0 ? (
              <p className="text-xs text-slate-500">{t.noRecipients}</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {recipients.map((u) => {
                  const st = sendState[u.id]
                  const name = u.display_name || u.username || '?'
                  return (
                    <button key={u.id} onClick={() => sendTo(u)} className="flex w-16 shrink-0 flex-col items-center gap-1" disabled={st === 'sending' || st === 'sent'}>
                      <span className="relative">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-bold text-white">{name.slice(0, 1).toUpperCase()}</span>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full ${st === 'sent' ? 'bg-emerald-500' : st === 'failed' ? 'bg-red-500' : 'bg-astral-gold'}`}>
                          {st === 'sending' ? <Loader2 size={11} className="animate-spin text-void-950" /> : st === 'sent' ? <Check size={11} className="text-white" /> : <Send size={10} className="text-void-950" />}
                        </span>
                      </span>
                      <span className="w-full truncate text-center text-[11px] text-slate-300">{st === 'sent' ? t.sent : name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.external}</h3>
          {!content.isPublic && <p className="text-[11px] text-amber-300/80">{t.privateNote}</p>}
          <div className="grid grid-cols-4 gap-2">
            {PLATFORMS.map((p) => (
              <button key={p.channel} onClick={() => openPlatform(p)} className="rounded-xl bg-white/5 px-1 py-2.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10">
                {p.label}
              </button>
            ))}
            <button onClick={copyLink} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-1 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/10">
              <Link2 size={14} /> {t.copy}
            </button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button onClick={nativeShare} className="flex flex-col items-center gap-1 rounded-xl bg-white/5 px-1 py-2 text-[11px] font-semibold text-slate-200 hover:bg-white/10">
                <Share2 size={14} /> {t.more}
              </button>
            )}
          </div>
        </section>

        {toast && <p className="text-center text-xs text-astral-gold" role="status">{toast}</p>}
      </div>
    </div>
  )
}
