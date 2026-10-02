import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

// activeGoals: kullanıcının aktif hedefleri (Daily Seed üretilebilecek adaylar)
export default function DailySeedsPanel({ lang = 'en', user, activeGoals = [], onGoalClick }) {
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

  const tr = lang === 'tr'
  // Android VisionScreen DailySeedsSection: her aktif vizyon için bir kutu.
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-void-900/80 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-serif text-[15px] font-bold text-astral-gold">
        <span className="text-lg">🌱</span>{tr ? 'Bugün Yapman Gerekenler (Günün Tohumları)' : 'Things to Do Today (Daily Seeds)'}
      </h3>

      {error && <p className="mb-2 text-xs text-semantic-danger-400">{error}</p>}

      {loading ? (
        <div className="h-16 animate-pulse rounded-xl bg-white/5" />
      ) : activeGoals.length === 0 ? (
        <p className="text-xs text-slate-400">
          {tr ? 'Aktif bir vizyonun yok. Yeni bir vizyon ekleyerek günlük küçük adımlarını alabilirsin.' : 'You have no active vision. You can take your daily small steps by adding a new vision.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {activeGoals.map((goal) => {
            const seed = seeds.find((s) => s.goal_id === goal.id)
            return (
              <div key={goal.id} className="flex flex-col gap-2 rounded-xl border-[0.5px] border-white/10 bg-void-800/60 p-3">
                <button onClick={() => onGoalClick?.(goal)} className="text-left text-xs font-bold text-astral-gold">{goal.title}</button>
                {seed ? (
                  <button onClick={() => toggleSeed(seed.id)} className="flex w-full items-center gap-2.5 text-left">
                    {seed.is_completed ? <CheckCircle2 size={20} className="shrink-0 text-astral-gold" /> : <Circle size={20} className="shrink-0 text-gray-500" />}
                    <span className={`flex-1 text-[13px] ${seed.is_completed ? 'text-gray-500 line-through' : 'text-white'}`}>{seed.content}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1 text-xs text-slate-300">{tr ? 'Bugünkü mikro adım henüz üretilmedi.' : "Today's micro-step has not been generated yet."}</span>
                    <button
                      onClick={() => generateSeed(goal.id)}
                      disabled={generatingGoalId === goal.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-aether-violet px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-60"
                    >
                      {generatingGoalId === goal.id ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <><Sparkles size={14} className="text-astral-gold" fill="currentColor" />{tr ? 'Adımı Öner' : 'Suggest Step'}</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
