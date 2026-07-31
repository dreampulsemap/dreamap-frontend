import { useState, useEffect, useRef } from 'react'
import { X, MessageCircle, Bookmark, MoreHorizontal, Send, Trash2, Pencil, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'

// Tam ekran "Vizyon Slaytları" oynatıcısı — GERÇEK Reels mekaniği: dikey
// scroll-snap ile kaydırarak ilerleniyor. Hikaye tarzı otomatik zamanlayıcı,
// ilerleme çubuğu ve dokunma bölgeleri YOK — kullanıcı kendi hızında,
// parmağıyla kaydırarak geziniyor (tıpkı Instagram/TikTok Reels gibi).
// Sağdaki aksiyon şeridi ve sahip bilgisi sabit kalıyor, içerik arkasında
// kayıyor — gerçek Reels'te de böyle çalışır.

const FONT_CLASS = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }
const POSITION_CLASS = { top: 'top-20 items-start', center: 'top-1/2 -translate-y-1/2 items-center', bottom: 'bottom-28 items-end' }

function isVideoUrl(url) {
  return /\/pixabay-video\//.test(url || '') || /\.mp4($|\?)/.test(url || '')
}
function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

export default function SlidesViewer({ goal, lang = 'en', currentUserId, onClose, onOpenDetails, onChanged, onEditSlides }) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [slides, setSlides] = useState([])
  const [owner, setOwner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)

  const containerRef = useRef(null)
  const itemRefs = useRef([])

  const [liked, setLiked] = useState(!!goal.has_reacted)
  const [believersCount, setBelieversCount] = useState(goal.believers_count || 0)
  const [reacting, setReacting] = useState(false)

  const [savingSlide, setSavingSlide] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingSlide, setDeletingSlide] = useState(false)

  const isOwner = currentUserId && goal.user_id === currentUserId

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch(`/api/goals/slides/list?goalId=${goal.id}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
        .then((r) => r.json())
        .then((json) => {
          if (!active) return
          setSlides(json.slides || [])
          setOwner(json.owner || null)
        })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false }
  }, [goal.id])

  // Hangi slaytın ekranda olduğunu takip et — Reels'in kendisi de böyle
  // çalışır (zamanlayıcı değil, gerçek scroll pozisyonu).
  useEffect(() => {
    const container = containerRef.current
    if (!container || slides.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActiveIndex(Number(entry.target.dataset.index))
            setShowMenu(false)
            setConfirmDelete(false)
          }
        })
      },
      { root: container, threshold: [0.6] }
    )
    itemRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [slides.length])

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
  }

  // BEĞEN — goal seviyesinde (mevcut "mana ver" sistemiyle aynı)
  async function handleLike() {
    if (isOwner || liked || reacting) return
    setReacting(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/give-mana', {
        method: 'POST', headers, body: JSON.stringify({ goalId: goal.id, amount: 1 }),
      })
      const json = await res.json()
      if (res.ok) {
        setLiked(true)
        setBelieversCount((c) => c + 1)
        if (typeof json.manaBalance === 'number') window.dispatchEvent(new CustomEvent('mana-balance-updated', { detail: { balance: json.manaBalance } }))
        onChanged?.({ ...goal, has_reacted: true, believers_count: believersCount + 1 })
      }
    } catch (_) {} finally { setReacting(false) }
  }

  async function handleSaveSlide() {
    if (savingSlide) return
    const current = slides[activeIndex]
    if (!current) return
    setSavingSlide(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/slides/save', {
        method: 'POST', headers, body: JSON.stringify({ slideId: current.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setSlides((prev) => prev.map((s, i) => (i === activeIndex ? { ...s, has_saved: json.saved, saves_count: (s.saves_count || 0) + (json.saved ? 1 : -1) } : s)))
      }
    } catch (_) {} finally { setSavingSlide(false) }
  }

  async function loadComments() {
    setLoadingComments(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/goals/comment?goalId=${goal.id}`, { headers: headers || {} })
      const json = await res.json()
      setComments(json.comments || [])
    } catch (_) {} finally { setLoadingComments(false) }
  }

  function toggleComments() {
    const next = !showComments
    setShowComments(next)
    setShowMenu(false)
    if (next && comments.length === 0) loadComments()
  }

  async function handlePostComment() {
    const content = commentText.trim()
    if (!content || postingComment) return
    setPostingComment(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/comment', {
        method: 'POST', headers, body: JSON.stringify({ goalId: goal.id, content }),
      })
      const json = await res.json()
      if (res.ok && json.comment) {
        setComments((prev) => [json.comment, ...prev])
        setCommentText('')
      }
    } catch (_) {} finally { setPostingComment(false) }
  }

  async function handleDeleteSlide() {
    const current = slides[activeIndex]
    if (!current || deletingSlide) return
    setDeletingSlide(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/slides/delete', {
        method: 'POST', headers, body: JSON.stringify({ slideId: current.id }),
      })
      if (res.ok) {
        const remaining = slides.filter((_, i) => i !== activeIndex)
        setSlides(remaining)
        setShowMenu(false)
        setConfirmDelete(false)
        if (remaining.length === 0) { onClose(); return }
        setActiveIndex((idx) => Math.min(idx, remaining.length - 1))
        requestAnimationFrame(() => {
          itemRefs.current[Math.min(activeIndex, remaining.length - 1)]?.scrollIntoView({ block: 'start' })
        })
      }
    } catch (_) {} finally { setDeletingSlide(false) }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
        <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">...</span>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-slate-300 text-sm">
          {lang === 'tr' ? 'Bu vizyonun henüz slaytı yok.' : 'This vision has no slides yet.'}
        </p>
        <button onClick={onClose} className="px-5 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest">
          {lang === 'tr' ? 'Kapat' : 'Close'}
        </button>
      </div>
    )
  }

  const current = slides[activeIndex]
  const isVideo = isVideoUrl(current.image_url)
  const ownerName = owner?.display_name || owner?.username || (lang === 'tr' ? 'Bilinmeyen' : 'Unknown')

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" className="fixed inset-0 z-[60] bg-black select-none overflow-hidden">
      {/* Kaydırılabilir slayt akışı */}
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory [&::-webkit-scrollbar]:hidden">
        {slides.map((slide, i) => {
          const slideIsVideo = isVideoUrl(slide.image_url)
          const fontClass = FONT_CLASS[slide.caption_font] || FONT_CLASS.sans
          const positionClass = POSITION_CLASS[slide.caption_position] || POSITION_CLASS.bottom
          return (
            <div
              key={slide.id}
              ref={(el) => (itemRefs.current[i] = el)}
              data-index={i}
              className="relative h-full w-full snap-start snap-always"
            >
              {slideIsVideo ? (
                <video
                  src={slide.image_url}
                  className="w-full h-full object-cover"
                  muted={muted}
                  loop
                  autoPlay={i === activeIndex}
                  playsInline
                />
              ) : (
                <img src={slide.image_url} alt="" className="w-full h-full object-cover" loading={i < 2 ? 'eager' : 'lazy'} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 pointer-events-none" />
              {slide.caption && (
                <div className={`absolute left-4 right-20 flex flex-col z-10 ${positionClass}`}>
                  <p
                    className={`${fontClass} text-base leading-snug drop-shadow-md whitespace-pre-wrap`}
                    style={{ color: slide.caption_color || '#ffffff' }}
                  >
                    {slide.caption}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sabit üst kontrol */}
      <button
        onClick={onClose}
        aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
        className="absolute top-7 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
      >
        <X size={16} />
      </button>
      {isVideo && (
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={lang === 'tr' ? 'Sesi aç/kapat' : 'Toggle mute'}
          className="absolute top-7 right-14 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}
      {onOpenDetails && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetails() }}
          className="absolute top-7 left-3 z-20 max-w-[55%] px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-medium truncate text-left"
        >
          {goal.title}
        </button>
      )}

      {/* Sabit sahip çipi (Reels'teki gibi — içerik kayarken hesap bilgisi yerinde kalır) */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenDetails?.() }}
        className="absolute left-4 bottom-40 z-10 flex items-center gap-2"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 ring-2 ring-white/20">
          {owner?.avatar_url ? <img src={owner.avatar_url} alt="" className="w-full h-full object-cover" /> : initialsOf(ownerName)}
        </span>
        <span className="text-white text-sm font-semibold drop-shadow-md">{ownerName}</span>
      </button>

      {/* Sabit aksiyon şeridi */}
      <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-5">
        <button onClick={handleLike} disabled={isOwner || liked || reacting} className="flex flex-col items-center gap-1 disabled:opacity-70">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center ${liked ? 'text-astral-gold' : 'text-white'}`}>
            <Sparkles size={24} fill={liked ? 'currentColor' : 'none'} />
          </span>
          <span className="text-white text-[11px] font-semibold drop-shadow">{believersCount}</span>
        </button>

        <button onClick={toggleComments} className="flex flex-col items-center gap-1">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-white">
            <MessageCircle size={24} />
          </span>
          <span className="text-white text-[11px] font-semibold drop-shadow">{goal.comments_count || 0}</span>
        </button>

        <button onClick={handleSaveSlide} disabled={savingSlide} className="flex flex-col items-center gap-1 disabled:opacity-60">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center ${current.has_saved ? 'text-cyan-300' : 'text-white'}`}>
            <Bookmark size={24} fill={current.has_saved ? 'currentColor' : 'none'} />
          </span>
          <span className="text-white text-[11px] font-semibold drop-shadow">{current.saves_count || 0}</span>
        </button>

        {isOwner && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); setConfirmDelete(false) }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            >
              <MoreHorizontal size={24} />
            </button>
            {showMenu && (
              <div className="absolute right-12 bottom-0 w-44 rounded-xl bg-void-900 border border-white/10 shadow-xl overflow-hidden">
                <button
                  onClick={() => { setShowMenu(false); onEditSlides?.() }}
                  className="w-full flex items-center gap-2 px-3.5 py-3 text-slate-200 text-sm hover:bg-white/5"
                >
                  <Pencil size={14} /> {lang === 'tr' ? 'Düzenle' : 'Edit'}
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-2 px-3.5 py-3 text-rose-400 text-sm hover:bg-white/5 border-t border-white/10"
                  >
                    <Trash2 size={14} /> {lang === 'tr' ? 'Sil' : 'Delete'}
                  </button>
                ) : (
                  <button
                    onClick={handleDeleteSlide}
                    disabled={deletingSlide}
                    className="w-full flex items-center gap-2 px-3.5 py-3 text-white text-sm bg-rose-500/90 hover:bg-rose-500 border-t border-white/10 disabled:opacity-60"
                  >
                    <Trash2 size={14} /> {lang === 'tr' ? 'Emin misin? Sil' : 'Confirm delete'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Yorum sheet'i */}
      {showComments && (
        <div className="absolute inset-0 z-30 flex items-end" onClick={() => setShowComments(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[70vh] bg-void-950 border-t border-white/10 rounded-t-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white text-sm font-bold">{lang === 'tr' ? 'Yorumlar' : 'Comments'}</span>
              <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {loadingComments ? (
                <p className="text-slate-500 text-xs text-center py-6">...</p>
              ) : comments.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">
                  {lang === 'tr' ? 'Henüz yorum yok. İlk yorumu sen yaz.' : 'No comments yet. Be the first.'}
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                      {c.user_profiles?.avatar_url ? (
                        <img src={c.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : initialsOf(c.user_profiles?.display_name || c.user_profiles?.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold">{c.user_profiles?.display_name || c.user_profiles?.username}</p>
                      <p className="text-slate-300 text-sm break-words">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment() }}
                placeholder={lang === 'tr' ? 'Yorum yaz...' : 'Write a comment...'}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={handlePostComment}
                disabled={!commentText.trim() || postingComment}
                className="w-9 h-9 rounded-full bg-fuchsia-500 flex items-center justify-center text-white disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
