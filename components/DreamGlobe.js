import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

const locationCoords = {
  'Turkey': { lat: 39, lng: 35 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'Osmaniye': { lat: 37.0741, lng: 36.2478 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'France': { lat: 46.6034, lng: 1.8883 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Unknown': { lat: 0, lng: 0 }
}

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
    'Fear': '#ef4444', 'Anxiety': '#f97316', 'Joy': '#22c55e',
    'Peace': '#3b82f6', 'Sadness': '#6366f1', 'Awe': '#a855f7',
    'Confusion': '#eab308', 'Anger': '#dc2626', 'Surprise': '#ec4899'
  }
  return colors[sentiment] || '#8b5cf6'
}

function getStableRandom(id, range = 0.4) {
  if (!id) return 0
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
  }
  return (Math.abs(hash) % 100) / 100 * range - (range / 2)
}

export default function DreamGlobe() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'
  const globeContainer = useRef(null)
  const globeInstance = useRef(null)
  const [dreams, setDreams] = useState([])
  const [predictions, setPredictions] = useState([])
  const [selectedDream, setSelectedDream] = useState(null)
  const [selectedPrediction, setSelectedPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getDreamAnalysis = (dream) => dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en || ''
  const getDreamMotiv = (dream) => dream[`ai_motiv_${lang}`] || dream.ai_motiv || dream.ai_motiv_en || ''
  const getDreamImage = (dream) => dream.ai_image_url || null

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
      setError('Three Globe kütüphanesi yüklenemedi')
      return
    }

    const pointsData = dreams.map(dream => {
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
        dream: dream
      }
    }).filter(p => p !== null)

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

        if (globeContainer.current) {
          globeContainer.current.innerHTML = ''
          globe(globeContainer.current)
          globe.width(window.innerWidth)
          globe.height(window.innerHeight)

          const controls = globe.controls()
          controls.autoRotate = false
          controls.autoRotateSpeed = 0
          controls.enableZoom = true
          controls.enablePan = true
        }

        globeInstance.current = globe
      } catch (err) {
        console.error('Globe init error:', err)
        setError('Globe başlatılamadı: ' + err.message)
      }
    }

    setTimeout(initGlobe, 500)

    return () => {
      if (globeInstance.current && globeContainer.current) {
        globeContainer.current.innerHTML = ''
        globeInstance.current = null
      }
    }
  }, [dreams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={globeContainer} className="w-full h-full" style={{ width: '100vw', height: '100vh' }} />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent pointer-events-none z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <a href="/" className="flex items-center gap-2 glass-card px-4 py-2 hover:bg-white/10">
            <span className="text-2xl">🌙</span>
            <span className="font-bold">Dreamap</span>
          </a>
          <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white">
            ← Geri
          </a>
        </div>
      </div>

      {/* Kolektif Öngörüler */}
      {predictions.length > 0 && (
        <div className="absolute top-24 left-6 z-20 pointer-events-auto max-w-sm">
          <div className="glass-card p-4">
            <h3 className="text-lg font-bold gradient-text mb-3">🔮 {getTranslation('predictions.title', lang)}</h3>
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
                    {pred.dream_count} {getTranslation('stats.dreams', lang).toLowerCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rüya Popup */}
      {selectedDream && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedDream(null)} />
          <div className="relative glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedDream(null)} className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white">×</button>
            
            {getDreamImage(selectedDream) && (
              <div className="w-full h-64 mb-6 overflow-hidden rounded-lg bg-black">
                <img src={getDreamImage(selectedDream)} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
              </div>
            )}

            <h3 className="text-xl font-bold mb-4"> {selectedDream.location_name}</h3>

            {selectedDream.ai_archetypes?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDream.ai_archetypes.map((a, i) => (
                  <span key={i} className="glass-card px-3 py-1 text-xs text-purple-300">{a}</span>
                ))}
              </div>
            )}

            {selectedDream.content ? (
              <p className="text-white/90 mb-6 whitespace-pre-wrap">{selectedDream.content}</p>
            ) : (
              <p className="text-white/40 italic mb-6">[İçerik silindi]</p>
            )}

            {getDreamAnalysis(selectedDream) && (
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-6">
                <div className="font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  <span>🔮</span> Jungian Analiz
                </div>
                <p className="text-white/80 text-sm mb-2">{getDreamAnalysis(selectedDream)}</p>
                {getDreamMotiv(selectedDream) && (
                  <p className="text-white/60 text-xs italic pt-2 border-t border-purple-500/30">💫 {getDreamMotiv(selectedDream)}</p>
                )}
              </div>
            )}

            <div className="flex gap-4 text-sm text-white/60 pt-4 border-t border-white/10">
              <span>📅 {selectedDream.dream_date}</span>
              <span>💭 {selectedDream.ai_sentiment}</span>
            </div>
          </div>
        </div>
      )}

      {/* Öngörü Popup */}
      {selectedPrediction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedPrediction(null)} />
          <div className="relative glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button onClick={() => setSelectedPrediction(null)} className="absolute top-4 right-4 text-2xl text-white/60 hover:text-white">×</button>
            <h2 className="text-2xl font-bold gradient-text mb-4">🔮 {selectedPrediction[`title_${lang}`] || selectedPrediction.title_en}</h2>
            <p className="text-white/90 mb-6 whitespace-pre-wrap">
              {selectedPrediction[`content_${lang}`] || selectedPrediction.content_en}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedPrediction.themes?.map((t, i) => (
                <span key={i} className="glass-card px-3 py-1 text-xs">#{t}</span>
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
