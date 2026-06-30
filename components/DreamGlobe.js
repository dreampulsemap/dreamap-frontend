import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

// 100+ ŞEHİR KOORDİNATI
const locationCoords = {
  // TÜRKİYE
  'Turkey': { lat: 39, lng: 35 },
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 },
  'Izmir': { lat: 38.4237, lng: 27.1428 },
  'Bursa': { lat: 40.1826, lng: 29.0669 },
  'Antalya': { lat: 36.8969, lng: 30.7133 },
  'Adana': { lat: 37.0000, lng: 35.3213 },
  'Gaziantep': { lat: 37.0662, lng: 37.3833 },
  'Konya': { lat: 37.8746, lng: 32.4932 },
  'Diyarbakir': { lat: 37.9144, lng: 40.2306 },
  'Trabzon': { lat: 41.0027, lng: 39.7168 },
  'Kayseri': { lat: 38.7333, lng: 35.4833 },
  
  // KUZEY AMERİKA
  'United States': { lat: 37.0902, lng: -95.7129 },
  'USA': { lat: 37.0902, lng: -95.7129 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Phoenix': { lat: 33.4484, lng: -112.0740 },
  'Philadelphia': { lat: 39.9526, lng: -75.1652 },
  'San Antonio': { lat: 29.4241, lng: -98.4936 },
  'San Diego': { lat: 32.7157, lng: -117.1611 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'San Jose': { lat: 37.3382, lng: -121.8863 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Austin': { lat: 30.2672, lng: -97.7431 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Denver': { lat: 39.7392, lng: -104.9903 },
  'Boston': { lat: 42.3601, lng: -71.0589 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 },
  'Detroit': { lat: 42.3314, lng: -83.0458 },
  'Washington': { lat: 38.9072, lng: -77.0369 },
  'Washington DC': { lat: 38.9072, lng: -77.0369 },
  'Portland': { lat: 45.5152, lng: -122.6784 },
  'Minneapolis': { lat: 44.9778, lng: -93.2650 },
  'Nashville': { lat: 36.1627, lng: -86.7816 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Calgary': { lat: 51.0447, lng: -114.0719 },
  'Ottawa': { lat: 45.4215, lng: -75.6972 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Guadalajara': { lat: 20.6597, lng: -103.3496 },
  'Monterrey': { lat: 25.6866, lng: -100.3161 },
  'Cancun': { lat: 21.1619, lng: -86.8515 },
  
  // AVRUPA
  'United Kingdom': { lat: 55.3781, lng: -3.4360 },
  'UK': { lat: 55.3781, lng: -3.4360 },
  'England': { lat: 52.3555, lng: -1.1743 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'Birmingham': { lat: 52.4862, lng: -1.8904 },
  'Liverpool': { lat: 53.4084, lng: -2.9916 },
  'Edinburgh': { lat: 55.9533, lng: -3.1883 },
  'Glasgow': { lat: 55.8642, lng: -4.2518 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Hamburg': { lat: 53.5511, lng: 9.9937 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Cologne': { lat: 50.9375, lng: 6.9603 },
  'Stuttgart': { lat: 48.7758, lng: 9.1829 },
  'France': { lat: 46.6034, lng: 1.8883 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Marseille': { lat: 43.2965, lng: 5.3698 },
  'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Nice': { lat: 43.7102, lng: 7.2620 },
  'Toulouse': { lat: 43.6047, lng: 1.4442 },
  'Bordeaux': { lat: 44.8378, lng: -0.5792 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Valencia': { lat: 39.4699, lng: -0.3763 },
  'Seville': { lat: 37.3891, lng: -5.9845 },
  'Bilbao': { lat: 43.2630, lng: -2.9350 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Milan': { lat: 45.4642, lng: 9.1900 },
  'Naples': { lat: 40.8518, lng: 14.2681 },
  'Venice': { lat: 45.4408, lng: 12.3155 },
  'Florence': { lat: 43.7696, lng: 11.2558 },
  'Turin': { lat: 45.0703, lng: 7.6869 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Rotterdam': { lat: 51.9244, lng: 4.4777 },
  'Belgium': { lat: 50.5039, lng: 4.4699 },
  'Brussels': { lat: 50.8503, lng: 4.3517 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Zurich': { lat: 47.3769, lng: 8.5417 },
  'Geneva': { lat: 46.2044, lng: 6.1432 },
  'Austria': { lat: 47.5162, lng: 14.5501 },
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Poland': { lat: 51.9194, lng: 19.1451 },
  'Warsaw': { lat: 52.2297, lng: 21.0122 },
  'Krakow': { lat: 50.0647, lng: 19.9450 },
  'Czech Republic': { lat: 49.8175, lng: 15.4730 },
  'Prague': { lat: 50.0755, lng: 14.4378 },
  'Hungary': { lat: 47.1625, lng: 19.5033 },
  'Budapest': { lat: 47.4979, lng: 19.0402 },
  'Portugal': { lat: 39.3999, lng: -8.2245 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'Porto': { lat: 41.1579, lng: -8.6291 },
  'Greece': { lat: 39.0742, lng: 21.8243 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Stockholm': { lat: 59.3293, lng: 18.0686 },
  'Norway': { lat: 60.4720, lng: 8.4689 },
  'Oslo': { lat: 59.9139, lng: 10.7522 },
  'Denmark': { lat: 56.2639, lng: 9.5018 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 },
  'Finland': { lat: 61.9241, lng: 25.7482 },
  'Helsinki': { lat: 60.1699, lng: 24.9384 },
  'Ireland': { lat: 53.4129, lng: -8.2439 },
  'Dublin': { lat: 53.3498, lng: -6.2603 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'Moscow': { lat: 55.7558, lng: 37.6173 },
  'Saint Petersburg': { lat: 59.9311, lng: 30.3609 },
  
  // ASYA
  'China': { lat: 35.8617, lng: 104.1954 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Guangzhou': { lat: 23.1291, lng: 113.2644 },
  'Shenzhen': { lat: 22.5431, lng: 114.0579 },
  'Chengdu': { lat: 30.5728, lng: 104.0668 },
  'Hangzhou': { lat: 30.2741, lng: 120.1551 },
  "Xi'an": { lat: 34.3416, lng: 108.9398 },
  'Wuhan': { lat: 30.5928, lng: 114.3055 },
  'Nanjing': { lat: 32.0603, lng: 118.7969 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Osaka': { lat: 34.6937, lng: 135.5023 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 },
  'Yokohama': { lat: 35.4437, lng: 139.6380 },
  'Nagoya': { lat: 35.1815, lng: 136.9066 },
  'Sapporo': { lat: 43.0642, lng: 141.3469 },
  'Fukuoka': { lat: 33.5904, lng: 130.4017 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'New Delhi': { lat: 28.6139, lng: 77.2090 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Busan': { lat: 35.1796, lng: 129.0756 },
  'Thailand': { lat: 15.8700, lng: 100.9925 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Malaysia': { lat: 4.2105, lng: 101.9758 },
  'Kuala Lumpur': { lat: 3.1390, lng: 101.6869 },
  'Indonesia': { lat: -0.7893, lng: 113.9213 },
  'Jakarta': { lat: -6.2088, lng: 106.8456 },
  'Bali': { lat: -8.3405, lng: 115.0920 },
  'Philippines': { lat: 12.8797, lng: 121.7740 },
  'Manila': { lat: 14.5995, lng: 120.9842 },
  'Vietnam': { lat: 14.0583, lng: 108.2772 },
  'Hanoi': { lat: 21.0285, lng: 105.8542 },
  'Ho Chi Minh City': { lat: 10.8231, lng: 106.6297 },
  'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'UAE': { lat: 23.4241, lng: 53.8478 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Jeddah': { lat: 21.5433, lng: 39.1728 },
  'Israel': { lat: 31.0461, lng: 34.8516 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
  'Jerusalem': { lat: 31.7683, lng: 35.2137 },
  'Pakistan': { lat: 30.3753, lng: 69.3451 },
  'Karachi': { lat: 24.8607, lng: 67.0011 },
  'Lahore': { lat: 31.5204, lng: 74.3587 },
  'Islamabad': { lat: 33.6844, lng: 73.0479 },
  'Bangladesh': { lat: 23.6850, lng: 90.3563 },
  'Dhaka': { lat: 23.8103, lng: 90.4125 },
  'Iran': { lat: 32.4279, lng: 53.6880 },
  'Tehran': { lat: 35.6892, lng: 51.3890 },
  'Egypt': { lat: 26.8206, lng: 30.8025 },
  'Cairo': { lat: 30.0444, lng: 31.2357 },
  
  // AFRİKA
  'Morocco': { lat: 31.7917, lng: -7.0926 },
  'Casablanca': { lat: 33.5731, lng: -7.5898 },
  'Marrakech': { lat: 31.6295, lng: -7.9811 },
  'Nigeria': { lat: 9.0820, lng: 8.6753 },
  'Lagos': { lat: 6.5244, lng: 3.3792 },
  'Kenya': { lat: -0.0236, lng: 37.9062 },
  'Nairobi': { lat: -1.2864, lng: 36.8172 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Johannesburg': { lat: -26.2041, lng: 28.0473 },
  'Cape Town': { lat: -33.9249, lng: 18.4241 },
  'Ethiopia': { lat: 9.1450, lng: 40.4897 },
  'Addis Ababa': { lat: 9.0320, lng: 38.7469 },
  
  // GÜNEY AMERİKA
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Sao Paulo': { lat: -23.5505, lng: -46.6333 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Brasilia': { lat: -15.8267, lng: -47.9218 },
  'Argentina': { lat: -38.4161, lng: -63.6167 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'Chile': { lat: -35.6751, lng: -71.5430 },
  'Santiago': { lat: -33.4489, lng: -70.6693 },
  'Colombia': { lat: 4.5709, lng: -74.2973 },
  'Bogota': { lat: 4.7110, lng: -74.0721 },
  'Medellin': { lat: 6.2442, lng: -75.5812 },
  'Peru': { lat: -9.1900, lng: -75.0152 },
  'Lima': { lat: -12.0464, lng: -77.0428 },
  'Venezuela': { lat: 6.4238, lng: -66.5897 },
  'Caracas': { lat: 10.4806, lng: -66.9036 },
  
  // OKYANUSYA
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Brisbane': { lat: -27.4698, lng: 153.0251 },
  'Perth': { lat: -31.9505, lng: 115.8605 },
  'New Zealand': { lat: -40.9006, lng: 174.8860 },
  'Auckland': { lat: -36.8485, lng: 174.7633 },
  'Wellington': { lat: -41.2865, lng: 174.7762 },
  
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

export default function DreamGlobe() {
  const globeContainer = useRef(null)
  const [dreams, setDreams] = useState([])
  const [selectedDream, setSelectedDream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDreams()
  }, [])

  async function fetchDreams() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      
      if (error) throw error
      console.log('✅ Fetched dreams:', data?.length)
      setDreams(data || [])
    } catch (err) {
      console.error('❌ Error fetching dreams:', err)
      setError('Failed to load dreams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!globeContainer.current || dreams.length === 0) return
    if (typeof window.Globe === 'undefined') {
      console.error('❌ Globe.gl CDN yüklenemedi')
      setError('Globe library not loaded. Please refresh.')
      return
    }

    let globe = null

    function initGlobe() {
      try {
        console.log('🌍 Initializing globe...')
        
        const pointsData = dreams
          .map(dream => {
            const coords = getCoords(dream.location_name)
            if (!coords) return null
            return {
              lat: coords.lat,
              lng: coords.lng,
              size: 0.5,
              color: getColorBySentiment(dream.ai_sentiment),
              dream: dream
            }
          })
          .filter(p => p !== null)

        console.log('📍 Points data:', pointsData.length)

        if (pointsData.length === 0) {
          setError('No dreams with valid locations')
          return
        }

        globe = window.Globe()
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
          .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .pointsData(pointsData)
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude(0.01)
          .pointRadius(0.5)
          .pointColor('color')
          .onPointClick((point) => {
            console.log('🎯 Point clicked:', point.dream)
            setSelectedDream(point.dream)
          })

        if (globeContainer.current) {
          globeContainer.current.innerHTML = ''
          globe(globeContainer.current)
          
          const width = window.innerWidth
          const height = window.innerHeight
          globe.width(width)
          globe.height(height)

          const controls = globe.controls()
          controls.autoRotate = true
          controls.autoRotateSpeed = 0.5
          controls.enableZoom = true
        }

        console.log('✅ Globe initialized successfully')
      } catch (err) {
        console.error('❌ Error initializing globe:', err)
        setError('Failed to load 3D globe: ' + err.message)
      }
    }

    // CDN yüklenmesi için kısa bekleme
    setTimeout(initGlobe, 500)

    return () => {
      if (globe && globeContainer.current) {
        globeContainer.current.innerHTML = ''
      }
    }
  }, [dreams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">🌍 Loading globe...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-8">
        <div className="text-red-400 text-xl mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="glass-card px-6 py-3 text-white hover:bg-white/10"
        >
          🔁 Retry
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div 
        ref={globeContainer} 
        className="w-full h-full"
        style={{ width: '100vw', height: '100vh' }}
      />

      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between pointer-events-auto">
          <div>
            <h1 className="text-3xl font-bold text-white glow-text">🌍 Dream Globe</h1>
            <p className="text-white/60 text-sm mt-1">{dreams.length} dreams from around the world</p>
          </div>
          <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white transition-colors">
            ← Back to Feed
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 glass-card p-4 max-w-xs pointer-events-auto z-10">
        <h3 className="text-white font-semibold mb-3">Emotion Colors</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['Fear', '#ef4444'],
            ['Anxiety', '#f97316'],
            ['Joy', '#22c55e'],
            ['Peace', '#3b82f6'],
            ['Sadness', '#6366f1'],
            ['Awe', '#a855f7']
          ].map(([emotion, color]) => (
            <div key={emotion} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-white/80">{emotion}</span>
            </div>
          ))}
        </div>
      </div>

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
