import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import DreamAnalysisView from './DreamAnalysisView'

function getSentimentOptions(lang) {
  const tr = [
    { value: '', label: 'Duygu Seç (Opsiyonel)' },
    { value: 'Fear', label: 'Korku' }, { value: 'Joy', label: 'Neşe' },
    { value: 'Sadness', label: 'Hüzün' }, { value: 'Peace', label: 'Huzur' },
    { value: 'Anxiety', label: 'Kaygı' }, { value: 'Awe', label: 'Hayranlık' },
    { value: 'Confusion', label: 'Kafa karışıklığı' }, { value: 'Surprise', label: 'Şaşkınlık' },
  ]
  const en = [
    { value: '', label: 'Select Emotion (Optional)' },
    { value: 'Fear', label: 'Fear' }, { value: 'Joy', label: 'Joy' },
    { value: 'Sadness', label: 'Sadness' }, { value: 'Peace', label: 'Peace' },
    { value: 'Anxiety', label: 'Anxiety' }, { value: 'Awe', label: 'Awe' },
    { value: 'Confusion', label: 'Confusion' }, { value: 'Surprise', label: 'Surprise' },
  ]
  return lang === 'tr' ? tr : en
}

export default function DreamComposer({ lang, onDreamCreated, endpoint = '/api/submit-dream', className = '' }) {
  const { i18n } = useTranslation()
  const currentLang = lang || i18n.language?.split('-')[0] || 'tr'

  const [dreamText, setDreamText] = useState('')
  const [dreamTitle, setDreamTitle] = useState('')
  const [dreamDate, setDreamDate] = useState('')
  const [locationName, setLocationName] = useState('')
  const [selectedSentiment, setSelectedSentiment] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [analysisDream, setAnalysisDream] = useState(null)
  const [showAnalysisView, setShowAnalysisView] = useState(false)

  const sentimentOptions = useMemo(() => getSentimentOptions(currentLang), [currentLang])

  async function handleSubmitDream(e) {
    e.preventDefault()
    if (submitting) return
    const cleanDream = dreamText.trim()
    if (!cleanDream) { setSubmitError('Rüyanı yazmalısın.'); return }

    setSubmitting(true); setSubmitError('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: cleanDream, title: dreamTitle.trim() || null, dream_date: dreamDate || null,
          location_name: locationName.trim() || null, original_language: currentLang, user_selected_sentiment: selectedSentiment || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Hata oluştu')
      setAnalysisDream(data.dream)
      setShowAnalysisView(true)
      if (typeof onDreamCreated === 'function') onDreamCreated(data.dream)
      setDreamText(''); setDreamTitle(''); setDreamDate(''); setLocationName(''); setSelectedSentiment('')
    } catch (err) { setSubmitError(err?.message) } finally { setSubmitting(false) }
  }

  return (
    <>
      <section className={`glass-card relative overflow-hidden rounded-card p-6 sm:p-8 border border-white/10 shadow-2xl ${className}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(230,198,135,0.05),transparent_40%)] pointer-events-none" />
        
        <div className="relative z-10 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-astral-gold/30 bg-astral-gold/10 text-[10px] font-bold uppercase tracking-widest text-astral-gold mb-2 shadow-astral-glow">
            <Sparkles size={12} /> Bilinçaltı Girdisi
          </span>
          <h2 className="text-2xl font-serif font-bold text-white mt-1">Rüyanı Bilinçaltı Ağına Mühürle</h2>
          <p className="text-xs text-slate-400 mt-1">...yazdıkça zihnindeki semboller çözülmeye başlayacak.</p>
        </div>

        <form onSubmit={handleSubmitDream} className="relative z-10 space-y-4 font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <textarea
                value={dreamText} onChange={(e) => setDreamText(e.target.value)} rows={6}
                placeholder="Mekânlar, kişiler, renkler ve uyanınca kalan his..."
                className="w-full bg-void-950/60 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-astral-gold/50 focus:ring-1 focus:ring-astral-gold/30 transition-all resize-none shadow-inner-light"
              />
            </div>
            <div>
              <input type="text" value={dreamTitle} onChange={(e) => setDreamTitle(e.target.value)} placeholder="Başlık (Örn: Gece Yarısı Deniz)" className="w-full bg-void-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-aether-cyan/50" />
            </div>
            <div>
              <input type="date" value={dreamDate} onChange={(e) => setDreamDate(e.target.value)} className="w-full bg-void-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-aether-cyan/50 [color-scheme:dark]" />
            </div>
            <div>
              <input type="text" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Konum (Örn: Eski Evim)" className="w-full bg-void-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-aether-cyan/50" />
            </div>
            <div>
              <select value={selectedSentiment} onChange={(e) => setSelectedSentiment(e.target.value)} className="w-full bg-void-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-aether-cyan/50">
                {sentimentOptions.map((opt) => <option key={opt.value} value={opt.value} className="bg-void-900">{opt.label}</option>)}
              </select>
            </div>
          </div>

          {submitError && <div className="text-shadowWork-rose text-xs font-bold p-3 bg-shadowWork-rose/10 rounded-xl border border-shadowWork-rose/20">{submitError}</div>}

          <button type="submit" disabled={!dreamText.trim() || submitting} className="w-full py-4 rounded-xl bg-astral-gold text-void-950 font-bold uppercase tracking-widest text-xs hover:brightness-110 shadow-astral-glow transition-all disabled:opacity-40 mt-2">
            {submitting ? 'Ağa İşleniyor...' : 'Rüyayı İlet & Analiz Et'}
          </button>
        </form>
      </section>

      {/* Analiz Sonucu Modali (Orijinal Kod) */}
      {showAnalysisView && analysisDream && (
         <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4" onClick={() => setShowAnalysisView(false)}>
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-void-950 border border-white/10 rounded-card p-6" onClick={e=>e.stopPropagation()}>
                <DreamAnalysisView analysis={analysisDream?.ai_jungian_analysis} lang={currentLang} />
            </div>
         </div>
      )}
    </>
  )
}