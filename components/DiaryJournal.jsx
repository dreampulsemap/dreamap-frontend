import { useState, useEffect, useCallback, useRef } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, Trash2, X, Target, Plus, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { getDiaryText } from '@/lib/diaryTranslations'
import DiaryComposer from '@/components/DiaryComposer'

// Profildeki KALICI Günce sekmesi. Yukarıdaki halka/hikaye şeridi (bkz.
// DiaryStoryRow) bilinçli olarak Instagram diliyle konuşur — hızlı, günlük,
// 24 saatte söner (bkz. api/diary/feed.js, list-for-user?recent=1). Burası
// ise tam tersi: kaybolma yok. Her gün bir defter sayfası — büyük tarih
// başlığı, altın cetvel çizgisi üzerinde saat saat girdiler, satır içi
// Düzenle / Sil.
function dayLabel(iso, lang, t) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, now)) return t.today
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (sameDay(d, yesterday)) return t.yesterday
  return null
}

function dayLabelFull(iso, lang) {
  return new Date(iso).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function timeLabel(iso, lang) {
  return new Date(iso).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

// Yerel takvim gününe göre anahtar. ÖNCEDEN created_at'in ilk 10 karakteri
// (UTC günü) kullanılıyordu: Türkiye'de 00:00-03:00 arası yazılan girdi bir
// önceki günün sayfasına düşüyordu.
function localDayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Girdileri (eskiden yeniye gelir) gün sayfalarına böler, her girdiye asıl
// dizideki konumunu (_flatIndex) etiketler ki okuyucu ileri/geri giderken
// gün sınırlarını sorunsuz aşabilsin. Günler en yeniden en eskiye; bir
// günün içinde girdiler sabahtan akşama (defterde yazıldığı sırayla).
function groupByDay(entries, lang, t) {
  const groups = []
  let current = null
  entries.forEach((e, i) => {
    const key = localDayKey(e.created_at)
    if (!current || current.key !== key) {
      current = { key, relative: dayLabel(e.created_at, lang, t), date: new Date(e.created_at), items: [] }
      groups.push(current)
    }
    current.items.push({ ...e, _flatIndex: i })
  })
  return groups.reverse()
}

const VIS = {
  public: { tr: 'Herkese açık', en: 'Public', cls: 'text-aether-cyan bg-aether-cyan/10' },
  friends: { tr: 'Arkadaşlar', en: 'Friends', cls: 'text-violet-300 bg-violet-400/10' },
  private: { tr: 'Gizli', en: 'Private', cls: 'text-astral-gold bg-astral-gold/10' },
}

function VisibilityBadge({ value, lang }) {
  const v = VIS[value] || VIS.private
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.cls}`}>{lang === 'tr' ? v.tr : v.en}</span>
}

// Günün "defter sayfası" başlığı: büyük gün numarası + ay / hafta günü.
function DayHeader({ group, lang }) {
  const loc = lang === 'tr' ? 'tr-TR' : 'en-US'
  const d = group.date
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const weekday = d.toLocaleDateString(loc, { weekday: 'long' })
  return (
    <div className="mb-3 flex items-end gap-3">
      <span className="font-serif text-5xl font-bold leading-none tabular-nums text-astral-gold">{d.getDate()}</span>
      <span className="pb-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
          {d.toLocaleDateString(loc, sameYear ? { month: 'long' } : { month: 'long', year: 'numeric' })}
        </span>
        <span className="block font-serif text-sm italic text-slate-400">
          {group.relative ? `${group.relative} · ${weekday}` : weekday}
        </span>
      </span>
      <span className="mb-2 h-px flex-1 bg-gradient-to-r from-astral-gold/30 to-transparent" />
    </div>
  )
}

function EditEntryModal({ entry, lang, onClose, onSaved }) {
  const tr = lang === 'tr'
  const ref = useRef(null)
  useModalA11y(ref, onClose)
  const [caption, setCaption] = useState(entry.caption || '')
  const [visibility, setVisibility] = useState(entry.visibility || 'private')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (saving) return
    if (entry.media_type === 'text' && !caption.trim()) {
      setError(tr ? 'Metin girdisi boş olamaz.' : 'A text entry cannot be empty.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/diary/update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, caption, visibility }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error)
      onSaved(json.entry)
    } catch {
      setError(tr ? 'Kaydedilemedi, tekrar dene.' : "Couldn't save, please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full space-y-3 rounded-t-3xl border border-white/10 bg-void-900 p-5 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-white">{tr ? 'Girdiyi düzenle' : 'Edit entry'}</h3>
          <button onClick={onClose} aria-label={tr ? 'Kapat' : 'Close'} className="rounded-full p-1.5 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>
        <p className="text-[11px] text-slate-500">{dayLabelFull(entry.created_at, lang)} · {timeLabel(entry.created_at, lang)}</p>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, 1000))}
          rows={5}
          placeholder={tr ? 'Bugün neler hissettin?' : 'How did today feel?'}
          className="w-full resize-none rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-serif text-base leading-relaxed text-white placeholder:text-slate-500"
        />
        <div className="flex gap-1.5">
          {['public', 'friends', 'private'].map((v) => (
            <button
              key={v}
              onClick={() => setVisibility(v)}
              className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-semibold ${visibility === v ? 'border-astral-gold bg-astral-gold/15 text-astral-gold' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              {tr ? VIS[v].tr : VIS[v].en}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={save} disabled={saving} className="w-full rounded-full bg-astral-gold py-2.5 text-sm font-bold text-void-950 disabled:opacity-50">
          {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save')}
        </button>
      </div>
    </div>
  )
}

function JournalEntry({ entry, lang, onOpen, onEdit, onDelete, deleting }) {
  const tr = lang === 'tr'
  const [confirm, setConfirm] = useState(false)
  const hasMedia = entry.media_type !== 'text' && (entry.media_url || entry.poster_url)
  return (
    <div className="relative pl-6">
      {/* zaman çizelgesi noktası (cetvel çizgisinin üstünde) */}
      <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-astral-gold shadow-[0_0_8px_rgba(230,198,135,0.7)]" />
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-semibold tabular-nums text-slate-400">{timeLabel(entry.created_at, lang)}</span>
        <VisibilityBadge value={entry.visibility} lang={lang} />
        <span className="flex-1" />
        <button onClick={() => onEdit(entry)} aria-label={tr ? 'Düzenle' : 'Edit'} className="rounded-full p-1.5 text-slate-500 hover:bg-white/5 hover:text-white">
          <Pencil size={13} />
        </button>
        <button
          onClick={() => (confirm ? onDelete(entry) : setConfirm(true))}
          onBlur={() => setConfirm(false)}
          disabled={deleting}
          aria-label={tr ? 'Sil' : 'Delete'}
          className={`flex items-center gap-1 rounded-full text-xs transition-all ${confirm ? 'bg-semantic-danger-500/90 px-2.5 py-1 text-white' : 'p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-300'}`}
        >
          <Trash2 size={13} />
          {confirm && <span>{deleting ? '...' : (tr ? 'Silinsin mi?' : 'Delete?')}</span>}
        </button>
      </div>
      <button
        onClick={() => onOpen(entry._flatIndex)}
        className="block w-full rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 text-left transition-colors hover:border-astral-gold/25"
      >
        {hasMedia && (
          <span className="mb-3 block overflow-hidden rounded-xl bg-black/30">
            {entry.media_type === 'video' ? (
              <span className="relative block">
                <img src={entry.poster_url || entry.media_url} alt="" className="max-h-72 w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center"><span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white">▶</span></span>
              </span>
            ) : (
              <img src={entry.media_url} alt="" className="max-h-72 w-full object-cover" loading="lazy" />
            )}
          </span>
        )}
        {entry.caption ? (
          <span className={`block whitespace-pre-line font-serif leading-relaxed text-slate-100 ${entry.media_type === 'text' ? 'text-lg' : 'text-[15px]'}`}>
            {entry.media_type === 'text' && <span className="mr-1 text-2xl leading-none text-astral-gold/70">&ldquo;</span>}
            {entry.caption}
          </span>
        ) : (
          <span className="block text-sm italic text-slate-500">{entry.media_type === 'video' ? 'Video' : (tr ? 'Fotoğraf' : 'Photo')}</span>
        )}
        {entry.goal_title && (
          <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-astral-gold/10 px-2.5 py-1 text-[11px] text-astral-gold">
            <Target size={11} /> {entry.goal_title}
          </span>
        )}
      </button>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 py-3">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-white/5" />
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
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

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

  async function deleteEntry(entry) {
    if (deletingId) return
    setDeletingId(entry.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/diary/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id }),
      })
      if (res.ok) {
        setEntries((prev) => (prev || []).filter((e) => e.id !== entry.id))
        window.dispatchEvent(new Event('diary-entries-updated'))
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (entries === null) {
    return <div>{Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}</div>
  }

  const groups = groupByDay(entries, lang, t)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <BookOpen size={14} className="text-astral-gold/70" />
          {entries.length > 0 ? t.entryCountLabel(entries.length) : ''}
        </span>
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 px-3.5 py-2 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90"
        >
          <Plus size={13} /> {t.newEntryBtn}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <BookOpen size={28} className="mx-auto mb-3 text-slate-600" />
          <p className="mb-1.5 font-semibold text-white">{t.journalEmptyTitle}</p>
          <p className="mx-auto max-w-xs text-sm text-slate-500">{t.journalEmptyBody}</p>
        </div>
      ) : (
        <div className="space-y-9">
          {groups.map((group) => (
            <section key={group.key}>
              <DayHeader group={group} lang={lang} />
              {/* sol kenardaki ince altın çizgi: defter sayfasının cetveli */}
              <div className="ml-[5px] space-y-5 border-l border-astral-gold/20 pb-1">
                {group.items.map((entry) => (
                  <JournalEntry
                    key={entry.id}
                    entry={entry}
                    lang={lang}
                    onOpen={setReaderIndex}
                    onEdit={setEditing}
                    onDelete={deleteEntry}
                    deleting={deletingId === entry.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
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

      {editing && (
        <EditEntryModal
          entry={editing}
          lang={lang}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setEntries((prev) => (prev || []).map((e) => (e.id === updated.id ? { ...e, ...updated } : e)))
            setEditing(null)
          }}
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
