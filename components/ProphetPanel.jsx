import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { getAuthHeader } from '@/lib/supabase'

// "Kahin" — Android SpiritualToolsScreen > ProphetSection'ın web karşılığı.
// Ücretsiz: günde FREE_DAILY_LIMIT kısa kehanet. "Daha derin yorum":
// premium bedava, değilse DEEP_AURA_COST Aura. Değerler backend ile aynı:
// pages/api/prophet.js
const DEEP_AURA_COST = 10
const FREE_DAILY_LIMIT = 3

const TEXT = {
  tr: {
    header: 'Kahin', desc: "Zihnini kurcalayan niyet veya sorunu Kahin'e sun. Bilinçaltı verilerinden ve kozmik rehberlikten kehanet al.",
    placeholder: 'Örn: Kariyer yolculuğumda hangi sembole odaklanmalıyım?', loading: 'Kehanet Çekiliyor...',
    ask: "Kahin'e Danış", general: 'Genel Kehanet', or: 'veya', card: 'KART',
    limitTitle: 'Günlük hakkın doldu',
    limitBody: (n) => `Bugünkü ${n} ücretsiz kehanet hakkını kullandın. Premium ile sınırsız kehanet ve çok daha detaylı yorum al.`,
    needsContent: 'Kahin senin rüyalarını ve vizyonlarını okur — başlamak için en az bir tane kaydet.',
    remaining: (n) => `Bugün ${n} ücretsiz hakkın kaldı`,
    deepTitle: 'Daha derin bir yorum ister misin?',
    deepBody: (n) => `Premium sınırsız ve çok daha ayrıntılı yorum verir. Ya da yalnızca bunu ${n} Aura ile aç.`,
    deepBtn: (n) => `${n} Aura ile aç`,
    noAura: (n) => `Yetersiz Aura (${n} gerekiyor).`, error: 'Kehanet alınamadı, tekrar dene.',
  },
  en: {
    header: 'Prophet', desc: 'Present the intention or issue bothering your mind to the Prophet. Receive prophecy from subconscious data and cosmic guidance.',
    placeholder: 'E.g., Which symbol should I focus on in my career journey?', loading: 'Drawing prophecy…',
    ask: 'Consult Prophet', general: 'General Prophecy', or: 'or', card: 'CARD',
    limitTitle: 'Daily limit reached',
    limitBody: (n) => `You have used your ${n} free readings for today. Go Premium for unlimited readings and far more detailed answers.`,
    needsContent: 'The Oracle reads your dreams and visions — record at least one to begin.',
    remaining: (n) => `${n} free readings left today`,
    deepTitle: 'Want a deeper interpretation?',
    deepBody: (n) => `Premium gives unlimited in-depth readings. Or unlock just this one for ${n} Aura.`,
    deepBtn: (n) => `Unlock with ${n} Aura`,
    noAura: (n) => `Not enough Aura (needs ${n}).`, error: "Couldn't get a prophecy, please try again.",
  },
}

export default function ProphetPanel({ lang = 'en', user }) {
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [last, setLast] = useState(null) // derin yorum için son istek

  async function consult(mode, deep = false, q = question) {
    if (loading) return
    if (mode === 'ask' && !q.trim()) return
    setLoading(true)
    setError('')
    const body = { mode, question: mode === 'ask' ? q.trim() : null, lang, deep }
    setLast(body)
    try {
      const res = await fetch('/api/prophet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 402 || json.error === 'insufficient_auras') {
        setError(t.noAura(json.cost || DEEP_AURA_COST))
        return
      }
      if (!res.ok) throw new Error(json.error)
      setResult(json)
    } catch {
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }

  if (!user?.id) return null
  const text = result?.prophecy || result?.answer || result?.guidance
  const canDeepen = result && !result.isPremium && !result.detailed && (text || result.limitReached)

  return (
    <div className="mb-6 glass-card rounded-2xl p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-widest text-brand-primary-300 font-bold flex items-center gap-1.5">
        <Wand2 size={14} /> {t.header}
      </h3>
      <p className="text-slate-400 text-xs">{t.desc}</p>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
        placeholder={t.placeholder}
        rows={2}
        className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
      />
      <button
        onClick={() => consult('ask')}
        disabled={loading || !question.trim()}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5"
      >
        <Sparkles size={14} /> {loading ? t.loading : t.ask}
      </button>
      <p className="text-center text-[11px] text-slate-500">{t.or}</p>
      <button
        onClick={() => consult('general')}
        disabled={loading}
        className="w-full py-2.5 rounded-xl border border-brand-secondary-300/50 text-brand-secondary-300 text-xs font-bold uppercase tracking-widest hover:bg-white/5 disabled:opacity-40"
      >
        {t.general}
      </button>

      {error && <p className="text-semantic-danger-400 text-xs">{error}</p>}

      {result?.limitReached && (
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-sm font-bold text-white">{t.limitTitle}</p>
          <p className="mt-1 text-xs text-slate-400">{t.limitBody(result.dailyLimit || FREE_DAILY_LIMIT)}</p>
        </div>
      )}
      {result?.needsContent && <p className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">{t.needsContent}</p>}

      {text && (
        <div className="rounded-xl border border-astral-gold/30 bg-astral-gold/5 p-3">
          {result.card && <p className="mb-1 text-[11px] font-bold tracking-widest text-astral-gold">{t.card}: {result.card}</p>}
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{text}</p>
        </div>
      )}
      {text && typeof result.remaining === 'number' && !result.isPremium && !result.detailed && (
        <p className="text-[11px] text-slate-500">{t.remaining(result.remaining)}</p>
      )}

      {canDeepen && last && (
        <div className="rounded-xl border border-brand-secondary-300/30 p-3 space-y-2">
          <p className="text-sm font-bold text-white">{t.deepTitle}</p>
          <p className="text-xs text-slate-400">{t.deepBody(result.deepCost || DEEP_AURA_COST)}</p>
          <button
            onClick={() => consult(last.mode, true, last.question || '')}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-brand-secondary-500/90 text-black text-xs font-bold uppercase tracking-widest disabled:opacity-40"
          >
            {t.deepBtn(result.deepCost || DEEP_AURA_COST)}
          </button>
        </div>
      )}
    </div>
  )
}
