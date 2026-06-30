import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// Lokasyon → Koordinat mapping
const locationCoords = {
  'Turkey': { lat: 39, lng: 35 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'France': { lat: 46.6034, lng: 1.8883 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'Moscow': { lat: 55.7558, lng: 37.6173 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Norway': { lat: 60.4720, lng: 8.4689 },
  'Unknown': { lat: 0, lng: 0 }
}

function getCoords(location) {
  if (!location || location === 'Unknown') return null
  
  // Tam eşleşme dene
  if (locationCoords[location]) {
    return locationCoords[location]
  }
  
  // Kısmi eşleşme dene
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (location.toLowerCase().includes(key.toLowerCase())) {
      return coords
    }
  }
  
  return null
}

export default function DreamGlobe() {
  const globeRef = useRef()
  const [dreams, setDreams] = useState([])
  const [selectedDream, setSelectedDream] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDreams()
  }, [])

  async function fetchDreams() {
    setLoading(true)
    const { data, error } = await supabase
      .from('dreams')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    
    if (error) {
      console.error('Error:', error)
    } else {
      setDreams(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!globeRef.current || dreams.length === 0) return

    const globe = globeRef.current
    
    // Veri noktaları
    const pointsData = dreams
      .map(dream => {
        const coords = getCoords(dream.location_name)
        if (!coords) return null
        return {
          lat: coords.lat,
          lng: coords.lng,
          size: 0.3,
          color: getColorBySentiment(dream.ai_sentiment),
          dream: dream
        }
      })
      .filter(p => p !== null)

    globe
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .pointsData(pointsData)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude('size')
      .pointColor('color')
      .pointsMerge(true)
      .onPointClick((point) => {
        setSelectedDream(point.dream)
      })
      .width(window.innerWidth)
      .height(window.innerHeight)

    // Otomatik rotasyon
    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controls.enableZoom = true

  }, [dreams])

  function getColorBySentiment(sentiment) {
    const colors = {
      'Fear': '#ef4444',
      'Anxiety': '#f97316',
      'Awe': '#a855f7',
      'Joy': '#22c55e',
      'Confusion': '#eab308',
      'Peace': '#3b82f6',
      'Sadness': '#6366f1',
      'Anger': '#dc2626',
      'Surprise': '#ec4899'
    }
    return colors[sentiment] || '#8b5cf6'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading globe...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Globe Container */}
      <div ref={globeRef} className="w-full h-full" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white glow-text">🌍 Dream Globe</h1>
            <p className="text-white/60 text-sm mt-1">{dreams.length} dreams from around the world</p>
          </div>
          <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white transition-colors">
            ← Back to Feed
          </a>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 glass-card p-4 max-w-xs">
        <h3 className="text-white font-semibold mb-3">Emotion Colors</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {Object.entries({
            'Fear': '#ef4444',
            'Anxiety': '#f97316',
            'Joy': '#22c55e',
            'Peace': '#3b82f6',
            'Sadness': '#6366f1',
            'Awe': '#a855f7'
          }).map(([emotion, color]) => (
            <div key={emotion} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-white/80">{emotion}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Dream Popup */}
      {selectedDream && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-card p-6 max-w-md z-50">
          <button
            onClick={() => setSelectedDream(null)}
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
          
          <h3 className="text-xl font-bold text-white mb-3">
            📍 {selectedDream.location_name}
          </h3>
          
          <p className="text-white/90 mb-4 leading-relaxed">
            {selectedDream.content}
          </p>
          
          <div className="glass-card p-4 mb-4" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
            <div className="text-sm font-semibold text-purple-300 mb-2">Jungian Analysis</div>
            <p className="text-white/80 text-sm">
              {selectedDream.ai_summary}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedDream.ai_archetypes?.map((arch, i) => (
              <span key={i} className="archetype-badge text-xs">
                {arch}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-white/60">
            <span>📅 {selectedDream.dream_date}</span>
            <span>💭 {selectedDream.ai_sentiment}</span>
            <span>🌍 {selectedDream.original_language?.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  )
        }
