// Android HomeScreen.kt DreamFeedCard'ının web karşılığı: 4 sayfalı (görsel, metin,
// sade dille, AI analizi) 4:5 kaydırmalı kart + beğeni/yorum/paylaş/Detay satırı.
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Heart, MessageSquare, Share2, Sparkles } from 'lucide-react'
import ShareSheet from '@/components/ShareSheet'

const TEXT = {
  tr: {
    slides: ['Rüya Görseli', 'Rüya Metni', 'Sade Dille', 'AI Analizi'], detail: 'Detay →', unknown: 'Bilinmeyen',
    simpleHeading: 'Basitçe ne anlama geliyor?', simpleEmpty: 'Sade dille özet henüz hazır değil. Rüya analizi tamamlandığında burada görünecek.',
    sentiment: (s) => `Duygu: ${s}`, archetypes: 'Arketipler', share: 'Paylaş',
    visibility: { public: 'Herkese Açık', friends: 'Sadece Arkadaşlar', private: 'Gizli' },
  },
  en: {
    slides: ['Dream Image', 'Dream Text', 'In Plain Words', 'AI Analysis'], detail: 'Detail →', unknown: 'Unknown',
    simpleHeading: 'Simply: what does it mean?', simpleEmpty: 'The plain-language summary isn’t ready yet. It appears once the dream analysis finishes.',
    sentiment: (s) => `Emotion: ${s}`, archetypes: 'Archetypes', share: 'Share',
    visibility: { public: 'Public', friends: 'Friends only', private: 'Private' },
  },
}

const pick = (map, lang) => (map && typeof map === 'object' ? map[lang] || map.en || '' : typeof map === 'string' ? map : '')

export function Chip({ text, selected = false }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full border-[0.5px] px-2.5 py-1 text-[11px] font-medium ${selected ? 'border-astral-gold/40 bg-astral-gold/15 text-astral-gold' : 'border-white/10 bg-void-800 text-slate-400'}`}>
      {text}
    </span>
  )
}

export function FeedOwnerHeader({ owner, date, badge, lang, currentUserId }) {
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']
  const name = owner?.display_name || owner?.username || t.unknown
  let dateText = ''
  if (date) {
    const d = new Date(date)
    dateText = Number.isNaN(d.getTime()) ? String(date).slice(0, 10) : d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const inner = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-void-800">
        {owner?.avatar_url ? <img src={owner.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-astral-gold">{name.slice(0, 1).toUpperCase()}</span>}
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-semibold text-white">{name}</span>
        {dateText && <span className="text-[11px] text-slate-400">{dateText}</span>}
      </span>
    </span>
  )
  return (
    <div className="flex items-center justify-between">
      {owner?.id ? <Link href={owner.id === currentUserId ? '/profile' : `/u/${owner.id}`} onClick={(e) => e.stopPropagation()}>{inner}</Link> : inner}
      {badge && (
        <span className="rounded-full border-[0.5px] border-white/15 bg-void-800 px-2.5 py-1 text-[9px] font-semibold tracking-[0.8px] text-white/85">
          {badge.toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-US')}
        </span>
      )}
    </div>
  )
}

export default function DreamFeedCard({ dream, lang = 'en', onOpen, liked = false, likesCount, onToggleLike, currentUserId }) {
  const L = lang === 'tr' ? 'tr' : 'en'
  const t = TEXT[L]
  const [page, setPage] = useState(0)
  const [share, setShare] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const scroller = useRef(null)

  const analysis = dream.ai_jungian_analysis || {}
  const displayTitle = dream.ai_title?.trim() || String(dream.content || '').slice(0, 60)
  const archetypes = (Array.isArray(analysis.archetypes) && analysis.archetypes.length ? analysis.archetypes : dream.ai_archetypes) || []
  const emotions = dream.user_selected_sentiment ? dream.user_selected_sentiment.split(',').map((s) => s.trim()).filter(Boolean) : []
  const simple = pick(analysis.simple, L)
  const canShare = dream.visibility === 'public' || (currentUserId && dream.user_id === currentUserId)
  const open = () => onOpen?.(dream)

  function onScroll() {
    const el = scroller.current
    if (el) setPage(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <article className="rounded-[20px] border border-white/[0.08] bg-void-900 p-4">
      <div className="flex flex-col gap-2.5">
        <FeedOwnerHeader owner={dream.owner || (dream.user_id ? { id: dream.user_id } : null)} date={dream.dream_date || dream.created_at} badge={t.visibility[dream.visibility] || dream.visibility} lang={L} currentUserId={currentUserId} />

        <p className="pl-0.5 font-mono text-[11px] font-medium text-slate-400">{t.slides[page]} ({page + 1}/4)</p>

        <div ref={scroller} onScroll={onScroll} className="flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* 1: Görsel */}
          <div className="h-full w-full shrink-0 snap-center">
            <button onClick={open} className="relative h-full w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-void-800 text-left">
              {dream.ai_image_url && !imgFailed ? (
                <img src={dream.ai_image_url} alt={displayTitle} className="absolute inset-0 h-full w-full object-cover" onError={() => setImgFailed(true)} loading="lazy" />
              ) : (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-astral-gold/[0.18] via-aether-violet/[0.28] to-void-800">
                  <Sparkles size={40} className="text-astral-gold/70" fill="currentColor" />
                  <span className="mt-2.5 text-[11px] font-bold tracking-[2px] text-astral-gold/60">LUNOSFER</span>
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-b from-transparent via-void-950/75 to-void-950/95 p-3.5">
                <span className="line-clamp-2 font-serif text-base font-bold text-astral-gold">{displayTitle}</span>
                {archetypes.length > 0 && (
                  <span className="flex gap-1.5 overflow-hidden">{archetypes.map((a) => <Chip key={a} text={a} selected />)}</span>
                )}
              </span>
            </button>
          </div>

          {/* 2: Metin */}
          <div className="h-full w-full shrink-0 snap-center">
            <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-2xl border border-white/[0.08] bg-void-800 p-4">
              <p className="flex items-center gap-2"><span className="text-base">📖</span><span className="font-serif text-base font-bold text-astral-gold">{t.slides[1]}</span></p>
              {dream.ai_title && <p className="font-serif text-sm font-semibold text-astral-gold">{dream.ai_title}</p>}
              <p className="whitespace-pre-line text-sm leading-[22px] text-slate-200">{dream.content}</p>
              {emotions.length > 0 && <div className="flex gap-1.5 overflow-x-auto">{emotions.map((e) => <Chip key={e} text={e} />)}</div>}
            </div>
          </div>

          {/* 3: Sade dille */}
          <div className="h-full w-full shrink-0 snap-center">
            <div className="flex h-full flex-col gap-2.5 overflow-y-auto rounded-2xl border border-aether-cyan/30 bg-void-800 p-4">
              <p className="flex items-center gap-1.5"><span className="text-base">💬</span><span className="text-[13px] font-bold tracking-[0.5px] text-aether-cyan">{t.simpleHeading}</span></p>
              <p className={`text-[13px] leading-[21px] ${simple ? 'text-slate-200' : 'text-slate-400'}`}>{simple || t.simpleEmpty}</p>
            </div>
          </div>

          {/* 4: AI analizi */}
          <div className="h-full w-full shrink-0 snap-center">
            <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-2xl border border-aether-violet/35 bg-void-800 p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5"><span className="text-base">✨</span><span className="text-[13px] font-bold tracking-[0.5px] text-astral-gold">{t.slides[3]}</span></p>
                <span className="rounded-full border-[0.5px] border-aether-violet/40 bg-aether-violet/20 px-2 py-[3px] text-[9px] font-bold tracking-[1px] text-astral-gold">AI JUNG</span>
              </div>
              <p className="font-serif text-base font-bold text-white">{pick(analysis.title, L) || displayTitle}</p>
              {pick(analysis.summary, L) && <p className="text-[13px] leading-[22px] text-slate-200">{pick(analysis.summary, L)}</p>}
              {pick(analysis.motiv, L) && (
                <p className="rounded-[10px] border border-astral-gold/35 bg-void-900/60 p-3 text-xs italic text-astral-gold">&quot;{pick(analysis.motiv, L)}&quot;</p>
              )}
              {dream.user_selected_sentiment && (
                <span className="self-start rounded-full border-[0.5px] border-astral-gold/30 bg-void-900 px-2.5 py-1 text-[11px] font-medium text-white">{t.sentiment(dream.user_selected_sentiment)}</span>
              )}
              {archetypes.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-slate-400">{t.archetypes}</p>
                  <div className="flex gap-1.5 overflow-x-auto">{archetypes.map((a) => <Chip key={a} text={a} selected />)}</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-0.5 pt-0.5">
          <div className="flex gap-4">
            <button onClick={onToggleLike} className="flex items-center gap-1 rounded-xl px-2 py-2.5 text-xs text-slate-400">
              <Heart size={15} className={liked ? 'text-semantic-danger-400' : ''} fill={liked ? 'currentColor' : 'none'} />
              {likesCount ?? dream.likes_count ?? 0}
            </button>
            <button onClick={open} className="flex items-center gap-1 rounded-xl px-2 py-2.5 text-xs text-slate-400">
              <MessageSquare size={13} fill="currentColor" />
              {dream.comments_count || 0}
            </button>
            {canShare && (
              <button onClick={() => setShare(true)} aria-label={t.share} className="rounded-xl px-2 py-2.5 text-slate-400">
                <Share2 size={15} />
              </button>
            )}
          </div>
          <button onClick={open} className="text-xs font-bold text-astral-gold/90">{t.detail}</button>
        </div>
      </div>

      {share && (
        <ShareSheet
          content={{ type: 'dream', id: dream.id, title: dream.ai_title || dream.content, isPublic: dream.visibility === 'public' }}
          lang={L}
          onClose={() => setShare(false)}
        />
      )}
    </article>
  )
}
