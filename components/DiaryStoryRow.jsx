import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getDiaryText } from '@/lib/diaryTranslations'

// Ana sayfanın en üstünde, sticky filtre çubuğunun ÜSTÜNDE (normal akışta,
// kaydırınca kayboluyor — IG'deki gibi) duran yuvarlak story satırı. "Sen"
// her zaman ilk sırada; girdin yoksa kesikli halka + tıklayınca doğrudan
// composer açılır, girdin varsa halka altın (okunmamış) ya da nötr (hepsi
// görüldü) olur ve tıklayınca kendi günceni izlersin — ekleme o zaman sadece
// köşedeki küçük + rozetinden olur (IG'nin "add to your story" deseni).
// Altın gradyan, .gold-gradient-text ile AYNI 3 durak — tutarlı marka dili.
const GOLD_RING = 'conic-gradient(from 0deg, #FFF6D6, #E6C687, #B89753, #E6C687, #FFF6D6)'

function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

function RingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 w-16">
      <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
      <div className="w-10 h-2.5 rounded-full bg-white/5 animate-pulse" />
    </div>
  )
}

export default function DiaryStoryRow({ lang = 'en', currentUser, onOpenViewer, onCompose, refreshToken }) {
  const t = getDiaryText(lang)
  const [rings, setRings] = useState(null) // null = yükleniyor
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    if (!currentUser?.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/diary/feed', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) throw new Error('feed_failed')
      const json = await res.json()
      setRings(json.rings || [])
      setFailed(false)
    } catch (_) {
      // Besleme çekilemezse satırı tamamen gizlemek yerine EN AZINDAN kendi
      // (boş) halkasını elle kuruyoruz — ekleme girişi hâlâ çalışsın.
      setRings([{ userId: currentUser.id, isSelf: true, entryCount: 0, avatarUrl: currentUser.avatar_url, displayName: currentUser.display_name, username: currentUser.username }])
      setFailed(true)
    }
  }, [currentUser?.id, currentUser?.avatar_url, currentUser?.display_name, currentUser?.username])

  useEffect(() => { load() }, [load, refreshToken])

  useEffect(() => {
    function handleUpdated() { load() }
    window.addEventListener('diary-entries-updated', handleUpdated)
    return () => window.removeEventListener('diary-entries-updated', handleUpdated)
  }, [load])

  if (!currentUser?.id) return null

  if (rings === null) {
    return (
      <div className="flex gap-4 px-4 py-3 overflow-x-hidden">
        {Array.from({ length: 6 }).map((_, i) => <RingSkeleton key={i} />)}
      </div>
    )
  }

  function handleRingClick(ring) {
    if (ring.isSelf && ring.entryCount === 0) { onCompose?.(); return }
    const viewable = rings.filter((r) => r.entryCount > 0)
    const viewableIndex = viewable.findIndex((r) => r.userId === ring.userId)
    onOpenViewer?.(viewable, viewableIndex)
  }

  return (
    <div className="flex gap-4 px-4 py-3 overflow-x-auto no-scrollbar" role="list" aria-label={lang === 'tr' ? 'Günce' : 'Diary stories'}>
      {rings.map((ring) => {
        const isEmpty = ring.entryCount === 0
        const label = ring.isSelf ? t.youLabel : (ring.displayName || ring.username || '?')
        const hasGoldRing = !isEmpty && ring.hasUnseen
        const glow = ring.isSelf && (ring.streakDays || 0) >= 3 ? 'shadow-astral-glow' : ''

        return (
          <button
            key={ring.userId}
            role="listitem"
            onClick={() => handleRingClick(ring)}
            className="flex flex-col items-center gap-1.5 shrink-0 w-16 active:scale-95 transition-transform"
          >
            <span
              className={`relative w-16 h-16 rounded-full p-[2.5px] ${glow} ${isEmpty ? 'border-2 border-dashed border-slate-500' : !hasGoldRing ? 'ring-2 ring-white/20' : ''}`}
              style={hasGoldRing ? { background: GOLD_RING } : undefined}
            >
              <span className="block w-full h-full rounded-full bg-void-950 p-[2px]">
                <span className="flex items-center justify-center w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-brand-primary-500 to-brand-secondary-500 text-white text-sm font-bold">
                  {ring.avatarUrl ? (
                    <img src={ring.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initialsOf(label)
                  )}
                </span>
              </span>

              {ring.isSelf && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={t.addStory}
                  onClick={(e) => { e.stopPropagation(); onCompose?.() }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onCompose?.() } }}
                  className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-brand-primary-500 ring-2 ring-void-950 flex items-center justify-center hover:bg-brand-primary-400"
                >
                  <Plus size={12} className="text-white" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-300 truncate w-full text-center">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
