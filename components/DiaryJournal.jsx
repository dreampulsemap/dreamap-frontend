import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, Trash2, X, Target, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { getDiaryText } from '@/lib/diaryTranslations'
import DiaryComposer from '@/components/DiaryComposer'

// Profildeki KALICI Günce sekmesi. Yukarıdaki halka/hikaye şeridi (bkz.
// DiaryStoryRow) bilinçli olarak Instagram diliyle konuşur — hızlı, günlük,
// 24 saatte söner (bkz. api/diary/feed.js). Burası ise tam tersi: yuvarlak
// avatar yok, otomatik ilerleyen sayaç yok, kaybolma yok. Tarihe göre
// gruplanmış dikey bir zaman çizelgesi — gerçek bir günlük defteri gibi.
// Aynı veri (api/diary/list-for-user), iki bilinçli farklı sunum: biri anlık
// ritüel, biri kalıcı arşiv.
function dayLabel(iso, lang, t) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, now)) return t.today
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(d, yesterday)) return t.yesterday
  const opts = d.getFullYear() === now.getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' }
  return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', opts)
}

function dayLabelFull(iso, lang) {
  return new Date(iso).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function timeLabel(iso, lang) {
  return new Date(iso).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

// Girdileri (eskiden yeniye gelir) gün başlıklarına böler, her girdiye asıl
// dizideki konumunu (_flatIndex) etiketler ki okuyucu ileri/geri giderken
// gün sınırlarını sorunsuz aşabilsin. Gün grupları en yeniden en eskiye.
function groupByDay(entries, lang, t) {
  const groups = []
  let current = null
  entries.forEach((e, i) => {
    const label = dayLabel(e.created_at, lang, t)
    if (!current || current.label !== label) {
      current = { label, key: e.created_at.slice(0, 10), items: [] }
      groups.push(current)
    }
    current.items.push({ ...e, _flatIndex: i })
  })
  return groups.reverse()
}

function EntryThumb({ entry }) {
  if (entry.media_type === 'photo') return <img src={entry.media_url} alt="" className="w-full h-full object-cover" />
  if (entry.media_type === 'video') return <img src={entry.poster_url || entry.media_url} alt="" className="w-full h-full object-cover" />
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-void-900 to-void-800">
      <span className="font-serif text-astral-gold text-xl leading-none">&ldquo;</span>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="flex gap-3 py-3 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-white/5 shrink-0" />
      <div className="flex-1 space-y-2 py-1.5">
        <div className="h-2 w-16 rounded-full bg-white/5" />
        <div className="h-2.5 w-2/3 rounded-full bg-white/5" />
      </div>
    </div>
  )
}

export default function DiaryJournal({ lang = 'en', currentUser }) {
  const t = getDiaryText(lang)
  const [entries, setEntries] = useState(null) // null = yükleniyor
  const [readerIndex, setReaderIndex] = useState(null)
  const [showComposer, setShowComposer] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/diary/list-for-user?userId=${currentUser.id}`, {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const json = await res.json()
      setEntries(res.ok ? json.entries || [] : [])
    } catch (_) {
      setEntries([])
    }
  }, [currentUser?.id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function handleUpdated() { load() }
    window.addEventListener('diary-entries-updated', handleUpdated)
    return () => window.removeEventListener('diary-entries-updated', handleUpdated)
  }, [load])

  if (entries === null) {
    return <div>{Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}</div>
  }

  const groups = groupByDay(entries, lang, t)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500 font-medium">
          {entries.length > 0 ? t.entryCountLabel(entries.length) : ''}
        </span>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90"
        >
          <Plus size={13} /> {t.newEntryBtn}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 px-6">
          <BookOpen size={28} className="mx-auto mb-3 text-slate-600" />
          <p className="text-white font-semibold mb-1.5">{t.journalEmptyTitle}</p>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">{t.journalEmptyBody}</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="mb-5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-0.5">{group.label}</h3>
            <div className="rounded-2xl bg-white/[0.03] border border-white/10 divide-y divide-white/[0.06] overflow-hidden">
              {group.items.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setReaderIndex(entry._flatIndex)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <span className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <EntryThumb entry={entry} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11px] text-slate-500 mb-0.5">{timeLabel(entry.created_at, lang)}</span>
                    <span className="block text-sm text-slate-200 truncate">
                      {entry.caption || (entry.media_type === 'video' ? (lang === 'tr' ? 'Video' : 'Video') : entry.media_type === 'photo' ? (lang === 'tr' ? 'Fotoğraf' : 'Photo') : '—')}
                    </span>
                    {entry.goal_title && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-astral-gold/80">
                        <Target size={10} /> {entry.goal_title}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {readerIndex !== null && (
        <JournalReader
          entries={entries}
          startIndex={readerIndex}
          lang={lang}
          onClose={() => setReaderIndex(null)}
          onDeleted={(entryId) => setEntries((prev) => (prev || []).filter((e) => e.id !== entryId))}
        />
      )}

      {showComposer && (
        <DiaryComposer
          lang={lang}
          currentUser={currentUser}
          onClose={() => setShowComposer(false)}
          onCreated={() => {
            setShowComposer(false)
            load()
            window.dispatchEvent(new Event('diary-entries-updated'))
          }}
        />
      )}
    </div>
  )
}

// Tek girdiyi OKUMAK için — DiaryStoryViewer'ın aksine otomatik ilerleme
// sayacı YOK, ses/video özel kontrolü YOK. Kendi geçmişini kendi hızında
// gezdiğin bir arşiv modu: ok tuşları + görünür ileri/geri okları, tam
// tarih başlığı (hangi gün olduğunu bilmek günlüğün bütün amacı).
function JournalReader({ entries, startIndex, lang, onClose, onDeleted }) {
  const t = getDiaryText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)
  const [index, setIndex] = useState(startIndex)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const entry = entries[index]

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(entries.length - 1, i + 1))
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [entries.length])

  if (!entry) return null

  async function handleDelete() {
    if (deleting) return
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
      onDeleted?.(entry.id)
      setConfirmDelete(false)
      if (entries.length <= 1) onClose?.()
      else setIndex((i) => Math.min(i, entries.length - 2))
    } catch (_) {
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label={t.journalTabLabel} className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-sm flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div>
          <p className="text-white text-sm font-semibold">{dayLabelFull(entry.created_at, lang)}</p>
          <p className="text-slate-500 text-xs">{timeLabel(entry.created_at, lang)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            aria-label={t.deleteEntry}
            className={`h-8 rounded-full flex items-center justify-center text-white transition-all ${confirmDelete ? 'px-3 bg-semantic-danger-500/90 gap-1.5' : 'w-8 bg-white/10 hover:bg-white/20'}`}
          >
            <Trash2 size={14} />
            {confirmDelete && <span className="text-xs font-medium whitespace-nowrap">{deleting ? '...' : t.deleteConfirmBtn}</span>}
          </button>
          <button onClick={onClose} aria-label={t.close} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center px-3 min-h-0">
        {index > 0 && (
          <button onClick={() => setIndex((i) => i - 1)} aria-label={t.previousEntry} className="absolute left-1 sm:left-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <ChevronLeft size={18} />
          </button>
        )}
        {index < entries.length - 1 && (
          <button onClick={() => setIndex((i) => i + 1)} aria-label={t.nextEntry} className="absolute right-1 sm:right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <ChevronRight size={18} />
          </button>
        )}

        <div className="w-full max-w-md max-h-full flex flex-col items-center gap-4 py-4 overflow-y-auto">
          {entry.media_type === 'video' ? (
            <video key={entry.id} src={entry.media_url} poster={entry.poster_url || undefined} className="w-full max-h-[55vh] rounded-2xl object-contain bg-black" controls playsInline />
          ) : entry.media_type === 'photo' ? (
            <img key={entry.id} src={entry.media_url} alt="" className="w-full max-h-[55vh] rounded-2xl object-contain" />
          ) : (
            <div className="w-full rounded-2xl bg-gradient-to-br from-void-900 via-void-800 to-void-950 p-8 flex items-center justify-center min-h-[200px]">
              <p className="font-serif text-xl text-center text-white leading-snug">{entry.caption}</p>
            </div>
          )}

          {entry.media_type !== 'text' && entry.caption && (
            <p className="text-white text-sm text-center px-2">{entry.caption}</p>
          )}

          {entry.goal_title && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-[11px] text-astral-gold shrink-0">
              <Target size={11} /> {entry.goal_title}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
