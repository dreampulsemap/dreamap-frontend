// Haftalık / aylık AI rüya özeti — Android AISummariesCard.kt'nin web karşılığı.
// /api/summaries/latest okur, /api/summaries/generate üretir.
import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { getAuthHeader } from '@/lib/supabase'

const TEXT = {
  tr: {
    title: 'Rüya Özetleri', weekly: 'Haftalık', monthly: 'Aylık', generating: 'AI Özet oluşturuluyor...',
    loading: 'Özet yükleniyor...', sentiment: 'Duygu', refresh: 'Yenile', create: 'Özet Oluştur',
    notCreated: (p) => `Son ${p} rüya kayıtlarından çıkarılan AI bilinçaltı özeti henüz oluşturulmadı.`,
    periodWord: { weekly: 'Haftalık', monthly: 'Aylık' }, analyzed: (n) => `🌙 ${n} Rüya Analiz Edildi`,
    createPeriod: (p) => `${p} Özet Oluştur`, synthesizing: 'Özet Sentezleniyor...',
    errorLoad: 'Özet yüklenemedi', errorCreate: 'Özet oluşturulamadı',
  },
  en: {
    title: 'Dream Summaries', weekly: 'Weekly', monthly: 'Monthly', generating: 'AI Summary is being created...',
    loading: 'Loading summary...', sentiment: 'Sentiment', refresh: 'Refresh', create: 'Create Summary',
    notCreated: (p) => `The AI subconscious summary extracted from recent ${p} dream logs has not been created yet.`,
    periodWord: { weekly: 'Weekly', monthly: 'Monthly' }, analyzed: (n) => `🌙 ${n} Dream${n === 1 ? '' : 's'} Analyzed`,
    createPeriod: (p) => `Create ${p} Summary`, synthesizing: 'Synthesizing Summary...',
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
    <div className="flex flex-col gap-3.5 rounded-[20px] border border-astral-gold/40 bg-void-900 p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-serif text-base font-bold text-astral-gold"><span className="text-xl">📜</span>{t.title}</h3>
        <div className="inline-flex gap-0.5 rounded-full bg-void-800 p-0.5">
          {['weekly', 'monthly'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${period === p ? 'bg-aether-violet text-white' : 'text-gray-500'}`}
            >
              {t[p]}
            </button>
          ))}
        </div>
      </div>

      {cur.state === 'loading' || (generating && !hasText) ? (
        <div className="flex items-center justify-center gap-3 py-3 text-[13px] text-slate-300">
          <Loader2 size={20} className="animate-spin text-astral-gold" />
          {generating ? t.generating : t.loading}
        </div>
      ) : cur.state === 'error' ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-semantic-danger-400">{cur.error}</p>
          <button onClick={generate} className="rounded-xl bg-aether-violet px-4 py-2 text-xs text-white">{t.create}</button>
        </div>
      ) : hasText ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            {summary.dreamCount > 0 ? (
              <span className="rounded-full border-[0.5px] border-astral-gold/50 bg-aether-violet/25 px-2.5 py-[3px] text-[11px] font-semibold text-astral-gold">{t.analyzed(summary.dreamCount)}</span>
            ) : <span />}
            {summary.dominantSentiment && (
              <span className="rounded-full bg-void-800 px-2.5 py-[3px] text-[11px] text-slate-300">{t.sentiment}: {summary.dominantSentiment}</span>
            )}
          </div>
          {(summary.dominantArchetypes || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {summary.dominantArchetypes.map((a) => (
                <span key={a} className="rounded-full border-[0.5px] border-astral-gold/40 bg-aether-violet/30 px-2 py-[3px] text-[10px] font-semibold text-astral-gold">{a}</span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-line text-[13px] leading-5 text-white">{summary.summaryText}</p>
          <div className="flex justify-end">
            <button onClick={generate} disabled={generating} className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-astral-gold disabled:opacity-50">
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> {t.refresh}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] leading-[18px] text-slate-300">{t.notCreated(t.periodWord[period])}</p>
          <button onClick={generate} disabled={generating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-aether-violet py-2.5 text-[13px] font-bold text-white disabled:opacity-70">
            {generating ? (
              <><span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" />{t.synthesizing}</>
            ) : (
              <><Sparkles size={18} className="text-astral-gold" fill="currentColor" />{t.createPeriod(t.periodWord[period])}</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
