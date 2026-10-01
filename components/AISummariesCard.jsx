// Haftalık / aylık AI rüya özeti — Android AISummariesCard.kt'nin web karşılığı.
// /api/summaries/latest okur, /api/summaries/generate üretir.
import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { getAuthHeader } from '@/lib/supabase'

const TEXT = {
  tr: {
    title: 'Rüya Özetleri', weekly: 'Haftalık', monthly: 'Aylık', generating: 'AI Özet oluşturuluyor...',
    loading: 'Özet yükleniyor...', sentiment: 'Duygu', refresh: 'Yenile', create: 'Özet Oluştur',
    notCreated: (p) => `Son ${p} rüya kayıtlarından çıkarılan AI bilinçaltı özeti henüz oluşturulmadı.`,
    periodWord: { weekly: 'haftalık', monthly: 'aylık' }, analyzed: (n) => `${n} rüya analiz edildi`,
    errorLoad: 'Özet yüklenemedi', errorCreate: 'Özet oluşturulamadı',
  },
  en: {
    title: 'Dream Summaries', weekly: 'Weekly', monthly: 'Monthly', generating: 'AI Summary is being created...',
    loading: 'Loading summary...', sentiment: 'Sentiment', refresh: 'Refresh', create: 'Create Summary',
    notCreated: (p) => `The AI subconscious summary extracted from recent ${p} dream logs has not been created yet.`,
    periodWord: { weekly: 'weekly', monthly: 'monthly' }, analyzed: (n) => `${n} dream${n === 1 ? '' : 's'} analyzed`,
    errorLoad: "Summary couldn't be loaded", errorCreate: "Summary couldn't be created",
  },
}

export default function AISummariesCard({ lang = 'en', user }) {
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']
  const [period, setPeriod] = useState('weekly')
  const [byPeriod, setByPeriod] = useState({}) // { weekly: {state, summary, error} }
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async (which) => {
    setByPeriod((s) => ({ ...s, [which]: { state: 'loading' } }))
    try {
      const res = await fetch(`/api/summaries/latest?periodType=${which}`, { headers: await getAuthHeader() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error)
      setByPeriod((s) => ({ ...s, [which]: { state: 'ok', summary: json.summary } }))
    } catch {
      setByPeriod((s) => ({ ...s, [which]: { state: 'error', error: t.errorLoad } }))
    }
  }, [t.errorLoad])

  useEffect(() => {
    if (user?.id && !byPeriod[period]) load(period)
  }, [user?.id, period, byPeriod, load])

  async function generate() {
    if (generating) return
    setGenerating(true)
    const which = period
    try {
      const res = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({ periodType: which }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error)
      setByPeriod((s) => ({ ...s, [which]: { state: 'ok', summary: json.summary } }))
    } catch {
      setByPeriod((s) => ({ ...s, [which]: { state: 'error', error: t.errorCreate } }))
    } finally {
      setGenerating(false)
    }
  }

  if (!user?.id) return null
  const cur = byPeriod[period] || { state: 'loading' }
  const summary = cur.summary
  const hasText = summary?.summaryText?.trim()

  return (
    <div className="mb-4 rounded-2xl border border-astral-gold/40 bg-void-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-base font-bold text-astral-gold">📜 {t.title}</h3>
        <div className="inline-flex rounded-full bg-white/5 p-0.5">
          {['weekly', 'monthly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${period === p ? 'bg-violet-500/60 text-white' : 'text-slate-400'}`}
            >
              {t[p]}
            </button>
          ))}
        </div>
      </div>

      {cur.state === 'loading' || (generating && !hasText) ? (
        <div className="flex items-center justify-center gap-3 py-3 text-sm text-slate-300">
          <Loader2 size={18} className="animate-spin text-astral-gold" />
          {generating ? t.generating : t.loading}
        </div>
      ) : cur.state === 'error' ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-red-400">{cur.error}</p>
          <button onClick={generate} className="rounded-xl bg-violet-500/70 px-4 py-1.5 text-xs font-bold text-white">{t.create}</button>
        </div>
      ) : hasText ? (
        <div className="space-y-2">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{summary.summaryText}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            {summary.dreamCount != null && <span>{t.analyzed(summary.dreamCount)}</span>}
            {summary.dominantSentiment && <span>· {t.sentiment}: {summary.dominantSentiment}</span>}
            {(summary.dominantArchetypes || []).slice(0, 4).map((a) => (
              <span key={a} className="rounded-full bg-astral-gold/10 px-2 py-0.5 text-astral-gold">{a}</span>
            ))}
          </div>
          <button onClick={generate} disabled={generating} className="inline-flex items-center gap-1.5 text-xs font-bold text-astral-gold disabled:opacity-50">
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} /> {generating ? t.generating : t.refresh}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-slate-400">{t.notCreated(t.periodWord[period])}</p>
          <button onClick={generate} disabled={generating} className="rounded-xl bg-violet-500/70 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
            {t.create}
          </button>
        </div>
      )}
    </div>
  )
}
