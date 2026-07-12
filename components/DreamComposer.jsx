import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DreamAnalysisView from './DreamAnalysisView'

function getText(lang, key) {
  const map = {
    tr: {
      title: 'Rüyanı paylaş',
      subtitle: 'Rüyanı yaz, analiz edelim ve sana derin sembolik yorumunu gösterelim.',
      dreamContent: 'Rüyan',
      dreamTitle: 'Başlık',
      dreamDate: 'Rüya tarihi',
      location: 'Konum',
      sentiment: 'Baskın duygu',
      placeholder:
        'Rüyanı ayrıntılarıyla yaz... Mekân, kişiler, semboller, duygular ve uyanınca sende bıraktığı his önemli.',
      submit: 'Submit Dream',
      submitting: 'Rüya analiz ediliyor...',
      close: 'Kapat',
      analysisTitle: 'Rüya Analizi',
      errorFallback: 'Rüya gönderilemedi.',
      noDreamReturned: 'Sunucudan rüya verisi dönmedi.',
      required: 'Lütfen rüyanı yaz.',
      reset: 'Temizle',
      retry: 'Tekrar dene',
    },
    en: {
      title: 'Share your dream',
      subtitle: 'Write your dream and get a deep symbolic analysis.',
      dreamContent: 'Your dream',
      dreamTitle: 'Title',
      dreamDate: 'Dream date',
      location: 'Location',
      sentiment: 'Dominant emotion',
      placeholder:
        'Write your dream in detail... people, places, symbols, emotions, and how it felt when you woke up.',
      submit: 'Submit Dream',
      submitting: 'Analyzing dream...',
      close: 'Close',
      analysisTitle: 'Dream Analysis',
      errorFallback: 'Failed to submit dream.',
      noDreamReturned: 'No dream returned from server.',
      required: 'Please write your dream.',
      reset: 'Reset',
      retry: 'Retry',
    },
  }

  const dict = map[lang] || map.en
  return dict[key] || map.en[key] || key
}

function getSentimentOptions(lang) {
  const tr = [
    { value: '', label: 'Seçiniz' },
    { value: 'Fear', label: 'Korku' },
    { value: 'Joy', label: 'Neşe' },
    { value: 'Sadness', label: 'Hüzün' },
    { value: 'Peace', label: 'Huzur' },
    { value: 'Anxiety', label: 'Kaygı' },
    { value: 'Awe', label: 'Hayranlık' },
    { value: 'Confusion', label: 'Kafa karışıklığı' },
    { value: 'Surprise', label: 'Şaşkınlık' },
  ]

  const en = [
    { value: '', label: 'Select' },
    { value: 'Fear', label: 'Fear' },
    { value: 'Joy', label: 'Joy' },
    { value: 'Sadness', label: 'Sadness' },
    { value: 'Peace', label: 'Peace' },
    { value: 'Anxiety', label: 'Anxiety' },
    { value: 'Awe', label: 'Awe' },
    { value: 'Confusion', label: 'Confusion' },
    { value: 'Surprise', label: 'Surprise' },
  ]

  return lang === 'tr' ? tr : en
}

export default function DreamComposer({
  lang,
  onDreamCreated,
  endpoint = '/api/submit-dream',
  className = '',
}) {
  const { i18n } = useTranslation()
  const currentLang = lang || i18n.language || 'tr'

  const [dreamText, setDreamText] = useState('')
  const [dreamTitle, setDreamTitle] = useState('')
  const [dreamDate, setDreamDate] = useState('')
  const [locationName, setLocationName] = useState('')
  const [selectedSentiment, setSelectedSentiment] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [analysisDream, setAnalysisDream] = useState(null)
  const [showAnalysisView, setShowAnalysisView] = useState(false)

  const submitButtonRef = useRef(null)
  const closeButtonRef = useRef(null)
  const firstTextareaRef = useRef(null)

  const labels = useMemo(
    () => ({
      title: getText(currentLang, 'title'),
      subtitle: getText(currentLang, 'subtitle'),
      dreamContent: getText(currentLang, 'dreamContent'),
      dreamTitle: getText(currentLang, 'dreamTitle'),
      dreamDate: getText(currentLang, 'dreamDate'),
      location: getText(currentLang, 'location'),
      sentiment: getText(currentLang, 'sentiment'),
      placeholder: getText(currentLang, 'placeholder'),
      submit: getText(currentLang, 'submit'),
      submitting: getText(currentLang, 'submitting'),
      close: getText(currentLang, 'close'),
      analysisTitle: getText(currentLang, 'analysisTitle'),
      errorFallback: getText(currentLang, 'errorFallback'),
      noDreamReturned: getText(currentLang, 'noDreamReturned'),
      required: getText(currentLang, 'required'),
      reset: getText(currentLang, 'reset'),
      retry: getText(currentLang, 'retry'),
    }),
    [currentLang]
  )

  const sentimentOptions = useMemo(() => getSentimentOptions(currentLang), [currentLang])

  useEffect(() => {
    if (!showAnalysisView) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowAnalysisView(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 20)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      submitButtonRef.current?.focus()
    }
  }, [showAnalysisView])

  function resetForm() {
    setDreamText('')
    setDreamTitle('')
    setDreamDate('')
    setLocationName('')
    setSelectedSentiment('')
    setSubmitError('')
  }

  async function handleSubmitDream(e) {
    e.preventDefault()

    if (submitting) return

    const cleanDream = dreamText.trim()
    if (!cleanDream) {
      setSubmitError(labels.required)
      firstTextareaRef.current?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: cleanDream,
          title: dreamTitle.trim() || null,
          dream_date: dreamDate || null,
          location_name: locationName.trim() || null,
          original_language: currentLang || 'tr',
          user_selected_sentiment: selectedSentiment || null,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || labels.errorFallback)
      }

      if (!data?.dream) {
        throw new Error(labels.noDreamReturned)
      }

      setAnalysisDream(data.dream)
      setShowAnalysisView(true)

      if (typeof onDreamCreated === 'function') {
        onDreamCreated(data.dream)
      }

      resetForm()
    } catch (err) {
      console.error('Submit dream error:', err)
      setSubmitError(err?.message || labels.errorFallback)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section
        className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0f1a]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 ${className}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.14),_transparent_45%),_radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.10),_transparent_35%)]" />

        <div className="relative z-10">
          <div className="mb-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/15 bg-fuchsia-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100">
              <span className="h-2 w-2 rounded-full bg-fuchsia-300" />
              Lunosfer Oracle
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {labels.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              {labels.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmitDream} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white/80">
                  {labels.dreamContent}
                </label>
                <textarea
                  ref={firstTextareaRef}
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value)}
                  rows={8}
                  placeholder={labels.placeholder}
                  className="min-h-[220px] w-full rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-4 text-sm leading-7 text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none focus:ring-0 sm:text-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  {labels.dreamTitle}
                </label>
                <input
                  type="text"
                  value={dreamTitle}
                  onChange={(e) => setDreamTitle(e.target.value)}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  {labels.dreamDate}
                </label>
                <input
                  type="date"
                  value={dreamDate}
                  onChange={(e) => setDreamDate(e.target.value)}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white focus:border-violet-400/35 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  {labels.location}
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  {labels.sentiment}
                </label>
                <select
                  value={selectedSentiment}
                  onChange={(e) => setSelectedSentiment(e.target.value)}
                  className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white focus:border-violet-400/35 focus:outline-none"
                >
                  {sentimentOptions.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {submitError && (
              <div className="rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                ref={submitButtonRef}
                type="submit"
                disabled={submitting || !dreamText.trim()}
                className="inline-flex items-center justify-center gap-3 rounded-[1.3rem] border border-violet-300/20 bg-violet-500/14 px-5 py-3.5 text-sm font-medium text-violet-50 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {submitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-100 border-t-transparent" />
                )}
                <span>{submitting ? labels.submitting : labels.submit}</span>
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-[1.3rem] border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white/80 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {labels.reset}
              </button>
            </div>
          </form>
        </div>
      </section>

      {showAnalysisView && analysisDream && (
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/75 backdrop-blur-xl sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={labels.analysisTitle}
          onClick={() => setShowAnalysisView(false)}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.16),_transparent_42%),_radial-gradient(circle_at_bottom,_rgba(45,212,191,0.10),_transparent_45%)]" />

          <div
            className="relative z-10 w-full translate-y-0 px-0 sm:max-w-6xl sm:px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[94vh] w-full overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#050713]/95 shadow-[0_30px_100px_rgba(0,0,0,0.58)] sm:rounded-[2.2rem]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/60">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-[13px] text-violet-100">
                    ✦
                  </span>
                  <span>{labels.analysisTitle}</span>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setShowAnalysisView(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
                  aria-label={labels.close}
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[calc(94vh-64px)] overflow-y-auto">
                <DreamAnalysisView dream={analysisDream} lang={currentLang} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}