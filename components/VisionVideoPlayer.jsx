import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bookmark, Flag, MessageCircle, MoreHorizontal, Pause, Pencil, Play, Send, Share2, Sparkles, Trash2, Volume2, VolumeX, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { REPORT_REASONS } from '@/lib/reportReasons'

// Tam ekran "Vizyon Videosu" oynatıcısı — gerçek Reels/TikTok hissi:
// - kapatma çarpısı yok, tarayıcı GERİ tuşu + aşağı kaydırma (ilk videodaysak)
// - controls yok, edge-to-edge (object-cover), loop açık
// - dokununca oynat/duraklat, çift dokununca beğen (kalp patlaması)
// - yukarı/aşağı kaydırarak sıradaki/önceki vizyona geçme — kuyruk bittiğinde
//   /api/goals/list?hasVideo=1 ile otomatik daha fazla getiriyor (genel,
//   herkese-açık keşif sırası; "bu sayfadaki liste" değil — bu oynatıcı 6
//   farklı yerden goal listesi farklı tutulan sayfalardan çağrıldığı için
//   hepsinde çalışan tek ortak yol bu)
// - üst ince ilerleme çubuğu, yükleniyor/hata durumları
// - beğeni + kaydet + yorum (silme dahil) + paylaş + üç nokta menüsü
//   (sahip: Düzenle + Videoyu Sil, diğerleri: Bildir) — SlidesViewer ile
//   aynı uçlar: give-mana, comment, save, delete-vision-video, report
//
// GoalDetailModal.jsx, explore.js, profile.js, index.js, u/[userId].js ve
// vision-board.js hepsi bunu `goal` objesiyle çağırıyor. onOpenDetails
// (currentGoal) parametresi alıyor — kaydırarak başka bir videoya geçilmiş
// olabileceği için, "detaylara git"/"Düzenle" HER ZAMAN o an ekranda olanı
// açmalı, oynatıcı ilk açıldığındaki değil. Çağıran taraflar buna göre.
function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

const SWIPE_THRESHOLD = 90
const SWIPE_MAX = 320
const DOUBLE_TAP_WINDOW = 280

export default function VisionVideoPlayer({ goal, lang, currentUserId, onClose, onOpenDetails, onChanged }) {
  const modalRef = useRef(null)
  const videoRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const tr = lang === 'tr'

  // --- kaydırma kuyruğu: sıradaki/önceki vizyona geçiş ---
  const [queue, setQueue] = useState([goal])
  const [queueIndex, setQueueIndex] = useState(0)
  const [queuePage, setQueuePage] = useState(0)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueExhausted, setQueueExhausted] = useState(false)

  const currentGoal = queue[queueIndex] || goal
  const currentGoalId = currentGoal.id

  const [muted, setMuted] = useState(false) // videolar arası kalıcı, sıfırlanmıyor

  const [liked, setLiked] = useState(!!currentGoal.has_reacted)
  const [believersCount, setBelieversCount] = useState(currentGoal.believers_count || 0)
  const [reacting, setReacting] = useState(false)

  const [saved, setSaved] = useState(!!currentGoal.has_saved)
  const [savesCount, setSavesCount] = useState(currentGoal.saves_count || 0)
  const [savingGoal, setSavingGoal] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [openCommentMenuId, setOpenCommentMenuId] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)

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
  const [tapIcon, setTapIcon] = useState(null) // 'play' | 'pause' | null
  const [likeBurst, setLikeBurst] = useState(null) // { x, y, key } | null
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(!currentGoal.vision_video_url)
  const [dragOffset, setDragOffset] = useState(0)
  const [shareToast, setShareToast] = useState(false)

  const tapIconTimeout = useRef(null)
  const likeBurstTimeout = useRef(null)
  const shareToastTimeout = useRef(null)
  const lastTapAt = useRef(0)
  const singleTapTimer = useRef(null)
  const dragging = useRef(false)
  const dragStartY = useRef(0)

  useEffect(() => () => {
    clearTimeout(tapIconTimeout.current)
    clearTimeout(likeBurstTimeout.current)
    clearTimeout(shareToastTimeout.current)
    clearTimeout(singleTapTimer.current)
  }, [])

  // Ekrandaki video değiştiğinde (kaydırarak geçildiğinde) o videoya özel
  // durumu sıfırla/yeniden senkronize et. `muted` kasıtlı olarak dışarıda
  // (Reels'te de ses tercihi videolar arası taşınır).
  useEffect(() => {
    setLiked(!!currentGoal.has_reacted)
    setBelieversCount(currentGoal.believers_count || 0)
    setReacting(false)
    setSaved(!!currentGoal.has_saved)
    setSavesCount(currentGoal.saves_count || 0)
    setShowComments(false)
    setComments([])
    setCommentText('')
    setOpenCommentMenuId(null)
    setShowMenu(false)
    setConfirmDeleteVideo(false)
    setShowReportSheet(false)
    setReportReason(null)
    setReportNote('')
    setReportSubmitted(false)
    setIsPaused(false)
    setProgress(0)
    setLoading(true)
    setErrored(!currentGoal.vision_video_url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGoalId])

  const isOwner = currentUserId && currentGoal.user_id === currentUserId
  const ownerName = currentGoal.owner?.display_name || currentGoal.owner?.username || (tr ? 'Bilinmeyen' : 'Unknown')

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
  }

  function propagateChange(patch) {
    const updated = { ...currentGoal, ...patch }
    setQueue((q) => q.map((g) => (g.id === currentGoalId ? updated : g)))
    onChanged?.(updated)
  }

  // BEĞEN — goal seviyesinde, SlidesViewer'daki "mana ver" ile aynı uç.
  async function handleLike() {
    if (isOwner || liked || reacting) return
    setReacting(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/give-mana', {
        method: 'POST', headers, body: JSON.stringify({ goalId: currentGoalId, amount: 1 }),
      })
      const json = await res.json()
      if (res.ok) {
        setLiked(true)
        setBelieversCount((c) => c + 1)
        if (typeof json.manaBalance === 'number') window.dispatchEvent(new CustomEvent('mana-balance-updated', { detail: { balance: json.manaBalance } }))
        propagateChange({ has_reacted: true, believers_count: believersCount + 1 })
      }
    } catch (_) {} finally { setReacting(false) }
  }

  async function loadComments() {
    setLoadingComments(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/goals/comment?goalId=${currentGoalId}`, { headers: headers || {} })
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
        method: 'POST', headers, body: JSON.stringify({ goalId: currentGoalId, content }),
      })
      const json = await res.json()
      if (res.ok && json.comment) {
        setComments((prev) => [json.comment, ...prev])
        setCommentText('')
        propagateChange({ comments_count: (currentGoal.comments_count || 0) + 1 })
      }
    } catch (_) {} finally { setPostingComment(false) }
  }

  // Yorumu sil — yalnızca kendi yorumun (uç zaten user_id eşleşmesi arıyor).
  async function handleDeleteComment(commentId) {
    setDeletingCommentId(commentId)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/comment', {
        method: 'DELETE', headers, body: JSON.stringify({ commentId }),
      })
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        setOpenCommentMenuId(null)
        propagateChange({ comments_count: Math.max(0, (currentGoal.comments_count || 0) - 1) })
      }
    } catch (_) {} finally { setDeletingCommentId(null) }
  }

  // KAYDET — goal seviyesinde bookmark, slides/save.js ile aynı toggle deseni.
  async function handleSaveGoal() {
    if (savingGoal) return
    setSavingGoal(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/save', {
        method: 'POST', headers, body: JSON.stringify({ goalId: currentGoalId }),
      })
      const json = await res.json()
      if (res.ok) {
        setSaved(json.saved)
        setSavesCount((c) => Math.max(0, c + (json.saved ? 1 : -1)))
        propagateChange({ has_saved: json.saved, saves_count: Math.max(0, savesCount + (json.saved ? 1 : -1)) })
      }
    } catch (_) {} finally { setSavingGoal(false) }
  }

  // VİDEOYU SİL — goal'ü değil yalnızca vision_video_url'i temizler (bkz.
  // delete-vision-video.js), hedef kendi slaytlarına/detayına döner. Kuyrukta
  // başka video kaldıysa ona geç, kalmadıysa oynatıcıyı kapat.
  async function handleDeleteVideo() {
    if (deletingVideo) return
    setDeletingVideo(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/delete-vision-video', {
        method: 'POST', headers, body: JSON.stringify({ goalId: currentGoalId }),
      })
      const json = await res.json()
      if (res.ok) {
        onChanged?.(json.goal)
        const remaining = queue.filter((g) => g.id !== currentGoalId)
        if (remaining.length === 0) {
          onClose?.()
          return
        }
        setQueue(remaining)
        setQueueIndex((i) => Math.min(i, remaining.length - 1))
      }
    } catch (_) {} finally { setDeletingVideo(false) }
  }

  // BİLDİR — reason zorunlu, note opsiyonel.
  async function handleSubmitReport() {
    if (!reportReason || submittingReport) return
    setSubmittingReport(true)
    try {
      const headers = await authHeaders()
      if (!headers) return
      const res = await fetch('/api/goals/report', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: currentGoalId, reason: reportReason, note: reportNote.trim() || undefined }),
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

  async function handleShare() {
    const url = `${window.location.origin}/u/${currentGoal.user_id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: currentGoal.title, text: currentGoal.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareToast(true)
      clearTimeout(shareToastTimeout.current)
      shareToastTimeout.current = setTimeout(() => setShareToast(false), 1800)
    } catch (_) {
      // kullanıcı paylaşım sheet'ini iptal etti — sessizce geç
    }
  }

  // --- video oynatma + dokunuş mekaniği ---
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

  function triggerLikeBurst(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    setLikeBurst({ x: e.clientX - rect.left, y: e.clientY - rect.top, key: Date.now() })
    clearTimeout(likeBurstTimeout.current)
    likeBurstTimeout.current = setTimeout(() => setLikeBurst(null), 700)
    if (!isOwner && !liked && !reacting) handleLike()
  }

  // Tek dokunuş = oynat/duraklat, çift dokunuş = beğen. click hem mouse hem
  // dokunuş için ateşleniyor (tarayıcı bir tap'i click'e çeviriyor); gerçek
  // bir kaydırmadan sonra tarayıcı zaten sentetik click üretmiyor.
  function handleVideoTap(e) {
    const now = Date.now()
    const since = now - lastTapAt.current
    lastTapAt.current = now

    if (since < DOUBLE_TAP_WINDOW) {
      clearTimeout(singleTapTimer.current)
      singleTapTimer.current = null
      triggerLikeBurst(e)
      return
    }

    clearTimeout(singleTapTimer.current)
    singleTapTimer.current = setTimeout(() => {
      togglePlay()
      singleTapTimer.current = null
    }, DOUBLE_TAP_WINDOW)
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  function goToIndex(i) {
    setQueueIndex(i)
  }

  // Kuyrukta bir sonraki hazırsa ona geç; değilse (kuyruk sonu) genel "video
  // içeren herkese açık vizyonlar" akışından daha fazla getir.
  async function goNext() {
    if (queueIndex + 1 < queue.length) {
      goToIndex(queueIndex + 1)
      return
    }
    if (queueExhausted || queueLoading) return
    setQueueLoading(true)
    try {
      const res = await fetch(`/api/goals/list?mode=feed&hasVideo=1&page=${queuePage}`)
      const json = await res.json()
      const existingIds = new Set(queue.map((g) => g.id))
      const fresh = (json.goals || []).filter((g) => g.vision_video_url && !existingIds.has(g.id))
      setQueuePage((p) => p + 1)
      if (fresh.length > 0) {
        setQueue((q) => [...q, ...fresh])
        setQueueIndex((i) => i + 1)
      } else if (!json.hasMore) {
        setQueueExhausted(true)
      }
    } catch (_) {} finally {
      setQueueLoading(false)
    }
  }

  function goPrev() {
    if (queueIndex > 0) goToIndex(queueIndex - 1)
    else onClose?.()
  }

  // Aşağı kaydırma = önceki (ilk videodaysak kapat), yukarı kaydırma =
  // sıradaki. Yorum/bildir sheet'i açıkken devre dışı.
  function handleTouchStart(e) {
    if (showComments || showReportSheet) return
    dragging.current = true
    dragStartY.current = e.touches[0].clientY
  }
  function handleTouchMove(e) {
    if (!dragging.current) return
    setDragOffset(e.touches[0].clientY - dragStartY.current)
  }
  function handleTouchEnd() {
    dragging.current = false
    if (dragOffset > SWIPE_THRESHOLD) goPrev()
    else if (dragOffset < -SWIPE_THRESHOLD) goNext()
    setDragOffset(0)
  }

  const dragProgress = Math.min(Math.abs(dragOffset) / SWIPE_MAX, 1)

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
        {!errored ? (
          <video
            key={currentGoalId}
            ref={videoRef}
            src={currentGoal.vision_video_url}
            autoPlay
            loop
            playsInline
            muted={muted}
            className="absolute inset-0 w-full h-full object-cover"
            onClick={handleVideoTap}
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
            <p className="text-sm">{tr ? 'Video yüklenemedi.' : 'Video failed to load.'}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/30 pointer-events-none" />

        {/* üst ince ilerleme çubuğu (Story/Reels stili) */}
        <div className="absolute top-0 left-0 right-0 z-20 h-[3px] bg-white/20">
          <div className="h-full bg-white transition-[width] duration-150 ease-linear" style={{ width: `${progress}%` }} />
        </div>

        {(loading || queueLoading) && !errored && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          </div>
        )}

        {isPaused && !tapIcon && !loading && !errored && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center">
              <Play size={26} className="text-white/90 ml-1" fill="currentColor" />
            </div>
          </div>
        )}
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
        {/* çift dokununca beğeni patlaması — dokunulan noktada */}
        {likeBurst && (
          <div
            key={likeBurst.key}
            className="absolute z-20 pointer-events-none animate-heart-burst"
            style={{ left: likeBurst.x, top: likeBurst.y, transform: 'translate(-50%, -50%)' }}
          >
            <Sparkles size={72} className="text-astral-gold drop-shadow-lg" fill="currentColor" />
          </div>
        )}

        {/* Native ses kontrolü olmadığı için tek üst kontrol: sesi aç/kapat. */}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={tr ? 'Sesi aç/kapat' : 'Toggle mute'}
          className="absolute top-7 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {onOpenDetails && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetails(currentGoal) }}
            className="absolute top-7 left-3 z-20 max-w-[55%] px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-medium truncate text-left"
          >
            {currentGoal.title}
          </button>
        )}

        {/* Sahip çipi — üstteki başlık butonundan (video detaylarını açar)
            AYRI: buraya dokununca artık profile gidiyor, Instagram'daki
            gibi. Aynı sayfadaysak (ör. zaten bu kişinin profilindeyken)
            Link'in kendisi bir şey yapmayabilir, o yüzden oynatıcıyı da
            kapatıp altındaki profili görünür kılıyoruz. */}
        <Link
          href={`/u/${currentGoal.owner?.id || currentGoal.user_id}`}
          onClick={(e) => { e.stopPropagation(); onClose?.() }}
          className="absolute left-4 bottom-40 z-10 flex items-center gap-2"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 ring-2 ring-white/20">
            {currentGoal.owner?.avatar_url ? <img src={currentGoal.owner.avatar_url} alt="" className="w-full h-full object-cover" /> : initialsOf(ownerName)}
          </span>
          <span className="text-white text-sm font-semibold drop-shadow-md">{ownerName}</span>
        </Link>

        {/* Aksiyon şeridi */}
        <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-4">
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
            <span className="text-white text-[11px] font-semibold drop-shadow">{currentGoal.comments_count || 0}</span>
          </button>

          <button
            onClick={handleSaveGoal}
            disabled={savingGoal}
            aria-label={tr ? 'Kaydet' : 'Save'}
            className="flex flex-col items-center gap-1 disabled:opacity-60"
          >
            <span className={`w-10 h-10 rounded-full flex items-center justify-center ${saved ? 'text-cyan-300' : 'text-white'}`}>
              <Bookmark size={24} fill={saved ? 'currentColor' : 'none'} />
            </span>
            <span className="text-white text-[11px] font-semibold drop-shadow">{savesCount}</span>
          </button>

          <button onClick={handleShare} aria-label={tr ? 'Paylaş' : 'Share'} className="flex flex-col items-center gap-1">
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-white">
              <Share2 size={22} />
            </span>
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); setConfirmDeleteVideo(false) }}
              aria-label={tr ? 'Diğer seçenekler' : 'More options'}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
            >
              <MoreHorizontal size={24} />
            </button>
            {showMenu && (
              <div className="absolute right-12 bottom-0 w-48 rounded-xl bg-void-900 border border-white/10 shadow-xl overflow-hidden">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); onOpenDetails ? onOpenDetails(currentGoal) : onClose?.() }}
                      className="w-full flex items-center gap-2 px-3.5 py-3 text-slate-200 text-sm hover:bg-white/5"
                    >
                      <Pencil size={14} /> {tr ? 'Düzenle' : 'Edit'}
                    </button>
                    {!confirmDeleteVideo ? (
                      <button
                        onClick={() => setConfirmDeleteVideo(true)}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-rose-400 text-sm hover:bg-white/5 border-t border-white/10"
                      >
                        <Trash2 size={14} /> {tr ? 'Videoyu Sil' : 'Delete Video'}
                      </button>
                    ) : (
                      <button
                        onClick={handleDeleteVideo}
                        disabled={deletingVideo}
                        className="w-full flex items-center gap-2 px-3.5 py-3 text-white text-sm bg-rose-500/90 hover:bg-rose-500 border-t border-white/10 disabled:opacity-60"
                      >
                        <Trash2 size={14} /> {tr ? 'Emin misin? Sil' : 'Confirm delete'}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => { setShowMenu(false); setShowReportSheet(true) }}
                    className="w-full flex items-center gap-2 px-3.5 py-3 text-rose-400 text-sm hover:bg-white/5"
                  >
                    <Flag size={14} /> {tr ? 'Bildir' : 'Report'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {shareToast && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-white/95 text-black text-xs font-semibold shadow-lg">
            {tr ? 'Bağlantı kopyalandı' : 'Link copied'}
          </div>
        )}

        {/* Yorum sheet'i */}
        {showComments && (
          <div className="absolute inset-0 z-30 flex items-end" onClick={() => setShowComments(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[70vh] bg-void-950 border-t border-white/10 rounded-t-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-white text-sm font-bold">{tr ? 'Yorumlar' : 'Comments'}</span>
                <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {loadingComments ? (
                  <p className="text-slate-500 text-xs text-center py-6">...</p>
                ) : comments.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">
                    {tr ? 'Henüz yorum yok. İlk yorumu sen yaz.' : 'No comments yet. Be the first.'}
                  </p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="relative flex gap-2.5 py-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                        {c.user_profiles?.avatar_url ? (
                          <img src={c.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : initialsOf(c.user_profiles?.display_name || c.user_profiles?.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{c.user_profiles?.display_name || c.user_profiles?.username}</p>
                        <p className="text-slate-300 text-sm break-words">{c.content}</p>
                      </div>
                      {currentUserId && c.user_id === currentUserId && (
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setOpenCommentMenuId((id) => (id === c.id ? null : c.id))}
                            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white"
                            aria-label={tr ? 'Yorum seçenekleri' : 'Comment options'}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openCommentMenuId === c.id && (
                            <div className="absolute right-0 top-6 z-10 w-36 rounded-xl bg-[#1a1e28] border border-white/10 shadow-xl overflow-hidden">
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={deletingCommentId === c.id}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-rose-400 text-xs font-medium hover:bg-white/5 disabled:opacity-40"
                              >
                                <Trash2 size={13} />
                                {deletingCommentId === c.id ? (tr ? 'Siliniyor…' : 'Deleting…') : (tr ? 'Yorumu sil' : 'Delete comment')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment() }}
                  placeholder={tr ? 'Yorum yaz...' : 'Write a comment...'}
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
                <span className="text-white text-sm font-bold">{tr ? 'İçeriği bildir' : 'Report content'}</span>
                <button onClick={() => setShowReportSheet(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              {reportSubmitted ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-white text-sm font-semibold">
                    {tr ? 'Bildirimin alındı, teşekkürler.' : 'Your report has been received, thank you.'}
                  </p>
                </div>
              ) : (
                <div className="px-4 py-3 flex flex-col gap-1">
                  <p className="text-slate-400 text-xs px-1 pb-1">
                    {tr ? 'Bu içeriği neden bildiriyorsun?' : 'Why are you reporting this content?'}
                  </p>
                  {REPORT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setReportReason(r.value)}
                      className={`text-left px-3 py-3 rounded-lg text-sm transition-colors ${
                        reportReason === r.value ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {tr ? r.tr : r.en}
                    </button>
                  ))}
                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder={tr ? 'Ek not (opsiyonel)' : 'Additional note (optional)'}
                    rows={2}
                    maxLength={500}
                    className="mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
                  />
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || submittingReport}
                    className="mt-2 mb-4 py-3 rounded-full bg-rose-500 text-white text-sm font-bold disabled:opacity-40"
                  >
                    {tr ? 'Gönder' : 'Submit'}
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
