import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'

const locationCoords = {
  Turkey: { lat: 39, lng: 35 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  Ankara: { lat: 39.9334, lng: 32.8597 },
  Osmaniye: { lat: 37.0741, lng: 36.2478 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  Russia: { lat: 61.524, lng: 105.3188 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  France: { lat: 46.6034, lng: 1.8883 },
  'United Kingdom': { lat: 55.3781, lng: -3.436 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  China: { lat: 35.8617, lng: 104.1954 },
  India: { lat: 20.5937, lng: 78.9629 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  Unknown: { lat: 0, lng: 0 }
}

const supportedLanguages = [
  { code: 'en', label: 'EN' },
  { code: 'tr', label: 'TR' },
  { code: 'de', label: 'DE' },
  { code: 'fr', label: 'FR' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'ru', label: 'RU' },
  { code: 'ja', label: 'JA' }
]

function getCoords(location) {
  if (!location) return null
  if (locationCoords[location]) return locationCoords[location]
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return coords
  }
  return null
}

function getColorBySentiment(sentiment) {
  const colors = {
    Fear: '#ef4444',
    Anxiety: '#f97316',
    Joy: '#22c55e',
    Peace: '#3b82f6',
    Sadness: '#6366f1',
    Awe: '#a855f7',
    Confusion: '#eab308',
    Anger: '#dc2626',
    Surprise: '#ec4899'
  }
  return colors[sentiment] || '#8b5cf6'
}

function getStableRandom(id, range = 0.4) {
  if (!id) return 0
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
  }
  return ((Math.abs(hash) % 100) / 100) * range - range / 2
}

export default function DreamGlobe() {
  const { i18n, t } = useTranslation()
  const lang = (i18n.language || 'en').split('-')[0]

  const globeContainer = useRef(null)
  const globeInstance = useRef(null)

  const [dreams, setDreams] = useState([])
  const [predictions, setPredictions] = useState([])
  const [selectedDream, setSelectedDream] = useState(null)
  const [selectedPrediction, setSelectedPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [translatingDreams, setTranslatingDreams] = useState({})

  const getDreamAnalysis = (dream) =>
    dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en || ''

  const getDreamMotiv = (dream) =>
    dream[`ai_motiv_${lang}`] || dream.ai_motiv || dream.ai_motiv_en || ''

  const getDreamImage = (dream) => dream.ai_image_url || null

  const getTranslatedContent = (dream) => {
    const trans = translatingDreams[dream.id]
    return trans?.translated ? trans.translatedContent : dream.content
  }

  const getTranslatedAnalysis = (dream) => {
    const trans = translatingDreams[dream.id]
    return trans?.translated ? trans.translatedAnalysis : getDreamAnalysis(dream)
  }

  const changeLanguage = async (newLang) => {
    await i18n.changeLanguage(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lunosfer_lang', newLang)
    }
  }

  async function handleTranslateDream(dream) {
    const dreamId = dream.id

    if (translatingDreams[dreamId]?.translated) {
      setTranslatingDreams((prev) => ({
        ...prev,
        [dreamId]: { ...prev[dreamId], translated: false }
      }))
      return
    }

    setTranslatingDreams((prev) => ({
      ...prev,
      [dreamId]: { ...prev[dreamId], loading: true }
    }))

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamText: dream.content,
          analysisText: getDreamAnalysis(dream),
          targetLang: (i18n.language || 'en').split('-')[0],
          dreamId: dream.id
        })
      })

      const data = await res.json()

      if (data.translated) {
        setTranslatingDreams((prev) => ({
          ...prev,
          [dreamId]: {
            translated: true,
            translatedContent: data.translated,
            translatedAnalysis: data.analysisTranslated,
            loading: false
          }
        }))
      }
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setTranslatingDreams((prev) => ({
        ...prev,
        [dreamId]: { ...prev[dreamId], loading: false }
      }))
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lunosfer_lang')
      if (savedLang && savedLang !== lang) {
        i18n.changeLanguage(savedLang)
      }
    }
  }, [i18n, lang])

  useEffect(() => {
    async function fetchData() {
      const [dreamsRes, predRes] = await Promise.all([
        supabase.from('dreams').select('*').eq('in_feed', true).order('created_at', { ascending: false }).limit(2000),
        supabase.from('collective_predictions').select('*').order('created_at', { ascending: false }).limit(5)
      ])

      setDreams(dreamsRes.data || [])
      setPredictions(predRes.data || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !globeContainer.current) return
    if (typeof window.Globe === 'undefined') {
      setError(t('globe.libraryFailed', 'Three Globe library could not be loaded'))
      return
    }

    const pointsData = dreams
      .map((dream) => {
        let lat = dream.latitude
        let lng = dream.longitude

        if (!lat || !lng) {
          const coords = getCoords(dream.location_name)
          if (coords) {
            lat = coords.lat
            lng = coords.lng
          } else {
            return null
          }
        }

        const latJitter = getStableRandom(dream.id, 0.3)
        const lngJitter = getStableRandom(dream.id, 0.3)
        const altJitter = Math.abs(getStableRandom(dream.id, 0.02))

        return {
          lat: lat + latJitter,
          lng: lng + lngJitter,
          altitude: 0.01 + altJitter,
          radius: 0.6,
          color: getColorBySentiment(dream.ai_sentiment),
          dream
        }
      })
      .filter(Boolean)

    if (globeInstance.current) {
      globeInstance.current.pointsData(pointsData)
      return
    }

    function initGlobe() {
      try {
        const globe = window.Globe()
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
          .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .pointsData(pointsData)
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude('altitude')
          .pointRadius('radius')
          .pointColor('color')
          .pointsMerge(false)
          .onPointHover((point) => {
            if (globeContainer.current) {
              globeContainer.current.style.cursor = point ? 'pointer' : 'default'
            }
          })
          .onPointClick((point) => {
            setSelectedDream(point.dream)
          })

        globeContainer.current.innerHTML = ''
        globe(globeContainer.current)
        globe.width(window.innerWidth)
        globe.height(window.innerHeight)

        const controls = globe.controls()
        controls.autoRotate = false
        controls.autoRotateSpeed = 0
        controls.enableZoom = true
        controls.enablePan = true

        globeInstance.current = globe
      } catch (err) {
        console.error('Globe init error:', err)
        setError(`${t('globe.initFailed', 'Globe could not be initialized')}: ${err.message}`)
      }
    }

    setTimeout(initGlobe, 300)

    return () => {
      if (globeInstance.current && globeContainer.current) {
        globeContainer.current.innerHTML = ''
        globeInstance.current = null
      }
    }
  }, [dreams, t])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">
          {t('globe.loading', 'Loading...')}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={globeContainer} className="w-full h-full" style={{ width: '100vw', height: '100vh' }} />

      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/90 to-transparent pointer-events-none z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2 glass-card px-3 py-2 hover:bg-white/10">
              <img src="/logo.png" alt="Lunosfer" className="w-8 h-8 object-contain" />
              <span className="font-bold">Lunosfer</span>
            </a>

            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="glass-card px-3 py-2 bg-black/40 text-white text-sm outline-none border border-white/10 rounded-lg"
              aria-label={t('common.language', 'Language')}
            >
              {supportedLanguages.map((item) => (
                <option key={item.code} value={item.code} className="bg-black text-white">
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <a href="/" className="glass-card px-3 py-2 text-white/80 hover:text-white whitespace-nowrap">
            ← {t('common.back', 'Back')}
          </a>
        </div>
      </div>

      {predictions.length > 0 && (
        <div className="absolute z-20 pointer-events-auto top-20 left-3 right-3 sm:top-24 sm:left-6 sm:right-auto sm:max-w-sm">
          <div className="glass-card p-3 sm:p-4 max-h-[38vh] sm:max-h-[70vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold gradient-text mb-3">
              🔮 {t('globe.collectivePredictions', 'Collective Predictions')}
            </h3>

            <div className="space-y-2">
              {predictions.map((pred) => (
                <button
                  key={pred.id}
                  onClick={() => setSelectedPrediction(pred)}
                  className="w-full text-left glass-card p-3 hover:bg-purple-500/20 transition-all"
                >
                  <div className="text-sm font-semibold">
                    {pred[`title_${lang}`] || pred.title_en || pred.title}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {pred.dream_count} {t('globe.dreamCount', 'dreams')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedDream && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedDream(null)} />
          <div className="relative glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedDream(null)} className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white">×</button>

            {getDreamImage(selectedDream) && (
              <div className="w-full h-64 mb-6 overflow-hidden rounded-lg bg-black">
                <img
                  src={getDreamImage(selectedDream)}
                  alt={selectedDream.location_name || 'Dream image'}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            )}

            <h3 className="text-xl font-bold mb-4">📍 {selectedDream.location_name}</h3>

            {selectedDream.ai_archetypes?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDream.ai_archetypes.map((a, i) => (
                  <span key={i} className="glass-card px-3 py-1 text-xs text-purple-300">{a}</span>
                ))}
              </div>
            )}

            {getTranslatedContent(selectedDream) ? (
              <p className="text-white/90 mb-6 whitespace-pre-wrap">{getTranslatedContent(selectedDream)}</p>
            ) : (
              <p className="text-white/40 italic mb-6">{t('globe.deletedContent', '[Content deleted]')}</p>
            )}

            {selectedDream.original_language !== lang && selectedDream.content && (
              <button
                onClick={() => handleTranslateDream(selectedDream)}
                disabled={translatingDreams[selectedDream.id]?.loading}
                className="w-full glass-card px-4 py-2 mb-4 text-sm hover:bg-purple-500/20 transition-all disabled:opacity-50"
              >
                {translatingDreams[selectedDream.id]?.loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    {t('globe.translating', 'Translating...')}
                  </span>
                ) : translatingDreams[selectedDream.id]?.translated ? (
                  t('globe.showOriginal', 'Show original')
                ) : (
                  t('globe.translateToLanguage', { lang: lang.toUpperCase(), defaultValue: 'Translate to {{lang}}' })
                )}
              </button>
            )}

            {getTranslatedAnalysis(selectedDream) && (
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-6">
                <div className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  <span>🔮</span> {t('globe.jungianAnalysis', 'Jungian Analysis')}
                </div>
                <p className="text-white/80 text-sm mb-2">{getTranslatedAnalysis(selectedDream)}</p>
                {getDreamMotiv(selectedDream) && (
                  <p className="text-white/60 text-xs italic pt-2 border-t border-purple-500/30">
                    💫 {getDreamMotiv(selectedDream)}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-white/60 pt-4 border-t border-white/10">
              <span>📅 {selectedDream.dream_date}</span>
              <span>💭 {selectedDream.ai_sentiment}</span>
            </div>
          </div>
        </div>
      )}

      {selectedPrediction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedPrediction(null)} />
          <div className="relative glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedPrediction(null)} className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white">×</button>
            <h2 className="text-2xl font-bold gradient-text mb-4">
              🔮 {selectedPrediction[`title_${lang}`] || selectedPrediction.title_en || selectedPrediction.title}
            </h2>
            <p className="text-white/90 mb-6 whitespace-pre-wrap">
              {selectedPrediction[`content_${lang}`] || selectedPrediction.content_en || selectedPrediction.content}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPrediction.themes?.map((theme, i) => (
                <span key={i} className="glass-card px-3 py-1 text-xs">#{theme}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-card p-6 text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}