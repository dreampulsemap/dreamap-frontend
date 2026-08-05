import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Trash2, Target, Volume2, VolumeX, Pause } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { getDiaryText } from '@/lib/diaryTranslations'

// Çok-kullanıcılı Günce görüntüleyici — SlidesViewer'daki hikaye tarzı
// ilerleme çubuğu + basılı-tut-duraklat + dokunma-bölgesi mekaniğinin AYNISI,
// ama iki seviyeli: groupIndex (hangi kişi) + entryIndex (o kişinin hangi
// girdisi). Bir kişinin girdileri biterse otomatik bir sonraki kişiye
// geçiyor (Instagram'daki gibi), en sonuncudan sonra kapanıyor.
//
// Her kişinin girdileri TEMBEL yükleniyor (sadece halkasına dokunulunca
// /api/diary/list-for-user'dan) — DiaryStoryRow zaten herkesin girdilerini
// baştan çekmiyor, sadece özet (kaç girdi, en son ne zaman) veriyor.
const PHOTO_DURATION_S = 5
const TEXT_DURATION_S = 6
const FALLBACK_VIDEO_DURATION_S = 8
const HOLD_THRESHOLD_MS = 180
const KENBURNS_VARIANTS = ['kenburns-1', 'kenburns-2', 'kenburns-3', 'kenburns-4']

function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

function formatRelativeTime(iso, lang) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return lang === 'tr' ? 'şimdi' : 'now'
  if (mins < 60) return lang === 'tr' ? `${mins}dk` : `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return lang === 'tr' ? `${hours}sa` : `${hours}h`
  return lang === 'tr' ? `${Math.floor(hours / 24)}g` : `${Math.floor(hours / 24)}d`
}

export default function DiaryStoryViewer({ groups, startIndex = 0, lang = 'en', currentUserId, onClose }) {
  const t = getDiaryText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [groupIndex, setGroupIndex] = useState(startIndex)
  const [entryIndex, setEntryIndex] = useState(0)
  const [cache, setCache] = useState({}) // userId -> { owner, entries, status }
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [videoDurationS, setVideoDurationS] = useState(null)
  const [buffering, setBuffering] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const activeVideoRef = useRef(null)
  const holdTimerRef = useRef(null)
  const wasHeldRef = useRef(false)
  const tokenCounterRef = useRef(0)
  const activationTokenRef = useRef({})

  const group = groups[groupIndex]
  const isSelfGroup = group?.userId === currentUserId

  const loadGroup = useCallback(async (userId) => {
    setCache((prev) => ({ ...prev, [userId]: { ...(prev[userId] || {}), status: 'loading' } }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/diary/list-for-user?userId=${userId}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!res.ok) throw new Error('load_failed')
      const json = await res.json()
      setCache((prev) => ({ ...prev, [userId]: { owner: json.owner, entries: json.entries || [], status: 'ready' } }))
    } catch (_) {
      setCache((prev) => ({ ...prev, [userId]: { entries: [], status: 'error' } }))
    }
  }, [])

  useEffect(() => {
    if (group && !cache[group.userId]) loadGroup(group.userId)
  }, [group, cache, loadGroup])

  // ALGILANAN gecikmeyi azaltmak için iki önceden-yükleme:
  // (a) sıradaki KİŞİNİN girdi listesini arka planda çek — mevcut kişinin
  //     hikayeleri bitip otomatik geçiş olduğunda spinner'a takılmasın;
  // (b) sıradaki TEK medyayı (foto ya da video posteri) tarayıcı
  //     önbelleğine ısıt — sıra ona gelince anında görünür.
  useEffect(() => {
    const nextGroup = groups[groupIndex + 1]
    if (nextGroup && !cache[nextGroup.userId]) loadGroup(nextGroup.userId)
  }, [groupIndex, groups, cache, loadGroup])

  useEffect(() => {
    let nextEntry = entries[entryIndex + 1]
    if (!nextEntry) nextEntry = cache[groups[groupIndex + 1]?.userId]?.entries?.[0]
    if (!nextEntry) return
    const prefetchUrl = nextEntry.media_type === 'video' ? nextEntry.poster_url : nextEntry.media_type === 'photo' ? nextEntry.media_url : null
    if (!prefetchUrl) return
    const img = new window.Image()
    img.src = prefetchUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryIndex, entries, groupIndex, groups, cache])

  const current = cache[group?.userId]
  const entries = current?.entries || []
  const entry = entries[entryIndex]
  const isPlaying = !paused

  // Grup açılınca "görüldü" işaretle (kendi günceni işaretlemenin bir
  // anlamı yok) — DiaryStoryRow'daki halkanın altın->gri dönmesi için event.
  useEffect(() => {
    if (!group || isSelfGroup) return
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      fetch('/api/diary/mark-seen', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: group.userId }),
      }).then(() => window.dispatchEvent(new Event('diary-entries-updated'))).catch(() => {})
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.userId])

  function activateEntry(index) {
    tokenCounterRef.current += 1
    const target = entries[index]
    if (target) activationTokenRef.current[target.id] = tokenCounterRef.current
    setEntryIndex(index)
    setVideoDurationS(null)
    setBuffering(false)
  }

  function goToGroup(nextGroupIndex, entryPos) {
    if (nextGroupIndex < 0) return
    if (nextGroupIndex > groups.length - 1) { onClose?.(); return }
    tokenCounterRef.current += 1
    setGroupIndex(nextGroupIndex)
    setEntryIndex(entryPos)
    setVideoDurationS(null)
    setBuffering(false)
    setConfirmDelete(false)
  }

  function advance() {
    if (entryIndex < entries.length - 1) activateEntry(entryIndex + 1)
    else goToGroup(groupIndex + 1, 0)
  }
  function retreat() {
    if (entryIndex > 0) { activateEntry(entryIndex - 1); return }
    if (groupIndex === 0) return
    const prevEntries = cache[groups[groupIndex - 1]?.userId]?.entries
    goToGroup(groupIndex - 1, prevEntries?.length ? prevEntries.length - 1 : 0)
  }

  // Bir grup yüklenip girdi listesi boş çıkarsa (görünürlük değişmiş,
  // silinmiş vb.) boş ekranda takılı kalmak yerine sonraki gruba geç.
  useEffect(() => {
    if (current?.status === 'ready' && entries.length === 0) advance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.status, entries.length])

  // Oto-ilerleme: foto/metin sabit süre; video kendi doğal süresi kadar
  // oynar ve onEnded ile ilerler (aşağıda, <video> üzerinde).
  useEffect(() => {
    if (!isPlaying || !entry || entry.media_type === 'video') return
    const ms = (entry.media_type === 'text' ? TEXT_DURATION_S : PHOTO_DURATION_S) * 1000
    const id = setTimeout(advance, ms)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, isPlaying])

  useEffect(() => {
    const vid = activeVideoRef.current
    if (!vid) return
    if (isPlaying) vid.play().catch(() => {})
    else vid.pause()
  }, [isPlaying, entry?.id])

  function handleZoneDown() {
    wasHeldRef.current = false
    holdTimerRef.current = setTimeout(() => { wasHeldRef.current = true; setPaused(true) }, HOLD_THRESHOLD_MS)
  }
  function handleZoneUp(direction) {
    clearTimeout(holdTimerRef.current)
    if (wasHeldRef.current) { setPaused(false); wasHeldRef.current = false; return }
    if (direction === 'next') advance(); else retreat()
  }
  function handleZoneCancel() {
    clearTimeout(holdTimerRef.current)
    if (wasHeldRef.current) setPaused(false)
    wasHeldRef.current = false
  }

  async function handleDelete() {
    if (!entry || deleting) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/diary/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      })
      window.dispatchEvent(new Event('diary-entries-updated'))
      const remaining = entries.filter((e) => e.id !== entry.id)
      setCache((prev) => ({ ...prev, [group.userId]: { ...prev[group.userId], entries: remaining } }))
      setConfirmDelete(false)
      if (remaining.length === 0) goToGroup(groupIndex + 1, 0)
      else activateEntry(Math.min(entryIndex, remaining.length - 1))
    } catch (_) {
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  if (!group) return null

  const label = isSelfGroup ? t.youLabel : (group.displayName || group.username || '?')
  const kenburns = KENBURNS_VARIANTS[entryIndex % KENBURNS_VARIANTS.length]
  const showLoading = current?.status === 'loading' || !entry

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.yourStory}
      className="fixed inset-0 z-[90] bg-black animate-fade-in"
    >
      <div className="relative w-full h-full max-w-[480px] mx-auto overflow-hidden">
        {showLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="absolute inset-0">
              {entry.media_type === 'video' ? (
                <video
                  ref={activeVideoRef}
                  key={entry.id}
                  src={entry.media_url}
                  poster={entry.poster_url || undefined}
                  className="w-full h-full object-cover"
                  playsInline
                  muted={muted}
                  autoPlay
                  preload="auto"
                  onLoadedMetadata={(e) => setVideoDurationS(e.currentTarget.duration || null)}
                  onEnded={advance}
                  onWaiting={() => setBuffering(true)}
                  onPlaying={() => setBuffering(false)}
                  onCanPlay={() => setBuffering(false)}
                />
              ) : entry.media_type === 'photo' ? (
                <img
                  key={entry.id}
                  src={entry.media_url}
                  alt=""
                  className={`w-full h-full object-cover ${isPlaying ? kenburns : ''}`}
                  style={{ animationDuration: `${PHOTO_DURATION_S + 1}s`, animationTimingFunction: 'linear', animationFillMode: 'forwards' }}
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-void-900 via-void-800 to-void-950">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundImage: 'radial-gradient(circle at 50% 32%, rgba(230,198,135,0.14), transparent 60%)' }}
                  />
                  <p className="relative font-serif text-2xl sm:text-3xl text-center text-white leading-snug">
                    {entry.caption}
                  </p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />
            </div>

            {entry.media_type !== 'text' && entry.caption && (
              <div className="absolute left-4 right-4 bottom-20 z-20">
                <p className="text-white text-base leading-snug drop-shadow-lg">{entry.caption}</p>
              </div>
            )}

            {entry.goal_title && (
              <div className="absolute left-4 bottom-8 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                <Target size={12} className="text-astral-gold" />
                <span className="text-[11px] text-white/90 font-medium truncate max-w-[200px]">{entry.goal_title}</span>
              </div>
            )}
          </>
        )}

        {/* Hikaye tarzı ilerleme çubuğu — segment sayısı bu kişinin girdi sayısı */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {entries.map((e, i) => {
            const token = activationTokenRef.current[e.id] || 0
            const durationS = e.media_type === 'video' ? (videoDurationS || FALLBACK_VIDEO_DURATION_S) : e.media_type === 'text' ? TEXT_DURATION_S : PHOTO_DURATION_S
            return (
              <div key={e.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
                {i < entryIndex ? (
                  <div className="h-full w-full bg-white rounded-full" />
                ) : i === entryIndex ? (
                  <div
                    key={`fill-${e.id}-${token}`}
                    className="h-full bg-white rounded-full"
                    style={{ width: '0%', animation: `story-fill ${durationS}s linear forwards`, animationPlayState: isPlaying ? 'running' : 'paused' }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Sahip başlığı + kontroller */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {group.avatarUrl ? <img src={group.avatarUrl} alt="" className="w-full h-full object-cover" /> : initialsOf(label)}
            </span>
            <span className="text-white text-sm font-medium truncate">{label}</span>
            {entry && <span className="text-white/50 text-xs shrink-0">· {formatRelativeTime(entry.created_at, lang)}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {entry?.media_type === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); setMuted((m) => !m) }}
                aria-label={lang === 'tr' ? 'Sesi aç/kapat' : 'Toggle mute'}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white"
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            )}
            {isSelfGroup && entry && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete() }}
                aria-label={t.deleteEntry}
                className={`h-8 rounded-full flex items-center justify-center text-white transition-all ${confirmDelete ? 'px-3 bg-semantic-danger-500/90 gap-1.5' : 'w-8 bg-black/40 hover:bg-black/60'}`}
              >
                <Trash2 size={14} />
                {confirmDelete && <span className="text-xs font-medium whitespace-nowrap">{deleting ? '...' : t.deleteConfirmBtn}</span>}
              </button>
            )}
            <button onClick={onClose} aria-label={t.close} className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dokunma bölgeleri */}
        <div className="absolute inset-0 z-[5] flex">
          <button
            aria-label={t.previousEntry}
            className="w-[30%] h-full"
            onPointerDown={handleZoneDown}
            onPointerUp={() => handleZoneUp('prev')}
            onPointerCancel={handleZoneCancel}
            onPointerLeave={handleZoneCancel}
          />
          <button
            aria-label={t.nextEntry}
            className="flex-1 h-full"
            onPointerDown={handleZoneDown}
            onPointerUp={() => handleZoneUp('next')}
            onPointerCancel={handleZoneCancel}
            onPointerLeave={handleZoneCancel}
          />
        </div>

        {paused && (
          <div className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none">
            <span className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Pause size={22} className="text-white/90" fill="currentColor" />
            </span>
          </div>
        )}

        {!paused && buffering && entry?.media_type === 'video' && (
          <div className="absolute inset-0 z-[6] flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 border-2 border-white/25 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
