import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Sparkles, MessageCircle } from 'lucide-react'
import SwipePanels from '@/components/SwipePanels'
import AuthorHeader from '@/components/AuthorHeader'
import { getGoalTheme } from '@/lib/goalTheme'
import { isNextImageHost } from '@/lib/imageUrlUtils'

const CARD_HEIGHT = '78vh'

export default function VisionFeedCard({ goal, lang = 'en', onOpen }) {
  const [failedUrls, setFailedUrls] = useState(() => new Set())
  const theme = useMemo(() => getGoalTheme(goal.title, goal.description), [goal.title, goal.description])

  const images = useMemo(() => {
    const all = [goal.cover_image_url, ...(Array.isArray(goal.gallery_image_urls) ? goal.gallery_image_urls : [])]
    return [...new Set(all.filter(Boolean))]
  }, [goal.cover_image_url, goal.gallery_image_urls])

  const statusLabel = goal.status === 'completed'
    ? (lang === 'tr' ? 'Tamamlandı' : 'Completed')
    : goal.status === 'abandoned'
      ? (lang === 'tr' ? 'Bırakıldı' : 'Abandoned')
      : null

  return (
    <article
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 mb-4"
      style={{ height: CARD_HEIGHT }}
    >
      <div className="h-full flex flex-col cursor-pointer" onClick={() => onOpen(goal)}>
        <div className="relative flex-1 min-h-0">
          {images.length > 0 ? (
            <SwipePanels className="h-full">
              {images.map((url) => (
                <div key={url} className="relative h-full w-full bg-gradient-to-br from-void-900 to-void-950">
                  {!failedUrls.has(url) ? (
                    isNextImageHost(url) ? (
                      <Image
                        src={url}
                        alt={goal.title}
                        fill
                        sizes="100vw"
                        className="object-cover"
                        onError={() => setFailedUrls((prev) => new Set(prev).add(url))}
                      />
                    ) : (
                      <img
                        src={url}
                        alt={goal.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        onError={() => setFailedUrls((prev) => new Set(prev).add(url))}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">✨</div>
                  )}
                </div>
              ))}
            </SwipePanels>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-void-900 to-void-950">✨</div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
          {/* Instagram tarzı gönderi başlığı — DreamFeedCard'daki aynı
              overlay deseni. Altındaki durum/tür rozetleri çakışmaması için
              biraz aşağı kaydırıldı. */}
          {goal.owner && (
            <div className="absolute top-0 inset-x-0 z-20 flex items-center px-3 py-2.5 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
              <div className="pointer-events-auto">
                <AuthorHeader owner={goal.owner} lang={lang} />
              </div>
            </div>
          )}
          {statusLabel && (
            <span className={`absolute ${goal.owner ? 'top-12' : 'top-3'} left-3 z-[2] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-black/60 backdrop-blur text-slate-200 border border-white/10`}>
              {statusLabel}
            </span>
          )}
          <span className={`absolute ${goal.owner ? 'top-12' : 'top-3'} right-3 z-[2] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-brand-secondary-200 border border-brand-secondary-300/20`}>
            {lang === 'tr' ? 'Vizyon' : 'Vision'}
          </span>
        </div>

        <div className="px-4 py-3 bg-black/95">
          <h3 className="text-base font-serif font-bold text-white line-clamp-1 mb-2">{goal.title}</h3>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${goal.completion_percentage || 0}%`, background: `linear-gradient(90deg, ${theme.accentFrom}, ${theme.accentTo})` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Sparkles size={13} style={{ color: theme.accentFrom }} /> {goal.believers_count || 0}</span>
            <span className="flex items-center gap-1"><MessageCircle size={13} /> {goal.comments_count || 0}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
