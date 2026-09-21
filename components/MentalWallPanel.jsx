import { useState, useEffect, useCallback } from 'react'
import { Eye, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Standart rapor artik UCRETSIZ (gunde FREE_DAILY_LIMIT kez). Once her
// uretim 5 Aura istiyordu ve gercek kullanicilarin bakiyesi 0 oldugu icin
// ozellik hic calismamisti (prod'da mental_wall_reports = 0 satir).
// Paraya donen tek sey "daha derin yorum": premium bedava, degilse
// DEEP_AURA_COST Aura. Backend ile ayni degerler:
// pages/api/mental-wall/generate.js
const DEEP_AURA_COST = 10
const FREE_DAILY_LIMIT = 3

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
  const [remaining, setRemaining] = useState(null)
  const [limitReached, setLimitReached] = useState(false)
  const [wasDeep, setWasDeep] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

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

  async function generateReport(deep = false) {
    setGenerating(true)
    setError('')
    setLimitReached(false)
    try {
      const headers = await authHeader()
      if (!headers) return
      const res = await fetch('/api/mental-wall/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ lang, deep }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'insufficient_auras') {
          setError(lang === 'tr'
            ? `Yetersiz Aura (${json.cost || DEEP_AURA_COST} gerekiyor).`
            : `Not enough Aura (needs ${json.cost || DEEP_AURA_COST}).`)
        } else if (json.error === 'not_enough_dreams') {
          setError(lang === 'tr' ? 'En az 3 rüya paylaşman gerekiyor.' : 'You need at least 3 dreams shared.')
        } else if (json.error === 'no_active_goals') {
          setError(lang === 'tr' ? 'En az 1 aktif hedefin olmalı.' : 'You need at least 1 active goal.')
        } else {
          setError(json.error || 'error')
        }
        return
      }
      // Ucretsiz gunluk hak bitti: 200 doner ama rapor yoktur.
      if (json.success === false && json.limitReached) {
        setLimitReached(true)
        return
      }
      if (json.report) {
        setReports((r) => [json.report, ...r])
        setRemaining(typeof json.remaining === 'number' ? json.remaining : null)
        setWasDeep(Boolean(json.detailed))
        setIsPremium(Boolean(json.isPremium))
      }
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
        <h3 className="text-xs uppercase tracking-widest text-brand-primary-300 font-bold flex items-center gap-1.5">
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

          {error && <p className="text-semantic-danger-400 text-xs mb-2">{error}</p>}

          <button
            onClick={() => generateReport(false)}
            disabled={generating}
            className="w-full mb-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} />
            {generating
              ? (lang === 'tr' ? 'Analiz Ediliyor...' : 'Analyzing...')
              : (lang === 'tr' ? 'Rapor Üret (ücretsiz)' : 'Generate Report (free)')}
          </button>

          {/* "Daha derin bir yorum ister misin?" — premium bedava, degilse Aura. */}
          {(limitReached || (reports.length > 0 && !wasDeep && !isPremium)) && (
            <button
              onClick={() => generateReport(true)}
              disabled={generating}
              className="w-full mb-3 py-2.5 rounded-xl border border-brand-secondary-300/50 text-brand-secondary-300 text-xs font-bold uppercase tracking-widest hover:bg-white/5 disabled:opacity-40"
            >
              {lang === 'tr'
                ? `Daha derin yorum (${DEEP_AURA_COST} Aura veya Premium)`
                : `Deeper reading (${DEEP_AURA_COST} Aura or Premium)`}
            </button>
          )}

          {limitReached && (
            <p className="text-slate-400 text-[11px] mb-3">
              {lang === 'tr'
                ? `Bugünkü ${FREE_DAILY_LIMIT} ücretsiz raporunu kullandın.`
                : `You have used today's ${FREE_DAILY_LIMIT} free reports.`}
            </p>
          )}

          {remaining !== null && !isPremium && !limitReached && (
            <p className="text-slate-500 text-[11px] mb-3">
              {lang === 'tr'
                ? `Bugün ${remaining} ücretsiz rapor hakkın kaldı`
                : `${remaining} free reports left today`}
            </p>
          )}

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
                  <p className="text-brand-secondary-300 text-xs font-bold uppercase tracking-wide mb-1">
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
