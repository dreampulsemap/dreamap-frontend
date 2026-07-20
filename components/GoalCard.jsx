import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'

export default function GoalCard({ goal, lang = 'en', currentUserId, onReacted, onOpenGoal }) {
  const t = getVisionBoardText(lang)
  const [flipped, setFlipped] = useState(false)
  const [reacting, setReacting] = useState(false)
  const [hasReacted, setHasReacted] = useState(!!goal.has_reacted)
  const [believersCount, setBelieversCount] = useState(goal.believers_count || 0)
  const [errorMsg, setErrorMsg] = useState('')
  const [justReacted, setJustReacted] = useState(false)

  const isOwner = currentUserId && goal.user_id === currentUserId

  useEffect(() => {
    setHasReacted(!!goal.has_reacted)
    setBelieversCount(goal.believers_count || 0)
  }, [goal.id, goal.has_reacted, goal.believers_count])

  const statusLabel = useMemo(() => {
    if (goal.status === 'completed') return t.statusCompleted
    if (goal.status === 'abandoned') return t.statusAbandoned
    return t.statusActive
  }, [goal.status, t])

  const statusColor = goal.status === 'completed'
    ? 'bg-emerald-500/90 text-black'
    : goal.status === 'abandoned'
    ? 'bg-slate-500/90 text-white'
    : 'bg-fuchsia-500/90 text-white'

  async function handleGiveMana(e) {
    e.stopPropagation()
    if (isOwner) {
      setErrorMsg(t.cannotReactOwn)
      setTimeout(() => setErrorMsg(''), 2500)
      return
    }
    if (hasReacted || reacting) return

    setReacting(true)
    setErrorMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErrorMsg(t.loginRequired)
        return
      }

      const res = await fetch('/api/goals/give-mana', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ goalId: goal.id, amount: 1 }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.error === 'insufficient_mana') setErrorMsg(t.insufficientMana)
        else if (json.error === 'cannot_react_to_own_goal') setErrorMsg(t.cannotReactOwn)
        else if (json.error === 'already_reacted') setHasReacted(true)
        else setErrorMsg(json.error || 'error')
        return
      }

      setHasReacted(true)
      setBelieversCount((c) => c + 1)
      setJustReacted(true)
      setTimeout(() => setJustReacted(false), 700)
      if (typeof json.manaBalance === 'number') {
        window.dispatchEvent(new CustomEvent('mana-balance-updated', { detail: { balance: json.manaBalance } }))
      }
      onReacted?.(json.manaBalance)
    } catch (err) {
      setErrorMsg('network_error')
    } finally {
      setReacting(false)
    }
  }

  return (
    <div className="flip-perspective w-full aspect-[3/4]">
      <div
        className={`flip-card-inner cursor-pointer ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
      >
        {/* ÖN YÜZ */}
        <div className="flip-face glass-card overflow-hidden rounded-2xl relative">
          {goal.cover_image_url ? (
            goal.cover_image_source === 'pinterest' ? (
              // Pinterest kaynaklı görseller keyfi/bilinmeyen domainlerden gelir —
              // next/image sabit bir whitelist gerektirir, bilinmeyen domain
              // gelirse production'da hata fırlatır. Bu yüzden bilinçli olarak
              // ham <img> kullanıyoruz (next.config.js'deki remotePatterns'ı
              // Pinterest'in tüm olası domainlerine genişletmek güvenli değil).
              <img
                src={goal.cover_image_url}
                alt={goal.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              // user_upload (Supabase Storage) ve ai_generated (Replicate/DALL-E)
              // bilinen, whitelist'lenmiş domainlerden gelir — next/image güvenle
              // kullanılabilir (otomatik boyutlandırma, lazy-load, WebP/AVIF).
              <Image
                src={goal.cover_image_url}
                alt={goal.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/60 via-purple-900/60 to-black" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

          <span className={`absolute top-3 left-3 text-label px-2.5 py-1 rounded-pill ${statusColor}`}>
            {statusLabel}
          </span>
          {isOwner && (
            <span className="absolute top-3 right-3 text-label px-2.5 py-1 rounded-pill bg-white/10 text-white/80 backdrop-blur">
              {t.ownGoalBadge}
            </span>
          )}

          <div className="absolute bottom-0 inset-x-0 p-4">
            <h3 className="text-h3 text-white line-clamp-3 drop-shadow-lg">
              {goal.title}
            </h3>
            <div className="mt-2 h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-400 to-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(goal.completion_percentage || 0, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ARKA YÜZ */}
        <div className="flip-face flip-face-back glass-card rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-white font-bold text-base line-clamp-2 mb-3">{goal.title}</h4>
            {goal.description && (
              <p className="text-slate-300 text-sm line-clamp-4 mb-4">{goal.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className={`flex items-center gap-1 transition-transform duration-300 ${justReacted ? 'scale-125 text-cyan-300' : ''}`}>
                <Sparkles size={12} /> {believersCount} {t.believers}
              </span>
              <span>💬 {goal.comments_count || 0} {t.comments}</span>
            </div>
            <div className="mt-2 text-xs text-cyan-300 font-mono">
              {Math.round(goal.completion_percentage || 0)}% {t.completion}
            </div>
          </div>

          <div>
            {errorMsg && <p className="text-rose-400 text-[11px] mb-2">{errorMsg}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleGiveMana}
                disabled={reacting || hasReacted || isOwner || goal.status !== 'active'}
                className={`flex-1 text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300 ${
                  justReacted ? 'scale-105 shadow-lg shadow-fuchsia-500/40' : ''
                } ${
                  hasReacted
                    ? 'bg-white/10 text-slate-400 cursor-default'
                    : 'bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white hover:opacity-90 disabled:opacity-40'
                }`}
              >
                {hasReacted ? (<span className="flex items-center justify-center gap-1.5"><Check size={14} /> {t.manaGiven}</span>) : (<span className="flex items-center justify-center gap-1.5"><Sparkles size={14} /> {t.giveMana}</span>)}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenGoal?.(goal) }}
                aria-label={lang === 'tr' ? 'Hedef detayını aç' : 'Open goal details'}
                className="px-4 text-xs font-bold uppercase tracking-widest py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
