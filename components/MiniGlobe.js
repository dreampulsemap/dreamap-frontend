import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const locationCoords = {
  'Turkey': { lat: 39, lng: 35 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Moscow': { lat: 55.7558, lng: 37.6173 },
  'Sao Paulo': { lat: -23.5505, lng: -46.6333 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Unknown': { lat: 0, lng: 0 }
}

function getCoords(location) {
  if (!location || location === 'Unknown') return null
  if (locationCoords[location]) return locationCoords[location]
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (location.toLowerCase().includes(key.toLowerCase())) return coords
  }
  return null
}

function getColorBySentiment(sentiment) {
  const colors = {
    'Fear': '#ef4444', 'Anxiety': '#f97316', 'Awe': '#a855f7',
    'Joy': '#22c55e', 'Confusion': '#eab308', 'Peace': '#3b82f6',
    'Sadness': '#6366f1', 'Anger': '#dc2626', 'Surprise': '#ec4899'
  }
  return colors[sentiment] || '#8b5cf6'
}

export default function MiniGlobe() {
  const globeContainer = useRef(null)
  const [dreams, setDreams] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setDreams(data || [])
    }
    load()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!globeContainer.current || dreams.length === 0) return
    if (typeof window.Globe === 'undefined') return

    let globe = null

    function init() {
      try {
        const pointsData = dreams
          .map(dream => {
            const coords = getCoords(dream.location_name)
            if (!coords) return null
            return {
              lat: coords.lat,
              lng: coords.lng,
              color: getColorBySentiment(dream.ai_sentiment)
            }
          })
          .filter(p => p !== null)

        if (pointsData.length === 0) return

        globe = window.Globe()
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .pointsData(pointsData)
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude(0.01)
          .pointRadius(0.3)
          .pointColor('color')
          .enablePointerInteraction(false)

        if (globeContainer.current) {
          globeContainer.current.innerHTML = ''
          globe(globeContainer.current)
          globe.width(320)
          globe.height(320)

          // ✅ MİNİ GLOBE SÜREKLİ DÖNER
          const controls = globe.controls()
          controls.autoRotate = true
          controls.autoRotateSpeed = 1.5
          controls.enableZoom = false
          controls.enablePan = false
        }

        setReady(true)
      } catch (err) {
        console.error('MiniGlobe error:', err)
      }
    }

    setTimeout(init, 500)

    return () => {
      if (globe && globeContainer.current) {
        globeContainer.current.innerHTML = ''
      }
    }
  }, [dreams])

  return (
    <a href="/globe" className="block relative group">
      <div 
        ref={globeContainer}
        className="w-80 h-80 rounded-full overflow-hidden border-2 border-purple-500/30 group-hover:border-purple-500/70 transition-all glow-border cursor-pointer"
        style={{ width: '320px', height: '320px' }}
      />
      
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/60 text-sm animate-pulse">Loading...</div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 glass-card px-4 py-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-sm">🌍 Explore Full Globe →</span>
      </div>
    </a>
  )
}
