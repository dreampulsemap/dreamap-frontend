import { useState } from 'react'
import Image from 'next/image'
import { Heart, MessageCircle, Sparkles, ChevronRight } from 'lucide-react'
import SwipePanels from '@/components/SwipePanels'
import AuthorHeader from '@/components/AuthorHeader'

const CARD_HEIGHT = '78vh'

export default function DreamFeedCard({ dream, lang = 'en', onOpen }) {
  const [imgFailed, setImgFailed] = useState(false)

  const summary = dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en
  const motiv = dream[`ai_motiv_${lang}`] || dream.ai_motiv || dream.ai_motiv_en
  const hasJung = !!(summary || motiv || (Array.isArray(dream.ai_archetypes) && dream.ai_archetypes.length))
  const hasDeepAnalysis = dream.premium_deep_analysis_status === 'generated' && !!dream.premium_deep_analysis
  const deepTeaser = hasDeepAnalysis
    ? getSafeVal(dream.premium_deep_analysis?.summary || dream.premium_deep_analysis?.symbolic_reading, lang)
    : ''
  // owner join'i eşleşmese bile (ör. bazı görselsiz/eski rüyalarda profil
  // satırı bulunamıyor) user_id'den minimal, yine de tıklanabilir bir
  // başlık kur — "hiç profil görünmüyor" yerine en kötü ihtimalle jenerik
  // avatar + "Bilinmeyen" gösterir.
  const headerOwner = dream.owner || (dream.user_id ? { id: dream.user_id } : null)

  return (
    <article
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 mb-4"
      style={{ height: CARD_HEIGHT }}
    >
      {/* Instagram tarzı gönderi başlığı — panellerin ÜZERİNDE sabit bir
          overlay (VisionReelsFeed/DiaryStoryViewer'daki aynı desen), panel
          içeriğinin swipe/height mekaniğine dokunmadan. Tıklanınca paylaşımı
          açan alttaki onClick'i tetiklemeden doğrudan profile gider. */}
      {headerOwner && (
        <div className="absolute top-0 inset-x-0 z-20 flex items-center px-3 py-2.5 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            <AuthorHeader owner={headerOwner} lang={lang} />
          </div>
        </div>
      )}
      <SwipePanels className="h-full">
        {/* PANEL 1: Görsel + rüya metni */}
        <div className="h-full flex flex-col cursor-pointer" onClick={() => onOpen(dream)}>
          <div className="relative flex-1 min-h-0 bg-gradient-to-br from-brand-accent-950/30 to-black">
            {dream.ai_image_url && !imgFailed ? (
              <Image
                src={dream.ai_image_url}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-4xl">🌙</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <div className="absolute bottom-3 right-3 flex gap-3 text-white/90 text-xs font-semibold">
              <span className="flex items-center gap-1"><Heart size={14} /> {dream.likes_count || 0}</span>
              <span className="flex items-center gap-1"><MessageCircle size={14} /> {dream.comments_count || 0}</span>
            </div>
          </div>
          <div className="px-4 py-3 bg-black/95">
            <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">{dream.content}</p>
            {Array.isArray(dream.tags) && dream.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dream.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] text-brand-primary-300/80">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PANEL 2 (varsa): Jung / teaser analiz */}
        {hasJung && (
          <div className="h-full overflow-y-auto px-5 py-8 bg-gradient-to-b from-brand-primary-950/30 to-black cursor-pointer" onClick={() => onOpen(dream)}>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-brand-primary-200 text-lg">🜂</span>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-primary-100">
                {lang === 'tr' ? 'Jung Analizi' : 'Jungian Analysis'}
              </p>
            </div>
            {Array.isArray(dream.ai_archetypes) && dream.ai_archetypes.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {dream.ai_archetypes.slice(0, 3).map((a) => (
                  <span key={a} className="rounded-full border border-brand-primary-300/25 bg-brand-primary-500/10 px-3 py-1 text-xs text-brand-primary-100">{a}</span>
                ))}
              </div>
            )}
            {summary && <p className="text-sm leading-7 text-slate-200">{summary}</p>}
            {motiv && <p className="mt-4 border-l border-brand-primary-300/30 pl-3 text-xs italic text-slate-400">"{motiv}"</p>}
            <span className="mt-6 inline-flex items-center gap-1 text-xs text-slate-500">
              {lang === 'tr' ? 'Devamı için dokun' : 'Tap for more'} <ChevronRight size={12} />
            </span>
          </div>
        )}

        {/* PANEL SON: Derin rüya analizi teaser'ı ya da "ekle" CTA'sı */}
        <div
          className="h-full flex flex-col items-center justify-center px-6 text-center cursor-pointer bg-gradient-to-b from-violet-950/40 to-black"
          onClick={() => onOpen(dream)}
        >
          {hasDeepAnalysis ? (
            <>
              <Sparkles className="mb-3 text-violet-300" size={22} />
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200 mb-3">
                {lang === 'tr' ? 'Derin Rüya Analizi' : 'Deep Dream Analysis'}
              </p>
              {deepTeaser && <p className="text-sm leading-7 text-slate-200 line-clamp-6">{deepTeaser}</p>}
              <span className="mt-5 inline-flex items-center gap-1 text-xs text-slate-500">
                {lang === 'tr' ? 'Tüm kartları gör' : 'See all cards'} <ChevronRight size={12} />
              </span>
            </>
          ) : (
            <>
              <Sparkles className="mb-3 text-violet-300" size={24} />
              <p className="text-sm font-semibold text-white mb-2">
                {lang === 'tr' ? 'Bu rüyanın derinine in' : 'Go deeper into this dream'}
              </p>
              <p className="text-xs text-slate-400 mb-5 max-w-[240px]">
                {lang === 'tr'
                  ? 'Gölge, arketip ve bireyleşme yolunu keşfeden derin analiz henüz eklenmedi.'
                  : "The shadow, archetype, and individuation-path analysis hasn't been added yet."}
              </p>
              <span className="rounded-full bg-violet-600 px-5 py-2.5 text-xs font-bold text-white">
                {lang === 'tr' ? '+ Derin Rüya Analizi Ekle' : '+ Add Deep Dream Analysis'}
              </span>
            </>
          )}
        </div>
      </SwipePanels>
    </article>
  )
}

function getSafeVal(obj, targetLang = 'en') {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj[targetLang] || obj.en || Object.values(obj)[0] || ''
}
