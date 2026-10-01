// Oyunlaştırma arayüz parçaları — Android GameComponents.kt'nin web karşılığı.
import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  Moon, Flame, Eye, BookOpen, PenLine, Droplet, Users, MessageSquare, Megaphone, Heart, Archive,
  Lock, Check, Gift, Compass, Sprout, Flag, UserCircle, Award, Share2, Sparkles, UserPlus, ChevronRight, ListChecks,
} from 'lucide-react'
import {
  subscribe, getProgress, getEvents, consumeEvent, refresh, refreshIfStale, clearGame, installFetchHook,
  fetchPublicProgress, gameText, rankName, rankColor, badgeMeta, reasonLabel, rankProgress,
} from '@/lib/game'
import { supabase } from '@/lib/supabase'

export function useGameProgress() {
  return useSyncExternalStore(subscribe, getProgress, () => null)
}

function useGameEvents() {
  return useSyncExternalStore(subscribe, getEvents, () => [])
}

const BADGE_ICONS = {
  first_dream: Moon, streak_3: Flame, first_vision: Eye, first_diary: BookOpen, dreams_10: PenLine,
  streak_7: Flame, mana_giver_10: Droplet, friends_5: Users, comments_25: MessageSquare, quest_master: ListChecks,
  ambassador: Megaphone, likes_received_50: Heart, dreams_50: Archive, streak_30: Moon,
}

const REASON_ICONS = {
  dream_posted: Moon, diary_posted: BookOpen, vision_created: Eye, comment_posted: MessageSquare,
  comment_received: MessageSquare, like_given: Heart, like_received: Heart, mana_sent: Droplet, mana_given: Droplet,
  friend_made: UserPlus, referral_inviter: Megaphone, referral_joined: Megaphone, compass_checkin: Compass,
  seed_completed: Sprout, onboarding_completed: Flag, profile_completed: UserCircle, daily_quests_bonus: Gift,
  badge_earned: Award, content_shared: Share2,
}

const QUEST_ICONS = { post_dream: Moon, post_diary: BookOpen, comment_2: MessageSquare, like_3: Heart, mana_1: Droplet, compass: Compass }

export const reasonIcon = (reason) => REASON_ICONS[reason] || Sparkles

/** Rütbe amblemi: rütbe yükseldikçe ay evresi dolar (0 = ince hilal, 9 = dolunay). */
export function RankEmblem({ rank = 0, size = 48 }) {
  const maskId = useId().replace(/:/g, '')
  const color = rankColor(rank)
  const lit = (Math.min(9, Math.max(0, rank)) + 1) / 10
  const r = 40
  // Karanlık daire sağa kaydıkça aydınlık kısım büyür; lit=1'de tamamen dışarıda.
  const shadowCx = 50 - r * 0.35 + lit * 2 * r * 1.05
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <defs>
        <mask id={maskId}>
          <circle cx="50" cy="50" r={r} fill="white" />
          <circle cx={shadowCx} cy="50" r={r} fill="black" />
        </mask>
        <radialGradient id={`${maskId}g`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {rank >= 5 && <circle cx="50" cy="50" r="50" fill={`url(#${maskId}g)`} />}
      <circle cx="50" cy="50" r={r} fill="#0B1020" stroke={color} strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="50" cy="50" r={r} fill={color} mask={`url(#${maskId})`} />
    </svg>
  )
}

export function XpBar({ fraction, color, height = 8 }) {
  return (
    <div className="w-full rounded-full bg-white/10 overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(fraction * 100)}%`, background: color }} />
    </div>
  )
}

export function NextRankText({ p, lang }) {
  const t = gameText(lang)
  if (!p.next_rank_xp) return <p className="text-[11px] text-astral-gold">{t.maxRank}</p>
  return <p className="text-[11px] text-slate-400">{t.toNext(p.next_rank_xp - p.xp, rankName(lang, p.rank + 1))}</p>
}

export function BadgeIcon({ code, earned, size = 44 }) {
  const Icon = BADGE_ICONS[code]
  if (!Icon) return null
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full border shrink-0 ${
        earned ? 'border-astral-gold bg-gradient-to-br from-astral-gold/35 to-violet-500/35' : 'border-white/10 bg-white/5'
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.5} className={earned ? 'text-astral-gold' : 'text-white/25'} />
      {!earned && <Lock size={size * 0.3} className="absolute bottom-0 right-0 text-white/50" />}
    </span>
  )
}

function msUntilUtcMidnight() {
  return 86400000 - (Date.now() % 86400000)
}

function QuestResetCountdown({ lang }) {
  const [ms, setMs] = useState(msUntilUtcMidnight)
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilUtcMidnight()), 30000)
    return () => clearInterval(id)
  }, [])
  return <span className="text-[11px] text-slate-400">{gameText(lang).resets(Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60)}</span>
}

/** Günün görevleri + sandık. href verilirse kart Yolculuğum'a gider. */
export function DailyQuestsCard({ lang, href }) {
  const p = useGameProgress()
  const t = gameText(lang)
  if (!p) return null
  const body = (
    <div className="rounded-2xl border border-violet-500/35 bg-gradient-to-br from-violet-500/15 to-void-900 p-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <ListChecks size={18} className="text-astral-gold" />
        <h3 className="flex-1 text-sm font-bold text-white">{t.questsTitle}</h3>
        {!p.is_guest && <QuestResetCountdown lang={lang} />}
      </div>
      {p.is_guest ? (
        <>
          <p className="text-sm text-slate-400">{t.questsGuest}</p>
          <Link href="/auth" className="text-sm font-bold text-astral-gold">{t.signup}</Link>
        </>
      ) : (
        <>
          {(p.quests || []).map((q) => {
            const label = t.quests[q.code]
            if (!label) return null
            const done = q.progress >= q.target
            const Icon = done ? Check : QUEST_ICONS[q.code] || ListChecks
            return (
              <div key={q.code} className="flex items-center gap-2.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                  <Icon size={15} className={done ? 'text-emerald-400' : 'text-astral-gold'} />
                </span>
                <span className={`flex-1 text-[13px] ${done ? 'text-slate-400 line-through' : 'text-white'}`}>{label}</span>
                <span className="text-xs text-slate-400">{Math.min(q.progress, q.target)}/{q.target}</span>
                {/* xp eylem başınadır (xp_rules); görevin toplam ödülü = xp * target */}
                <span className="text-xs font-bold text-astral-gold">+{(q.xp || 0) * q.target} XP</span>
              </div>
            )
          })}
          <div className="flex items-center gap-2 pt-1">
            <Gift size={17} className={p.quests_bonus_claimed ? 'text-astral-gold' : 'text-slate-400'} />
            <span className={`text-xs ${p.quests_bonus_claimed ? 'text-astral-gold' : 'text-slate-400'}`}>
              {p.quests_bonus_claimed ? t.chestClaimed : t.chest(p.quests_bonus_xp || 0)}
            </span>
          </div>
        </>
      )}
    </div>
  )
  if (!href || p.is_guest) return body
  return <Link href={href} className="block hover:brightness-110 transition">{body}</Link>
}

/** Profil sayfasındaki özet: amblem + rütbe + XP çubuğu + kazanılan rozetler. */
export function JourneySummaryCard({ lang }) {
  const p = useGameProgress()
  if (!p || p.is_guest) return null
  const t = gameText(lang)
  const color = rankColor(p.rank)
  const earned = (p.badges || []).filter((b) => b.earned_at && badgeMeta(lang, b.code))
  return (
    <Link href="/journey" className="block rounded-2xl bg-void-900 p-4 space-y-3 border hover:brightness-110 transition" style={{ borderColor: `${color}73` }}>
      <div className="flex items-center gap-3">
        <RankEmblem rank={p.rank} size={56} />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="truncate font-serif text-base font-bold" style={{ color }}>{rankName(lang, p.rank)}</p>
          <p className="text-xs text-slate-400">{t.level(p.rank + 1, p.xp)}</p>
          <XpBar fraction={rankProgress(p)} color={color} />
          <NextRankText p={p} lang={lang} />
        </div>
        <ChevronRight size={20} className="text-slate-400" />
      </div>
      {earned.length > 0 && (
        <div className="flex items-center gap-2">
          {earned.slice(0, 6).map((b) => <BadgeIcon key={b.code} code={b.code} earned size={30} />)}
          {earned.length > 6 && <span className="text-xs text-slate-400">+{earned.length - 6}</span>}
        </div>
      )}
    </Link>
  )
}

/** Başkasının profilinde rütbe hapı + rozetler; görünürlük izin vermezse hiçbir şey çizmez. */
export function PublicRankRow({ userId, lang }) {
  const [p, setP] = useState(null)
  useEffect(() => {
    if (!userId) return
    let active = true
    fetchPublicProgress(userId).then((res) => { if (active) setP(res) })
    return () => { active = false }
  }, [userId])
  if (!p) return null
  const color = rankColor(p.rank)
  const badges = (p.badges || []).filter((c) => badgeMeta(lang, c))
  return (
    <div className="flex flex-col items-center gap-1.5 my-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-3" style={{ background: `${color}1F`, borderColor: `${color}80` }}>
        <RankEmblem rank={p.rank} size={22} />
        <span className="text-xs font-bold" style={{ color }}>{rankName(lang, p.rank)}</span>
        <span className="text-xs text-slate-400">· {p.xp} XP</span>
      </span>
      {badges.length > 0 && (
        <div className="flex gap-1.5">
          {badges.slice(-8).map((c) => <BadgeIcon key={c} code={c} earned size={26} />)}
        </div>
      )}
    </div>
  )
}

function Celebration({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-xs rounded-3xl border border-astral-gold/40 bg-void-900 p-6 text-center shadow-astral-glow" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function XpToast({ event, lang, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2600)
    return () => clearTimeout(id)
  }, [onDone])
  const Icon = reasonIcon(event.reason)
  return (
    <div className="fixed left-1/2 top-20 z-[90] -translate-x-1/2" role="status">
      <div className="flex items-center gap-2 rounded-full border border-astral-gold/50 bg-void-900/95 px-4 py-2 shadow-astral-glow">
        <Icon size={16} className="text-astral-gold" />
        <span className="text-sm font-bold text-astral-gold">+{event.amount} XP</span>
        {event.reason && <span className="text-xs text-slate-300">{reasonLabel(lang, event.reason)}</span>}
      </div>
    </div>
  )
}

/**
 * _app.js'te bir kez çizilir: oturumu izler, ilerlemeyi tazeler ve
 * kuyruktaki kutlamaları (+XP, rozet, rütbe) sırayla gösterir.
 */
export function GameEventHost({ lang }) {
  const events = useGameEvents()
  const t = gameText(lang)

  useEffect(() => {
    installFetchHook()
    refresh()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') clearGame()
      else if (evt === 'SIGNED_IN' || evt === 'USER_UPDATED') refresh()
    })
    const onVisible = () => { if (document.visibilityState === 'visible') refreshIfStale() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      subscription?.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const head = events[0]
  if (!head) return null
  const done = () => consumeEvent(head.id)

  if (head.type === 'xp') return <XpToast key={head.id} event={head} lang={lang} onDone={done} />
  if (head.type === 'badge') {
    const meta = badgeMeta(lang, head.code)
    if (!meta) { setTimeout(done, 0); return null }
    return (
      <Celebration onClose={done}>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-astral-gold">{t.badgeTitle}</p>
        <div className="mb-3 flex justify-center"><BadgeIcon code={head.code} earned size={72} /></div>
        <p className="font-serif text-lg font-bold text-white">{meta.name}</p>
        <p className="mt-1 text-sm text-slate-400">{meta.desc}</p>
        <button onClick={done} className="mt-5 w-full rounded-full bg-astral-gold py-2 text-sm font-bold text-void-950">{t.badgeCta}</button>
      </Celebration>
    )
  }
  return (
    <Celebration onClose={done}>
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-astral-gold">{t.rankUpTitle}</p>
      <div className="mb-3 flex justify-center"><RankEmblem rank={head.rank} size={88} /></div>
      <p className="font-serif text-lg font-bold" style={{ color: rankColor(head.rank) }}>{t.rankUpBody(rankName(lang, head.rank))}</p>
      <button onClick={done} className="mt-5 w-full rounded-full bg-astral-gold py-2 text-sm font-bold text-void-950">{t.rankUpCta}</button>
    </Celebration>
  )
}
