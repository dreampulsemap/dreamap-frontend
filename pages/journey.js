// "Yolculuğum" — XP, rütbe, günlük görevler, rozetler, sıralama.
// Android JourneyScreen.kt'nin web karşılığı.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import Seo from '@/components/Seo'
import {
  useGameProgress, RankEmblem, XpBar, NextRankText, BadgeIcon, DailyQuestsCard, reasonIcon,
} from '@/components/game/GameUI'
import {
  refresh, fetchLeaderboard, gameText, rankName, rankColor, badgeMeta, reasonLabel, rankProgress,
} from '@/lib/game'

function relativeTime(iso, lang) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  if (diff < 60) return rtf.format(-Math.round(diff), 'second')
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  return rtf.format(-Math.round(diff / 86400), 'day')
}

function SectionTitle({ children, trailing }) {
  return (
    <div className="flex items-baseline justify-between pt-2">
      <h2 className="font-serif text-lg font-bold text-white">{children}</h2>
      {trailing && <span className="text-xs text-slate-400">{trailing}</span>}
    </div>
  )
}

export default function JourneyPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const t = gameText(lang)

  const p = useGameProgress()
  const [loaded, setLoaded] = useState(false)
  const [period, setPeriod] = useState('week')
  const [board, setBoard] = useState({ state: 'loading', data: [] })
  const [selectedBadge, setSelectedBadge] = useState(null)

  useEffect(() => { refresh().finally(() => setLoaded(true)) }, [])

  const loadBoard = useCallback(async (which) => {
    setBoard({ state: 'loading', data: [] })
    try {
      setBoard({ state: 'ok', data: await fetchLeaderboard(which) })
    } catch {
      setBoard({ state: 'error', data: [] })
    }
  }, [])

  // Sıralama yalnızca oturum açıkken okunabiliyor (RPC anon'a kapalı).
  useEffect(() => { if (p) loadBoard(period) }, [period, loadBoard, !!p]) // eslint-disable-line react-hooks/exhaustive-deps

  const isGuest = !p || p.is_guest
  const known = (p?.badges || []).filter((b) => badgeMeta(lang, b.code))
  const selectedMeta = selectedBadge && badgeMeta(lang, selectedBadge.code)

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 space-y-4">
      <Seo title={t.title} noindex lang={lang} />
      <h1 className="font-serif text-3xl font-bold text-white">{t.title}</h1>

      {!loaded && !p ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-astral-gold" size={28} /></div>
      ) : isGuest ? (
        <div className="rounded-2xl border border-white/10 bg-void-900 p-6 text-center space-y-3">
          <div className="flex justify-center"><RankEmblem rank={0} size={64} /></div>
          <h2 className="font-serif text-xl font-bold text-white">{t.guestTitle}</h2>
          <p className="text-sm text-slate-400">{t.guestBody}</p>
          <Link href="/auth" className="inline-block rounded-full bg-astral-gold px-5 py-2 text-sm font-bold text-void-950">{t.signup}</Link>
        </div>
      ) : (
        <>
          {/* Rütbe kahramanı */}
          <div className="rounded-3xl border bg-void-900 p-5 text-center space-y-2" style={{ borderColor: `${rankColor(p.rank)}80` }}>
            <div className="flex justify-center"><RankEmblem rank={p.rank} size={96} /></div>
            <p className="font-serif text-2xl font-bold" style={{ color: rankColor(p.rank) }}>{rankName(lang, p.rank)}</p>
            <p className="text-sm text-slate-400">{t.level(p.rank + 1, p.xp)}</p>
            <XpBar fraction={rankProgress(p)} color={rankColor(p.rank)} height={10} />
            <NextRankText p={p} lang={lang} />
            <p className="text-xs text-astral-gold">{t.todayWeek(p.today_xp || 0, p.weekly_xp || 0)}</p>
          </div>

          <DailyQuestsCard lang={lang} />

          <SectionTitle trailing={t.badgesCount(known.filter((b) => b.earned_at).length, known.length)}>{t.badgesTitle}</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {known.map((b) => (
              <button
                key={b.code}
                onClick={() => setSelectedBadge(b)}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.03] p-2 hover:bg-white/[0.06]"
              >
                <BadgeIcon code={b.code} earned={!!b.earned_at} size={44} />
                <span className={`text-center text-[11px] leading-tight ${b.earned_at ? 'text-white' : 'text-slate-500'}`}>
                  {badgeMeta(lang, b.code).name}
                </span>
              </button>
            ))}
          </div>

          <SectionTitle>{t.lbTitle}</SectionTitle>
          <div className="inline-flex rounded-full bg-white/5 p-1">
            {[['week', t.lbWeek], ['all', t.lbAll]].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold ${period === key ? 'bg-astral-gold text-void-950' : 'text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {board.state === 'loading' && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-astral-gold" size={24} /></div>}
          {board.state === 'error' && (
            <div className="text-center text-sm text-slate-400">
              {t.lbError} <button onClick={() => loadBoard(period)} className="font-bold text-astral-gold">{t.retry}</button>
            </div>
          )}
          {board.state === 'ok' && board.data.length === 0 && <p className="text-sm text-slate-400">{t.lbEmpty}</p>}
          {board.state === 'ok' && board.data.length > 0 && (
            <ol className="space-y-1.5">
              {board.data.map((e) => (
                <li key={e.user_id}>
                  <button
                    onClick={() => router.push(e.is_me ? '/profile' : `/u/${e.user_id}`)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${e.is_me ? 'border border-astral-gold/50 bg-astral-gold/10' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}
                  >
                    <span className={`w-6 text-center text-sm font-bold ${e.pos <= 3 ? 'text-astral-gold' : 'text-slate-400'}`}>{e.pos}</span>
                    {e.avatar_url ? (
                      <img src={e.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                        {(e.display_name || e.username || '?').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm text-white">{e.is_me ? t.lbYou : e.display_name || e.username || '—'}</span>
                      <span className="block truncate text-[11px]" style={{ color: rankColor(e.rank) }}>{rankName(lang, e.rank)}</span>
                    </span>
                    <span className="text-sm font-bold text-astral-gold">{e.xp} XP</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      {p?.rules?.length > 0 && (
        <>
          <SectionTitle>{t.howTitle}</SectionTitle>
          <ul className="space-y-2">
            {[...p.rules].sort((a, b) => b.xp - a.xp).map((rule) => {
              const Icon = reasonIcon(rule.reason)
              const sub = rule.reason === 'mana_given' ? t.rulePerMana : rule.daily_cap != null ? t.ruleCap(rule.daily_cap) : null
              return (
                <li key={rule.reason} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-void-900"><Icon size={15} className="text-astral-gold" /></span>
                  <span className="flex-1">
                    <span className="block text-[13px] text-white">{reasonLabel(lang, rule.reason)}</span>
                    {sub && <span className="block text-[11px] text-slate-400">{sub}</span>}
                  </span>
                  <span className="text-[13px] font-bold text-astral-gold">+{rule.xp} XP</span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {p?.thresholds?.length > 0 && (
        <>
          <SectionTitle>{t.ranksTitle}</SectionTitle>
          <ul className="space-y-1">
            {p.thresholds.map((thr, i) => {
              const current = !isGuest && p.rank === i
              const reached = !isGuest && p.rank >= i
              const color = rankColor(i)
              return (
                <li
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl border px-2 py-1.5"
                  style={{ background: current ? `${color}24` : 'transparent', borderColor: current ? `${color}99` : 'transparent' }}
                >
                  <RankEmblem rank={i} size={reached ? 36 : 32} />
                  <span className="flex-1">
                    <span className={`block text-sm ${current ? 'font-bold' : ''}`} style={{ color: reached ? color : 'rgba(148,163,184,0.6)' }}>{rankName(lang, i)}</span>
                    <span className="block text-[11px] text-slate-400">{t.rankFrom(thr)}</span>
                  </span>
                  {current && <span className="text-[11px] font-bold" style={{ color }}>{t.rankCurrent}</span>}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {!isGuest && (
        <>
          <SectionTitle>{t.recentTitle}</SectionTitle>
          {(p.recent || []).length === 0 ? (
            <p className="text-sm text-slate-400">{t.recentEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {p.recent.map((ev, i) => {
                const Icon = reasonIcon(ev.reason)
                const badgeName = ev.badge && badgeMeta(lang, ev.badge)?.name
                return (
                  <li key={`${ev.created_at}_${i}`} className="flex items-center gap-2.5">
                    <Icon size={15} className="text-slate-400" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[13px] text-white">{badgeName || reasonLabel(lang, ev.reason)}</span>
                      <span className="block text-[11px] text-slate-400">{relativeTime(ev.created_at, lang)}</span>
                    </span>
                    <span className={`text-[13px] font-bold ${ev.delta >= 0 ? 'text-astral-gold' : 'text-slate-400'}`}>
                      {ev.delta >= 0 ? '+' : ''}{ev.delta} XP
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {selectedMeta && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedBadge(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-void-900 p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-center"><BadgeIcon code={selectedBadge.code} earned={!!selectedBadge.earned_at} size={64} /></div>
            <p className="font-bold text-white">{selectedMeta.name}</p>
            <p className="mt-1 text-sm text-slate-400">{selectedMeta.desc}</p>
            <p className={`mt-2 text-[13px] font-bold ${selectedBadge.earned_at ? 'text-astral-gold' : 'text-slate-400'}`}>
              {selectedBadge.earned_at ? t.badgeEarned : t.badgeLocked} · +{selectedBadge.xp} XP
            </p>
            <button onClick={() => setSelectedBadge(null)} className="mt-4 text-sm font-bold text-astral-gold">{t.badgeCta}</button>
          </div>
        </div>
      )}
    </main>
  )
}
