// Android ui/components/VisionGridCard.kt — 3:4 kapak kartı, başlık, ilerleme, inananlar.
import { useState } from 'react'
import { Radar, Star } from 'lucide-react'

export default function VisionGridCard({ goal, lang = 'en', onClick }) {
  const [failed, setFailed] = useState(false)
  const tr = lang === 'tr'
  const pct = Math.min(100, Math.max(0, Number(goal.completion_percentage) || 0))
  const status = goal.status && goal.status !== 'active'
    ? goal.status === 'completed' ? (tr ? 'TAMAMLANDI' : 'COMPLETED') : (tr ? 'BIRAKILDI' : 'ABANDONED')
    : null

  return (
    <button onClick={onClick} className="relative block aspect-[3/4] w-full overflow-hidden rounded-[20px] border border-white/5 bg-void-800/60 text-left">
      {goal.cover_image_url && !failed ? (
        <img src={goal.cover_image_url} alt={goal.title} onError={() => setFailed(true)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-void-900"><Radar size={28} className="text-astral-gold/40" /></span>
      )}
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-void-950/25 to-void-950" />
      {status && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-void-950/70 px-2 py-[3px] text-[9px] font-bold tracking-[1px] text-white">{status}</span>
      )}
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3">
        <span className="line-clamp-2 font-serif text-sm font-bold text-white">{goal.title}</span>
        <span className="h-[3px] w-full overflow-hidden rounded-full bg-white/15">
          <span className="block h-full rounded-full bg-astral-gold" style={{ width: `${pct}%` }} />
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-astral-gold">
          <Star size={10} fill="currentColor" />{goal.believers_count || 0}
        </span>
      </span>
    </button>
  )
}
