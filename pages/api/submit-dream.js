import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DreamAnalysisView from './DreamAnalysisView'

function t(lang, tr, en) {
  return lang === 'tr' ? tr : en
}

export default function DreamComposer({
  lang,
  endpoint = '/api/submit-dream',
  onDreamCreated,
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

  const closeButtonRef = useRef(null)

  const sentimentOptions = useMemo(
    () => [
      { value: '', label: t(currentLang, 'Seçiniz', 'Select') },
      { value: 'Fear', label: t(currentLang, 'Korku', 'Fear') },
      { value: 'Joy', label: t(currentLang, 'Neşe', 'Joy') },
      { value: 'Sadness', label: t(currentLang, 'Hüzün', 'Sadness') },
      { value: 'Peace', label: t(currentLang, 'Huzur', 'Peace') },
      { value: 'Anxiety', label: t(currentLang, 'Kaygı', 'Anxiety') },
      { value: 'Awe', label: t(currentLang, 'Hayranlık', 'Awe') },
      { value: 'Confusion', label: t(currentLang, 'Kafa karışıklığı', 'Confusion') },
      { value: 'Surprise', label: t(currentLang, 'Şaşkınlık', 'Surprise') },
    ],
    [currentLang]
  )

  useEffect(() => {
    if (!showAnalysisView) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowAnalysisView(false)
    }

    document.addEventListener('keydown', onKeyDown)
    setTimeout(() => closeButtonRef.current?.focus(), 10)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showAnalysisView])

  function resetForm() {
    setDreamText('')
    setDreamTitle('')
    setDreamDate('')
    setLocationName('')
    setSelectedSentiment('')
  }

  async function handleSubmitDream(e) {
    e.preventDefault()
    if (submitting) return

    const content = dreamText.trim()
    if (!content) {
      setSubmitError(t(currentLang, 'Lütfen rüyanı yaz.', 'Please write your dream.'))
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          content,
          title: dreamTitle.trim() || null,
          dream_date: dreamDate || null,
          location_name: locationName.trim() || null,
          original_language: currentLang || 'tr',
          user_selected_sentiment: selectedSentiment || null,
        }),
        signal: controller.signal,
        cache: 'no-store',
      })

      const text = await res.text()
      let data = null

      try {
        data = text ? JSON.parse(text) : null
      } catch {
        throw new Error(
          text || t(currentLang, 'Sunucu geçersiz cevap döndürdü.', 'Server returned invalid JSON.')
        )
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            t(currentLang, 'Rüya gönderilemedi.', 'Failed to submit dream.')
        )
      }

      const dream =
        data?.dream ||
        data?.data ||
        data?.result ||
        (data?.id ? data : null)

      if (!dream) {
        throw new Error(
          t(
            currentLang,
            'API başarı döndü ama dream nesnesi gelmedi.',
            'API succeeded but no dream object was returned.'
          )
        )
      }

      setAnalysisDream(dream)
      setShowAnalysisView(true)
      resetForm()

      if (typeof onDreamCreated === 'function') {
        onDreamCreated(dream)
      }
    } catch (err) {
      console.error('Submit dream error:', err)

      if (err?.name === 'AbortError') {
        setSubmitError(
          t(
            currentLang,
            'İstek zaman aşımına uğradı. API route takılıyor olabilir.',
            'Request timed out. The API route may be hanging.'
          )
        )
      } else {
        setSubmitError(err?.message || t(currentLang, 'Bir hata oluştu.', 'Something went wrong.'))
      }
    } finally {
      clearTimeout(timeoutId)
      setSubmitting(false)
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmitDream}
        className="rounded-[2rem] border border-white/10 bg-[#0a0f1a]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {t(currentLang, 'Rüyanı paylaş', 'Share your dream')}
          </h2>
          <p className="mt-2 text-sm leading-7 text-white/65 sm:text-base">
            {t(
              currentLang,
              'Rüyanı yaz, analiz edip sonucu direkt açalım.',
              'Write your dream and open the analysis immediately.'
            )}
          </p>
        </div>

        <div className="space-y-4">
          <textarea
            value={dreamText}
            onChange={(e) => setDreamText(e.target.value)}
            rows={8}
            placeholder={t(
              currentLang,
              'Rüyanı ayrıntılarıyla yaz...',
              'Write your dream in detail...'
            )}
            className="min-h-[220px] w-full rounded-[1.5rem] border border-white/10 bg-black/25 px-4 py-4 text-sm leading-7 text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none sm:text-base"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              type="text"
              value={dreamTitle}
              onChange={(e) => setDreamTitle(e.target.value)}
              placeholder={t(currentLang, 'Başlık', 'Title')}
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none"
            />

            <input
              type="date"
              value={dreamDate}
              onChange={(e) => setDreamDate(e.target.value)}
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white focus:border-violet-400/35 focus:outline-none"
            />

            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t(currentLang, 'Konum', 'Location')}
              className="w-full rounded-[1.2rem] border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-400/35 focus:outline-none"
            />

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

          {submitError && (
            <div className="rounded-[1.25rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || !dreamText.trim()}
              className="inline-flex items-center justify-center gap-3 rounded-[1.3rem] border border-violet-300/20 bg-violet-500/14 px-5 py-3.5 text-sm font-medium text-violet-50 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-100 border-t-transparent" />
              )}
              <span>
                {submitting
                  ? t(currentLang, 'Rüya analiz ediliyor...', 'Analyzing dream...')
                  : 'Submit Dream'}
              </span>
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-[1.3rem] border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white/80 transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t(currentLang, 'Temizle', 'Reset')}
            </button>
          </div>
        </div>
      </form>

      {showAnalysisView && analysisDream && (
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/75 backdrop-blur-xl sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t(currentLang, 'Rüya Analizi', 'Dream Analysis')}
          onClick={() => setShowAnalysisView(false)}
        >
          <div
            className="relative z-10 w-full sm:max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[94vh] w-full overflow-hidden rounded-t-[2rem] border border-white/10 bg-[#050713]/95 shadow-[0_30px_100px_rgba(0,0,0,0.58)] sm:rounded-[2.2rem]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/60">
                  {t(currentLang, 'Rüya Analizi', 'Dream Analysis')}
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setShowAnalysisView(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
                  aria-label={t(currentLang, 'Kapat', 'Close')}
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