import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const locationCoords = {
  Turkey: { lat: 39, lng: 35 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  'United States': { lat: 37.0902, lng: -95.7129 },
  'New York': { lat: 40.7128, lng: -74.006 },
  London: { lat: 51.5074, lng: -0.1278 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Berlin: { lat: 52.52, lng: 13.405 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Beijing: { lat: 39.9042, lng: 116.4074 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  Moscow: { lat: 55.7558, lng: 37.6173 },
  'Sao Paulo': { lat: -23.5505, lng: -46.6333 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  Unknown: { lat: 0, lng: 0 },
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
    Fear: '#ef4444',
    Anxiety: '#f97316',
    Awe: '#a855f7',
    Joy: '#22c55e',
    Confusion: '#eab308',
    Peace: '#3b82f6',
    Sadness: '#6366f1',
    Anger: '#dc2626',
    Surprise: '#ec4899',
  }

  return colors[sentiment] || '#8b5cf6'
}

export default function MiniGlobe() {
  const globeContainer = useRef(null)
  const [dreams, setDreams] = useState([])
  const [ready, setReady] = useState(false)

  const globeSize = 320

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('dreams')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        setDreams(data || [])
      } catch (error) {
        console.error('MiniGlobe load error:', error)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!globeContainer.current || dreams.length === 0) return
    if (typeof window.Globe === 'undefined') return

    let globe = null
    let timeoutId = null

    function init() {
      try {
        const pointsData = dreams
          .map((dream) => {
            const coords = getCoords(dream.location_name)
            if (!coords) return null

            return {
              lat: coords.lat,
              lng: coords.lng,
              color: getColorBySentiment(dream.ai_sentiment),
            }
          })
          .filter(Boolean)

        if (pointsData.length === 0) {
          setReady(true)
          return
        }

        globe = window
          .Globe()
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
          .backgroundColor('rgba(0,0,0,0)')
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
          globe.width(globeSize)
          globe.height(globeSize)

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

    timeoutId = window.setTimeout(init, 300)

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
      if (globeContainer.current) {
        globeContainer.current.innerHTML = ''
      }
    }
  }, [dreams])

  return (
    <Link
      href="/globe"
      className="group mx-auto flex w-full max-w-[320px] flex-col items-center"
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: globeSize, height: globeSize }}
      >
        <div className="absolute inset-0 rounded-full bg-cyan-400/10 blur-2xl opacity-70" />

        <div
          ref={globeContainer}
          className="relative z-10 h-80 w-80 overflow-hidden rounded-full border-2 border-purple-500/30 glow-border transition-all duration-300 group-hover:border-cyan-400/50 group-hover:scale-[1.02]"
        />

        {!ready && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full">
            <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-center text-sm text-white/70 backdrop-blur-md animate-pulse">
              Loading...
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/80 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1">
        🌍 Explore Full Globe →
      </div>
    </Link>
  )
}
