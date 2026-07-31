import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { Check, MessageCircle, Sparkles, Sprout, Zap, Heart, Compass } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { getGoalTheme } from '@/lib/goalTheme'

// Tema anahtarına göre "sembol" ikonu — kart temanın ne hakkında olduğunu
// bilinçaltı düzeyde hissettirsin diye (bkz. lib/goalTheme.js).
const THEME_ICON = { sprout: Sprout, zap: Zap, heart: Heart, compass: Compass, sparkles: Sparkles }

export default function GoalCard({ goal, lang = 'en', currentUserId, onReacted, onOpenGoal }) {
  const t = getVisionBoardText(lang)
  const [flipped, setFlipped] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [hasReacted, setHasReacted] = useState(!!goal.has_reacted)
  const [believersCount, setBelieversCount] = useState(goal.believers_count || 0)

  const isOwner = currentUserId && goal.user_id === currentUserId
  useEffect(() => { setHasReacted(!!goal.has_reacted); setBelieversCount(goal.believers_count || 0) }, [goal.id, goal.has_reacted, goal.believers_count])

  const theme = useMemo(() => getGoalTheme(goal.title, goal.description), [goal.title, goal.description])
  const ThemeIcon = THEME_ICON[theme.icon] || Sparkles

  const statusLabel = goal.status === 'completed' ? t.statusCompleted : goal.status === 'abandoned' ? t.statusAbandoned : t.statusActive

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

        {/* ÖN YÜZ — bilişsel kolaylık: tek odak noktası (görsel), minimal metin,
            durum sadece "aktif değilse" görünür (varsayılan durumda gürültü yok) */}
        <div
          className="flip-face satin-sheen cursor-pointer glass-card overflow-hidden relative group"
          style={{ borderRadius: theme.radius, boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 40px ${theme.ring}, inset 0 1px 1px rgba(255,255,255,0.12)` }}
          onClick={() => onOpenGoal?.(goal)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setFlipped(f => !f) }}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-void-950/60 backdrop-blur flex items-center justify-center transition-all border border-white/10 hover:scale-110"
            style={{ color: theme.accentFrom }}
          >
            <ThemeIcon size={14} />
          </button>

          {goal.cover_image_url ? (
            goal.cover_image_source === 'pinterest' ? (
              <img src={goal.cover_image_url} alt={goal.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            ) : (
              <Image src={goal.cover_image_url} alt={goal.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
            )
          ) : <div className="absolute inset-0 bg-gradient-to-br from-void-900 to-void-950" />}

          <div className="absolute inset-0 bg-gradient-to-t from-void-950 via-void-950/25 to-transparent" />

          {goal.status !== 'active' && (
            <span className="absolute top-3 left-3 z-[2] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-pill bg-void-950/70 backdrop-blur text-slate-200 border border-white/10">
              {statusLabel}
            </span>
          )}

          <div className="absolute bottom-0 inset-x-0 p-5 pt-10">
            <h3 className="text-lg font-serif font-bold text-white line-clamp-2 drop-shadow-md">{goal.title}</h3>
            <div className="mt-3.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${goal.completion_percentage || 0}%`, background: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})` }}
              />
            </div>
          </div>
        </div>

        {/* ARKA YÜZ — daha geniş negatif alan, netleştirilmiş hiyerarşi */}
        <div
          className="flip-face flip-face-back glass-card p-6 flex flex-col justify-between border bg-void-900"
          style={{ borderRadius: theme.radius, borderColor: `${theme.ring}` }}
        >
          <button onClick={() => setFlipped(false)} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center text-xs">✕</button>
          <div>
            <h4 className="text-white font-serif font-bold text-lg line-clamp-2 mb-3">{goal.title}</h4>
            {goal.description && <p className="text-slate-300 text-xs leading-relaxed line-clamp-4 mb-5">{goal.description}</p>}
            <div className="flex items-center gap-4 text-xs text-slate-400 font-sans">
              <span className="flex items-center gap-1"><Sparkles size={13} style={{ color: theme.accentFrom }} /> {believersCount}</span>
              <span className="flex items-center gap-1"><MessageCircle size={13} /> {goal.comments_count || 0}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGiveMana}
              disabled={reacting || hasReacted || isOwner || goal.status !== 'active'}
              className="flex-1 text-[11px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all"
              style={hasReacted
                ? { background: 'rgba(255,255,255,0.06)', color: 'rgb(100,116,139)' }
                : { background: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})`, color: '#04060E' }}
            >
              {hasReacted ? <span className="flex justify-center gap-1"><Check size={14}/> {t.manaGiven}</span> : <span className="flex justify-center gap-1"><Sparkles size={14}/> {t.giveMana}</span>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onOpenGoal?.(goal) }} className="px-3.5 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10">→</button>
          </div>
        </div>

      </div>
    </div>
  )
}
