import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { Check, MessageCircle, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'

export default function GoalCard({ goal, lang = 'en', currentUserId, onReacted, onOpenGoal }) {
  const t = getVisionBoardText(lang)
  const [flipped, setFlipped] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [hasReacted, setHasReacted] = useState(!!goal.has_reacted)
  const [believersCount, setBelieversCount] = useState(goal.believers_count || 0)

  const isOwner = currentUserId && goal.user_id === currentUserId
  useEffect(() => { setHasReacted(!!goal.has_reacted); setBelieversCount(goal.believers_count || 0) }, [goal.id, goal.has_reacted, goal.believers_count])

  const statusLabel = goal.status === 'completed' ? t.statusCompleted : goal.status === 'abandoned' ? t.statusAbandoned : t.statusActive
  const statusColor = goal.status === 'completed' ? 'bg-emerald-400 text-void-950' : goal.status === 'abandoned' ? 'bg-slate-500 text-white' : 'bg-astral-gold text-void-950'

  async function handleGiveMana(e) {
    e.stopPropagation()
    if (isOwner || hasReacted || reacting) return
    setReacting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/goals/give-mana', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ goalId: goal.id, amount: 1 }) })
      const json = await res.json()
      if (res.ok) {
        setHasReacted(true); setBelieversCount(c => c + 1)
        if (typeof json.manaBalance === 'number') window.dispatchEvent(new CustomEvent('mana-balance-updated', { detail: { balance: json.manaBalance } }))
        onReacted?.(json.manaBalance)
      }
    } catch (err) {} finally { setReacting(false) }
  }

  return (
    <div className="flip-perspective w-full aspect-[3/4]">
      <div className={`flip-card-inner ${flipped ? 'is-flipped' : ''}`}>
        
        {/* ÖN YÜZ */}
        <div className="flip-face cursor-pointer glass-card overflow-hidden rounded-card relative group" onClick={() => onOpenGoal?.(goal)}>
          <button onClick={(e) => { e.stopPropagation(); setFlipped(f => !f) }} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-void-950/60 backdrop-blur text-astral-gold hover:scale-110 flex items-center justify-center text-xs transition-all border border-white/10"><Sparkles size={14} /></button>
          
          {goal.cover_image_url ? (
            goal.cover_image_source === 'pinterest' ? (
              <img src={goal.cover_image_url} alt={goal.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            ) : (
              <Image src={goal.cover_image_url} alt={goal.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            )
          ) : <div className="absolute inset-0 bg-gradient-to-br from-void-900 to-void-950" />}
          
          <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/30 to-transparent" />
          <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-pill ${statusColor}`}>{statusLabel}</span>

          <div className="absolute bottom-0 inset-x-0 p-5">
            <h3 className="text-lg font-serif font-bold text-white line-clamp-2 drop-shadow-md">{goal.title}</h3>
            <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-astral-gold to-aether-cyan transition-all duration-500" style={{ width: `${goal.completion_percentage || 0}%` }} />
            </div>
          </div>
        </div>

        {/* ARKA YÜZ */}
        <div className="flip-face flip-face-back glass-card rounded-card p-6 flex flex-col justify-between border border-astral-gold/20 bg-void-900">
          <button onClick={() => setFlipped(false)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-xs">✕</button>
          <div>
            <h4 className="text-white font-serif font-bold text-lg line-clamp-2 mb-2">{goal.title}</h4>
            {goal.description && <p className="text-slate-300 text-xs leading-relaxed line-clamp-4 mb-4">{goal.description}</p>}
            <div className="flex items-center gap-4 text-xs text-slate-400 font-sans">
              <span className="flex items-center gap-1"><Sparkles size={13} className="text-astral-gold" /> {believersCount}</span>
              <span className="flex items-center gap-1"><MessageCircle size={13} /> {goal.comments_count || 0}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleGiveMana} disabled={reacting || hasReacted || isOwner || goal.status !== 'active'} className={`flex-1 text-[11px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all ${hasReacted ? 'bg-white/10 text-slate-500' : 'bg-astral-gold text-void-950 hover:brightness-110 shadow-astral-glow'}`}>
              {hasReacted ? <span className="flex justify-center gap-1"><Check size={14}/> {t.manaGiven}</span> : <span className="flex justify-center gap-1"><Sparkles size={14}/> {t.giveMana}</span>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onOpenGoal?.(goal) }} className="px-3.5 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">→</button>
          </div>
        </div>

      </div>
    </div>
  )
}