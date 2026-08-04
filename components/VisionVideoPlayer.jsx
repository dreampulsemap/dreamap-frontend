import { useEffect, useRef, useState } from 'react'
import { Bookmark, Flag, MessageCircle, MoreHorizontal, Pause, Pencil, Play, Send, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { REPORT_REASONS } from '@/lib/reportReasons'

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
//
// "Kaydet" (Bookmark) + üç nokta menüsü: SlidesViewer'daki desenin aynısı,
// tek fark — sahip için üç nokta artık başkalarına da açık (owner: Düzenle +
// Videoyu Sil, diğerleri: Bildir). Düzenle mevcut onOpenDetails akışına
// giriyor (ayrı bir video düzenleme ekranı yok, GoalDetailModal'a düşüyor —
// tüm çağıran sayfalarda onOpenDetails zaten bunu yapıyor). Videoyu Sil,
// önceden hiçbir arayüzden çağrılmayan /api/goals/delete-vision-video'yu
// kullanıyor (goal'ü değil, yalnızca videoyu kaldırır — hedef eski
// slaytlarına/detayına döner). Bildir, yeni /api/goals/report ucuna gidiyor.
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

  const [saved, setSaved] = useState(!!goal.has_saved)
  const [savesCount, setSavesCount] = useState(goal.saves_count || 0)
  const [savingGoal, setSavingGoal] = useState(false)

  const [showMenu, setShowMenu] = useState(false)
  const [confirmDeleteVideo, setConfirmDeleteVideo] = useState(false)
  const [deletingVideo, setDeletingVideo] = useState(false)

  const [showReportSheet, setShowReportSheet] = useState(false)
  const [reportReason, setReportReason] = useState(null)
  const [reportNote, setReportNote] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)

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

  // KAYDET — goal seviyesinde bookmark, slides/save.js ile aynı toggle deseni.
  async function handleSaveGoal() {
    if (savingGoal) return
    setSavingGoal(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/save', {
        method: 'POST', headers, body: JSON.stringify({ goalId: goal.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setSaved(json.saved)
        setSavesCount((c) => Math.max(0, c + (json.saved ? 1 : -1)))
        onChanged?.({ ...goal, has_saved: json.saved, saves_count: Math.max(0, savesCount + (json.saved ? 1 : -1)) })
      }
    } catch (_) {} finally { setSavingGoal(false) }
  }

  // VİDEOYU SİL — goal'ü değil yalnızca vision_video_url'i temizler (bkz.
  // delete-vision-video.js), hedef kendi slaytlarına/detayına döner.
  async function handleDeleteVideo() {
    if (deletingVideo) return
    setDeletingVideo(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/delete-vision-video', {
        method: 'POST', headers, body: JSON.stringify({ goalId: goal.id }),
      })
      const json = await res.json()
      if (res.ok) {
        onChanged?.(json.goal)
        onClose?.()
      }
    } catch (_) {} finally { setDeletingVideo(false) }
  }

  // BİLDİR — reason zorunlu, note opsiyonel. 409/23505 (zaten bildirilmiş)
  // durumunu da API 200 + already_reported olarak döndürüyor, kullanıcıya
  // yine de teşekkür ekranını gösteriyoruz.
  async function handleSubmitReport() {
    if (!reportReason || submittingReport) return
    setSubmittingReport(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, reason: reportReason, note: reportNote.trim() || undefined }),
      })
      if (res.ok) {
        setReportSubmitted(true)
        setTimeout(() => {
          setShowReportSheet(false)
          setReportSubmitted(false)
          setReportReason(null)
          setReportNote('')
        }, 1600)
      }
    } catch (_) {} finally { setSubmittingReport(false) }
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

          <button
            onClick={handleSaveGoal}
            disabled={savingGoal}
            aria-label={lang === 'tr' ? 'Kaydet' : 'Save'}
            className="flex flex-col items-center gap-1 disabled:opacity-60"
          >
            <span className={`w-10 h-10 rounded-full flex items-center justify-center ${saved ? 'text-cyan-300' : 'text-white'}`}>
              <Bookmark size={24} fill={saved ? 'currentColor' : 'none'} />
            </span>
            <span className="text-white text-[11px] font-semibold drop-shadow">{savesCount}</span>
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); setConfirmDeleteVideo(false) }}
              aria-label={lang === 'tr' ? 'Diğer seçenekler' : 'More options'}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            >
              <MoreHorizontal size={24} />
            </button>
            {showMenu && (
              <div className="absolute right-12 bottom-0 w-48 rounded-xl bg-void-900 border border-white/10 shadow-xl overflow-hidden">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); onOpenDetails ? onOpenDetails() : onClose?.() }}
                      className="w-full flex items-center gap-2 px-3.5 py-3 text-slate-200 text-sm hover:bg-white/5"
                    >
                      <Pencil size={14} /> {lang === 'tr' ? 'Düzenle' : 'Edit'}
                    </button>
                    {!confirmDeleteVideo ? (
                      <button
                        onClick={() => setConfirmDeleteVideo(true)}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-rose-400 text-sm hover:bg-white/5 border-t border-white/10"
                      >
                        <Trash2 size={14} /> {lang === 'tr' ? 'Videoyu Sil' : 'Delete Video'}
                      </button>
                    ) : (
                      <button
                        onClick={handleDeleteVideo}
                        disabled={deletingVideo}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-white text-sm bg-rose-500/90 hover:bg-rose-500 border-t border-white/10 disabled:opacity-60"
                      >
                        <Trash2 size={14} /> {lang === 'tr' ? 'Emin misin? Sil' : 'Confirm delete'}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => { setShowMenu(false); setShowReportSheet(true) }}
                    className="w-full flex items-center gap-2 px-3.5 py-3 text-rose-400 text-sm hover:bg-white/5"
                  >
                    <Flag size={14} /> {lang === 'tr' ? 'Bildir' : 'Report'}
                  </button>
                )}
              </div>
            )}
          </div>
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

        {/* Bildir sheet'i — yorum sheet'inin üstünde açılabilmesi için daha
            yüksek z-index (üç nokta menüsünden tetikleniyor). */}
        {showReportSheet && (
          <div
            className="absolute inset-0 z-40 flex items-end"
            onClick={() => !submittingReport && setShowReportSheet(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[70vh] bg-void-950 border-t border-white/10 rounded-t-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-white text-sm font-bold">{lang === 'tr' ? 'İçeriği bildir' : 'Report content'}</span>
                <button onClick={() => setShowReportSheet(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              {reportSubmitted ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-white text-sm font-semibold">
                    {lang === 'tr' ? 'Bildirimin alındı, teşekkürler.' : 'Your report has been received, thank you.'}
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3 flex flex-col gap-1">
                  <p className="text-slate-400 text-xs px-1 pb-1">
                    {lang === 'tr' ? 'Bu içeriği neden bildiriyorsun?' : 'Why are you reporting this content?'}
                  </p>
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReportReason(r.value)}
                      className={`text-left px-3 py-3 rounded-lg text-sm transition-colors ${
                        reportReason === r.value ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {lang === 'tr' ? r.tr : r.en}
                    </button>
                  ))}
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder={lang === 'tr' ? 'Ek not (opsiyonel)' : 'Additional note (optional)'}
                    rows={2}
                    maxLength={500}
                    className="mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || submittingReport}
                    className="mt-2 mb-4 py-3 rounded-full bg-rose-500 text-white text-sm font-bold disabled:opacity-40"
                  >
                    {lang === 'tr' ? 'Gönder' : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
