import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Pause, Play, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'

// Tam ekran "Vizyon Videosu" oynatıcısı — gerçek Reels hissi: üstte kapatma
// çarpısı YOK, videonun native tarayıcı kontrolleri (alt ilerleme çubuğu,
// ortada beliren oynat/duraklat overlay'i, ses tuşu) YOK — `controls`
// attribute'u yok. Video letterbox'lı/yuvarlak köşeli değil, tam ekran
// edge-to-edge (object-cover).
//
// Kapatma: X butonu olmadığı için fiziksel/tarayıcı GERİ tuşu (useModalA11y)
// + aşağı kaydırma jesti — ikisi de aynı onClose'a çıkıyor.
//
// Profil + mana (beğeni) + yorum UI'ı, SlidesViewer'daki ("önceki slaytlar"
// akışı) ile birebir aynı desen: aynı sahip çipi, aynı aksiyon şeridi, aynı
// /api/goals/give-mana + /api/goals/comment uçları, aynı yorum sheet'i.
// GoalDetailModal.jsx, explore.js, profile.js, index.js, u/[userId].js ve
// vision-board.js hepsi bunu `goal` objesiyle çağırıyor.
//
// Video mekaniği (dokununca oynat/duraklat, üst ince ilerleme çubuğu,
// yükleniyor/hata durumları, aşağı kaydırarak kapatma) ayrı bir turda
// eklendi — önceki sürümde videoyu duraklatmanın hiçbir yolu yoktu
// (controls yoktu, tıklama da bağlı değildi).
function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

const SWIPE_CLOSE_THRESHOLD = 110
const SWIPE_MAX = 320

export default function VisionVideoPlayer({ goal, lang, currentUserId, onClose, onOpenDetails, onChanged }) {
  const modalRef = useRef(null)
  const videoRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [muted, setMuted] = useState(false)

  const [liked, setLiked] = useState(!!goal.has_reacted)
  const [believersCount, setBelieversCount] = useState(goal.believers_count || 0)
  const [reacting, setReacting] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // --- video oynatma mekaniği ---
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tapIcon, setTapIcon] = useState(null) // 'play' | 'pause' | null — kısa yanıp sönen ikon
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(!goal.vision_video_url)
  const [dragOffset, setDragOffset] = useState(0)
  const tapIconTimeout = useRef(null)
  const dragging = useRef(false)
  const dragStartY = useRef(0)

  useEffect(() => () => clearTimeout(tapIconTimeout.current), [])

  const isOwner = currentUserId && goal.user_id === currentUserId
  const ownerName = goal.owner?.display_name || goal.owner?.username || (lang === 'tr' ? 'Bilinmeyen' : 'Unknown')

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
  }

  // BEĞEN — goal seviyesinde, SlidesViewer'daki "mana ver" ile aynı uç.
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

  // --- video oynatma mekaniği ---
  function flashTapIcon(kind) {
    setTapIcon(kind)
    clearTimeout(tapIconTimeout.current)
    tapIconTimeout.current = setTimeout(() => setTapIcon(null), 450)
  }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      flashTapIcon('play')
    } else {
      v.pause()
      flashTapIcon('pause')
    }
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  // Aşağı kaydırarak kapatma — X butonu olmadığı için GERİ tuşuna ek bir
  // yol. Yorum sheet'i açıkken devre dışı (ikisi aynı anda karışmasın).
  function handleTouchStart(e) {
    if (showComments) return
    dragging.current = true
    dragStartY.current = e.touches[0].clientY
  }
  function handleTouchMove(e) {
    if (!dragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) setDragOffset(Math.min(delta, SWIPE_MAX))
  }
  function handleTouchEnd() {
    dragging.current = false
    if (dragOffset > SWIPE_CLOSE_THRESHOLD) {
      onClose?.()
      return
    }
    setDragOffset(0)
  }

  const dragProgress = Math.min(dragOffset / SWIPE_MAX, 1)

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ backgroundColor: `rgba(0,0,0,${1 - dragProgress * 0.55})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${dragOffset}px) scale(${1 - dragProgress * 0.05})`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {/* Tam ekran video — controls YOK, loop AÇIK (Reels gibi kendini
            tekrar etsin), object-cover (letterbox değil, edge-to-edge).
            Dokununca oynat/duraklat + üst ilerleme çubuğu buna bağlı. */}
        {!errored ? (
          <video
            ref={videoRef}
            src={goal.vision_video_url}
            autoPlay
            loop
            playsInline
            muted={muted}
            className="absolute inset-0 w-full h-full object-cover"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={() => setLoading(false)}
            onWaiting={() => setLoading(true)}
            onPlaying={() => setLoading(false)}
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
            onError={() => { setErrored(true); setLoading(false) }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70 px-8 text-center">
            <p className="text-sm">{lang === 'tr' ? 'Video yüklenemedi.' : 'Video failed to load.'}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/30 pointer-events-none" />

        {/* üst ince ilerleme çubuğu (Story/Reels stili) */}
        <div className="absolute top-0 left-0 right-0 z-20 h-[3px] bg-white/20">
          <div className="h-full bg-white transition-[width] duration-150 ease-linear" style={{ width: `${progress}%` }} />
        </div>

        {loading && !errored && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          </div>
        )}

        {/* duraklatılmışken kalıcı, hafif bir oynat ikonu */}
        {isPaused && !tapIcon && !loading && !errored && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center">
              <Play size={26} className="text-white/90 ml-1" fill="currentColor" />
            </div>
          </div>
        )}
        {/* her dokunuşta kısa yanıp sönen ikon */}
        {tapIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center animate-tap-flash">
              {tapIcon === 'play' ? (
                <Play size={26} className="text-white ml-1" fill="currentColor" />
              ) : (
                <Pause size={26} className="text-white" fill="currentColor" />
              )}
            </div>
          </div>
        )}

        {/* Native ses kontrolü kalktığı için tek üst kontrol: sesi aç/kapat.
            X'in eskiden durduğu yerde (top-7 right-3). */}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={lang === 'tr' ? 'Sesi aç/kapat' : 'Toggle mute'}
          className="absolute top-7 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {onOpenDetails && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetails() }}
            className="absolute top-7 left-3 z-20 max-w-[55%] px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-medium truncate text-left"
          >
            {goal.title}
          </button>
        )}

        {/* Sahip çipi */}
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetails?.() }}
          className="absolute left-4 bottom-40 z-10 flex items-center gap-2"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 ring-2 ring-white/20">
            {goal.owner?.avatar_url ? <img src={goal.owner.avatar_url} alt="" className="w-full h-full object-cover" /> : initialsOf(ownerName)}
          </span>
          <span className="text-white text-sm font-semibold drop-shadow-md">{ownerName}</span>
        </button>

        {/* Aksiyon şeridi */}
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
        </div>

        {/* Yorum sheet'i — SlidesViewer ile birebir aynı */}
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
    </div>
  )
}
