import { useState, useEffect, useCallback } from 'react'
import { Eye, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const AURA_COST = 8

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export default function MentalWallPanel({ lang = 'en', user }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const loadReports = useCallback(async () => {
    const headers = await authHeader()
    if (!headers) { setLoading(false); return }
    try {
      const res = await fetch('/api/mental-wall/generate', { headers })
      const json = await res.json()
      if (res.ok) setReports(json.reports || [])
    } catch {
      // sessiz
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id) loadReports()
    else setLoading(false)
  }, [user, loadReports])

  async function generateReport() {
    setGenerating(true)
    setError('')
    try {
      const headers = await authHeader()
      if (!headers) return
      const res = await fetch('/api/mental-wall/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ lang }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'insufficient_auras') {
          setError(lang === 'tr' ? `Yetersiz Aura (${AURA_COST} gerekiyor).` : `Not enough Auras (need ${AURA_COST}).`)
        } else if (json.error === 'not_enough_dreams') {
          setError(lang === 'tr' ? 'En az 3 rüya paylaşman gerekiyor.' : 'You need at least 3 dreams shared.')
        } else if (json.error === 'no_active_goals') {
          setError(lang === 'tr' ? 'En az 1 aktif hedefin olmalı.' : 'You need at least 1 active goal.')
        } else {
          setError(json.error || 'error')
        }
        return
      }
      setReports((r) => [json.report, ...r])
    } catch {
      setError('network_error')
    } finally {
      setGenerating(false)
    }
  }

  if (!user?.id) return null

  return (
    <div className="mb-6 glass-card rounded-2xl p-4">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-xs uppercase tracking-widest text-fuchsia-300 font-bold flex items-center gap-1.5">
          <Eye size={14} /> {lang === 'tr' ? 'Gölge Çalışması' : 'Shadow Work'}
        </h3>
        <span className="text-slate-500 text-xs">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="mt-3">
          <p className="text-slate-400 text-xs mb-3">
            {lang === 'tr'
              ? 'Rüyalarını hedeflerinle çapraz sorgulayıp bilinçaltı bir blokaj tespit eder.'
              : 'Cross-references your dreams against your goals to detect a subconscious block.'}
          </p>

          {error && <p className="text-rose-400 text-xs mb-2">{error}</p>}

          <button
            onClick={generateReport}
            disabled={generating}
            className="w-full mb-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            {generating
              ? (lang === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...')
              : (lang === 'tr' ? `Rapor Üret (${AURA_COST} Aura)` : `Generate Report (${AURA_COST} Auras)`)}
          </button>

          {loading ? (
            <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ) : reports.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-4">
              {lang === 'tr' ? 'Henüz bir rapor yok.' : 'No reports yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="bg-white/5 rounded-xl p-3">
                  <p className="text-cyan-300 text-xs font-bold uppercase tracking-wide mb-1">
                    {r.detected_block}
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">{r.report_content}</p>
                  <p className="text-slate-600 text-[10px] mt-2">
                    {new Date(r.created_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
