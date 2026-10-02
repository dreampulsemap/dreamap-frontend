// Android HomeScreen.kt VisionFeedCard'ının web karşılığı.
import { useState } from 'react'
import { Radar } from 'lucide-react'
import { FeedOwnerHeader } from '@/components/DreamFeedCard'

export default function VisionFeedCard({ goal, lang = 'en', onOpen, currentUserId }) {
  const L = lang === 'tr' ? 'tr' : 'en'
  const [imgFailed, setImgFailed] = useState(false)
  const pct = Math.round(Number(goal.completion_percentage) || 0)

  return (
    <article
      onClick={() => onOpen?.(goal)}
      className="cursor-pointer rounded-[20px] border border-astral-gold/20 bg-void-900 p-4"
    >
      <div className="flex flex-col gap-3">
        <FeedOwnerHeader
          owner={goal.owner || (goal.user_id ? { id: goal.user_id } : null)}
          badge={L === 'tr' ? 'VİZYON' : 'VISION'}
          lang={L}
          currentUserId={currentUserId}
        />
        {goal.cover_image_url && !imgFailed ? (
          <img src={goal.cover_image_url} alt={goal.title} onError={() => setImgFailed(true)} loading="lazy" className="h-[200px] w-full rounded-2xl object-cover" />
        ) : (
          <div className="flex h-[180px] w-full items-center justify-center rounded-2xl bg-void-800">
            <Radar size={32} className="text-astral-gold/50" />
          </div>
        )}
        <h3 className="line-clamp-2 font-serif text-base text-white">{goal.title}</h3>
        <div className="flex flex-col gap-1.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-astral-gold" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">{L === 'tr' ? `%${pct} tamamlandı` : `${pct}% completed`}</p>
        </div>
      </div>
    </article>
  )
}
