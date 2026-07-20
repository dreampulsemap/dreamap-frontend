import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { Sprout } from 'lucide-react'

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

// activeGoals: kullanıcının aktif hedefleri (Daily Seed üretilebilecek adaylar)
export default function DailySeedsPanel({ lang = 'en', user, activeGoals = [] }) {
  const t = getVisionBoardText(lang)
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [generatingGoalId, setGeneratingGoalId] = useState(null)
  const [error, setError] = useState('')

  const loadSeeds = useCallback(async () => {
    const headers = await authHeader()
    if (!headers) { setLoading(false); return }
    try {
      const res = await fetch('/api/daily-seeds/complete', { headers })
      const json = await res.json()
      if (res.ok) setSeeds(json.seeds || [])
    } catch {
      // sessiz
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id) loadSeeds()
    else setLoading(false)
  }, [user, loadSeeds])

  async function generateSeed(goalId) {
    setGeneratingGoalId(goalId)
    setError('')
    try {
      const headers = await authHeader()
      if (!headers) return
      const res = await fetch('/api/daily-seeds/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId, lang }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'error'); return }
      setSeeds((list) => [...list.filter((s) => s.goal_id !== goalId), json.seed])
    } catch {
      setError('network_error')
    } finally {
      setGeneratingGoalId(null)
    }
  }

  async function toggleSeed(seedId) {
    const headers = await authHeader()
    if (!headers) return
    // İyimser güncelleme: bekletmeden UI'da işaretle
    setSeeds((list) => list.map((s) => (s.id === seedId ? { ...s, is_completed: !s.is_completed } : s)))
    try {
      const res = await fetch('/api/daily-seeds/complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ seedId }),
      })
      if (!res.ok) {
        // başarısızsa geri al
        setSeeds((list) => list.map((s) => (s.id === seedId ? { ...s, is_completed: !s.is_completed } : s)))
      }
    } catch {
      setSeeds((list) => list.map((s) => (s.id === seedId ? { ...s, is_completed: !s.is_completed } : s)))
    }
  }

  if (!user?.id) return null

  const seededGoalIds = new Set(seeds.map((s) => s.goal_id))
  const goalsNeedingSeed = activeGoals.filter((g) => !seededGoalIds.has(g.id))

  if (loading) {
    return (
      <div className="mb-6 h-16 rounded-2xl bg-white/5 animate-pulse" />
    )
  }

  if (seeds.length === 0 && goalsNeedingSeed.length === 0) return null

  return (
    <div className="mb-6 glass-card rounded-2xl p-4">
      <h3 className="text-xs uppercase tracking-widest text-fuchsia-300 font-bold mb-3">
        <Sprout size={14} className="inline -mt-0.5 mr-1" /> {lang === 'tr' ? 'Bugünün Tohumları' : "Today's Seeds"}
      </h3>

      {error && <p className="text-rose-400 text-xs mb-2">{error}</p>}

      <div className="space-y-2">
        {seeds.map((seed) => (
          <div key={seed.id} className="flex items-start gap-3">
            <button
              onClick={() => toggleSeed(seed.id)}
              className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center text-xs shrink-0 cursor-pointer ${
                seed.is_completed ? 'bg-cyan-400 border-cyan-400 text-black' : 'border-white/20 text-transparent'
              }`}
            >
              ✓
            </button>
            <div className="min-w-0">
              <p className={`text-sm ${seed.is_completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                {seed.content}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{seed.goals?.title}</p>
            </div>
          </div>
        ))}

        {goalsNeedingSeed.map((goal) => (
          <div key={goal.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-3 py-2">
            <p className="text-sm text-slate-400 truncate">{goal.title}</p>
            <button
              onClick={() => generateSeed(goal.id)}
              disabled={generatingGoalId === goal.id}
              className="shrink-0 px-3 py-1 rounded-full bg-fuchsia-500/90 text-white text-[11px] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40"
            >
              {generatingGoalId === goal.id
                ? '...'
                : (lang === 'tr' ? 'Tohum Üret' : 'Get Seed')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
