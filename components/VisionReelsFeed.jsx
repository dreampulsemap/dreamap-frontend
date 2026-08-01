import { useRef, useEffect, useState } from 'react'
import { ChevronLeft, Sparkles, MessageCircle, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'

// Vizyon panosunun 9:16 "Reels" görünümü — grid'in aksine hedefler tek tek,
// tam ekran, dikey kaydırmayla (scroll-snap) art arda geliyor. Her kart
// ekrana girdiğinde kısa bir "fast cut" animasyonuyla belirir (bkz.
// .reel-active, globals.css). Ağır bir gesture kütüphanesi yerine native
// CSS scroll-snap + IntersectionObserver kullanıyoruz — daha performanslı
// ve daha az kod.

function initialsOf(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

export default function VisionReelsFeed({ goals, lang, t, currentUserId, initialGoalId, onClose, onOpenGoal, onOpenSlides, onLoadMore, hasMore, loading, onReacted }) {
  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const initialIndex = initialGoalId ? Math.max(goals.findIndex((g) => g.id === initialGoalId), 0) : 0
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [reactingId, setReactingId] = useState(null)
  const [pulseId, setPulseId] = useState(null)
  const [localGoals, setLocalGoals] = useState(goals)

  useEffect(() => { setLocalGoals(goals) }, [goals])

  useModalA11y(containerRef, onClose)

  // Belirli bir vizyona tıklanarak açıldıysa (ana sayfa/keşfet), besleme o
  // vizyonda başlasın — her zaman en baştan değil. Animasyonsuz, anlık.
  useEffect(() => {
    if (initialIndex > 0) {
      itemRefs.current[initialIndex]?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number(entry.target.dataset.index)
            setActiveIndex(idx)
            if (idx >= localGoals.length - 3 && hasMore && !loading) onLoadMore?.()
          }
        })
      },
      { root: container, threshold: [0.6] }
    )
    itemRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localGoals.length, hasMore, loading])

  async function handleLike(goal) {
    const isOwner = currentUserId && goal.user_id === currentUserId
    if (isOwner || goal.has_reacted || reactingId) return
    setReactingId(goal.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/goals/give-mana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ goalId: goal.id, amount: 1 }),
      })
      const json = await res.json()
      if (res.ok) {
        setLocalGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, has_reacted: true, believers_count: (g.believers_count || 0) + 1 } : g)))
        setPulseId(goal.id)
        setTimeout(() => setPulseId(null), 600)
        if (typeof json.manaBalance === 'number') window.dispatchEvent(new CustomEvent('mana-balance-updated', { detail: { balance: json.manaBalance } }))
        onReacted?.(goal.id)
      }
    } catch (_) {} finally { setReactingId(null) }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black">
      <button
        onClick={onClose}
        aria-label={lang === 'tr' ? 'Geri' : 'Back'}
        className="absolute top-7 left-3 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
      >
        <ChevronLeft size={18} />
      </button>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory [&::-webkit-scrollbar]:hidden"
        style={{ scrollBehavior: 'smooth' }}
      >
        {localGoals.map((goal, i) => {
          const isOwner = currentUserId && goal.user_id === currentUserId
          const ownerName = goal.owner?.display_name || goal.owner?.username || (lang === 'tr' ? 'Bilinmeyen' : 'Unknown')
          const isActive = i === activeIndex

          return (
            <div
              key={goal.id}
              ref={(el) => (itemRefs.current[i] = el)}
              data-index={i}
              className="relative h-full w-full snap-start snap-always flex items-center justify-center"
            >
              <div className={`relative w-full h-full max-w-[480px] mx-auto ${isActive ? 'reel-active' : ''}`}>
                {goal.cover_image_url ? (
                  <img src={goal.cover_image_url} alt={goal.title} className="absolute inset-0 w-full h-full object-cover" loading={i < 2 ? 'eager' : 'lazy'} />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-void-900 to-void-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />

                {/* Sahip + başlık + slayt destesine geçiş */}
                <button
                  onClick={() => (goal.slide_count > 0 ? onOpenSlides?.(goal) : onOpenGoal?.(goal))}
                  className="absolute left-4 right-20 bottom-24 text-left"
                >
                  <span className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 ring-2 ring-white/20">
                      {goal.owner?.avatar_url ? <img src={goal.owner.avatar_url} alt="" className="w-full h-full object-cover" /> : initialsOf(ownerName)}
                    </span>
                    <span className="text-white text-sm font-semibold drop-shadow-md">{ownerName}</span>
                  </span>
                  <span className="block text-white font-serif font-bold text-xl leading-snug drop-shadow-md line-clamp-2">{goal.title}</span>
                  {goal.slide_count > 1 && (
                    <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-white text-[10px] font-bold uppercase tracking-widest">
                      <Layers size={11} /> {goal.slide_count} {lang === 'tr' ? 'slayt' : 'slides'}
                    </span>
                  )}
                </button>

                {/* Aksiyon şeridi */}
                <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
                  <button
                    onClick={() => handleLike(goal)}
                    disabled={isOwner || goal.has_reacted}
                    className={`flex flex-col items-center gap-1 disabled:opacity-70 ${pulseId === goal.id ? 'pulse-ring rounded-full' : ''}`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center ${goal.has_reacted ? 'text-astral-gold' : 'text-white'}`}>
                      <Sparkles size={24} fill={goal.has_reacted ? 'currentColor' : 'none'} />
                    </span>
                    <span className="text-white text-[11px] font-semibold drop-shadow">{goal.believers_count || 0}</span>
                  </button>
                  <button onClick={() => onOpenGoal?.(goal)} className="flex flex-col items-center gap-1">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                      <MessageCircle size={24} />
                    </span>
                    <span className="text-white text-[11px] font-semibold drop-shadow">{goal.comments_count || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="h-full w-full snap-start flex items-center justify-center">
            <span className="text-slate-500 text-xs uppercase tracking-widest animate-pulse">...</span>
          </div>
        )}
      </div>
    </div>
  )
}
