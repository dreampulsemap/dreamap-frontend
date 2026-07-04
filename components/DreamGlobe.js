import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'

const locationCoords = {
  'Turkey': { lat: 39, lng: 35 }, 'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Ankara': { lat: 39.9334, lng: 32.8597 }, 'Izmir': { lat: 38.4237, lng: 27.1428 },
  'Bursa': { lat: 40.1826, lng: 29.0669 }, 'Antalya': { lat: 36.8969, lng: 30.7133 },
  'Adana': { lat: 37.0000, lng: 35.3213 }, 'Gaziantep': { lat: 37.0662, lng: 37.3833 },
  'Konya': { lat: 37.8746, lng: 32.4932 }, 'Trabzon': { lat: 41.0027, lng: 39.7168 },
  'United States': { lat: 37.0902, lng: -95.7129 }, 'USA': { lat: 37.0902, lng: -95.7129 },
  'New York': { lat: 40.7128, lng: -74.0060 }, 'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'Chicago': { lat: 41.8781, lng: -87.6298 }, 'Houston': { lat: 29.7604, lng: -95.3698 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 }, 'Miami': { lat: 25.7617, lng: -80.1918 },
  'Boston': { lat: 42.3601, lng: -71.0589 }, 'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Las Vegas': { lat: 36.1699, lng: -115.1398 }, 'Washington': { lat: 38.9072, lng: -77.0369 },
  'Canada': { lat: 56.1304, lng: -106.3468 }, 'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 }, 'Montreal': { lat: 45.5017, lng: -73.5673 },
  'Mexico': { lat: 23.6345, lng: -102.5528 }, 'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'United Kingdom': { lat: 55.3781, lng: -3.4360 }, 'London': { lat: 51.5074, lng: -0.1278 },
  'Manchester': { lat: 53.4808, lng: -2.2426 }, 'Germany': { lat: 51.1657, lng: 10.4515 },
  'Berlin': { lat: 52.5200, lng: 13.4050 }, 'Munich': { lat: 48.1351, lng: 11.5820 },
  'Hamburg': { lat: 53.5511, lng: 9.9937 }, 'France': { lat: 46.6034, lng: 1.8883 },
  'Paris': { lat: 48.8566, lng: 2.3522 }, 'Lyon': { lat: 45.7640, lng: 4.8357 },
  'Spain': { lat: 40.4637, lng: -3.7492 }, 'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 }, 'Italy': { lat: 41.8719, lng: 12.5674 },
  'Rome': { lat: 41.9028, lng: 12.4964 }, 'Milan': { lat: 45.4642, lng: 9.1900 },
  'Venice': { lat: 45.4408, lng: 12.3155 }, 'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 }, 'Belgium': { lat: 50.5039, lng: 4.4699 },
  'Brussels': { lat: 50.8503, lng: 4.3517 }, 'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Zurich': { lat: 47.3769, lng: 8.5417 }, 'Austria': { lat: 47.5162, lng: 14.5501 },
  'Vienna': { lat: 48.2082, lng: 16.3738 }, 'Poland': { lat: 51.9194, lng: 19.1451 },
  'Warsaw': { lat: 52.2297, lng: 21.0122 }, 'Prague': { lat: 50.0755, lng: 14.4378 },
  'Budapest': { lat: 47.4979, lng: 19.0402 }, 'Portugal': { lat: 39.3999, lng: -8.2245 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 }, 'Greece': { lat: 39.0742, lng: 21.8243 },
  'Athens': { lat: 37.9838, lng: 23.7275 }, 'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Stockholm': { lat: 59.3293, lng: 18.0686 }, 'Norway': { lat: 60.4720, lng: 8.4689 },
  'Oslo': { lat: 59.9139, lng: 10.7522 }, 'Denmark': { lat: 56.2639, lng: 9.5018 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 }, 'Finland': { lat: 61.9241, lng: 25.7482 },
  'Helsinki': { lat: 60.1699, lng: 24.9384 }, 'Ireland': { lat: 53.4129, lng: -8.2439 },
  'Dublin': { lat: 53.3498, lng: -6.2603 }, 'Russia': { lat: 61.5240, lng: 105.3188 },
  'Moscow': { lat: 55.7558, lng: 37.6173 }, 'Saint Petersburg': { lat: 59.9311, lng: 30.3609 },
  'China': { lat: 35.8617, lng: 104.1954 }, 'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 }, 'Japan': { lat: 36.2048, lng: 138.2529 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 }, 'Osaka': { lat: 34.6937, lng: 135.5023 },
  'Kyoto': { lat: 35.0116, lng: 135.7681 }, 'India': { lat: 20.5937, lng: 78.9629 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 }, 'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 }, 'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 }, 'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Seoul': { lat: 37.5665, lng: 126.9780 }, 'Thailand': { lat: 15.8700, lng: 100.9925 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 }, 'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Malaysia': { lat: 4.2105, lng: 101.9758 }, 'Kuala Lumpur': { lat: 3.1390, lng: 101.6869 },
  'Indonesia': { lat: -0.7893, lng: 113.9213 }, 'Jakarta': { lat: -6.2088, lng: 106.8456 },
  'Bali': { lat: -8.3405, lng: 115.0920 }, 'Philippines': { lat: 12.8797, lng: 121.7740 },
  'Manila': { lat: 14.5995, lng: 120.9842 }, 'Vietnam': { lat: 14.0583, lng: 108.2772 },
  'Hanoi': { lat: 21.0285, lng: 105.8542 }, 'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
  'Dubai': { lat: 25.2048, lng: 55.2708 }, 'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  'Riyadh': { lat: 24.7136, lng: 46.6753 }, 'Israel': { lat: 31.0461, lng: 34.8516 },
  'Tel Aviv': { lat: 32.0853, lng: 34.7818 }, 'Jerusalem': { lat: 31.7683, lng: 35.2137 },
  'Pakistan': { lat: 30.3753, lng: 69.3451 }, 'Karachi': { lat: 24.8607, lng: 67.0011 },
  'Lahore': { lat: 31.5204, lng: 74.3587 }, 'Iran': { lat: 32.4279, lng: 53.6880 },
  'Tehran': { lat: 35.6892, lng: 51.3890 }, 'Egypt': { lat: 26.8206, lng: 30.8025 },
  'Cairo': { lat: 30.0444, lng: 31.2357 }, 'Morocco': { lat: 31.7917, lng: -7.0926 },
  'Casablanca': { lat: 33.5731, lng: -7.5898 }, 'Nigeria': { lat: 9.0820, lng: 8.6753 },
  'Lagos': { lat: 6.5244, lng: 3.3792 }, 'Kenya': { lat: -0.0236, lng: 37.9062 },
  'Nairobi': { lat: -1.2864, lng: 36.8172 }, 'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Johannesburg': { lat: -26.2041, lng: 28.0473 }, 'Cape Town': { lat: -33.9249, lng: 18.4241 },
  'Brazil': { lat: -14.2350, lng: -51.9253 }, 'Sao Paulo': { lat: -23.5505, lng: -46.6333 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 }, 'Argentina': { lat: -38.4161, lng: -63.6167 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 }, 'Chile': { lat: -35.6751, lng: -71.5430 },
  'Santiago': { lat: -33.4489, lng: -70.6693 }, 'Colombia': { lat: 4.5709, lng: -74.2973 },
  'Bogota': { lat: 4.7110, lng: -74.0721 }, 'Peru': { lat: -9.1900, lng: -75.0152 },
  'Lima': { lat: -12.0464, lng: -77.0428 }, 'Australia': { lat: -25.2744, lng: 133.7751 },
  'Sydney': { lat: -33.8688, lng: 151.2093 }, 'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Brisbane': { lat: -27.4698, lng: 153.0251 }, 'Perth': { lat: -31.9505, lng: 115.8605 },
  'New Zealand': { lat: -40.9006, lng: 174.8860 }, 'Auckland': { lat: -36.8485, lng: 174.7633 },
  'Unknown': { lat: 0, lng: 0 }
}

const languages = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'ru', flag: '🇺', name: 'Русский' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'zh', flag: '🇨', name: '中文' },
  { code: 'de', flag: '🇩', name: 'Deutsch' }
]

// Çeviri yardımcısı
function t(key) {
  const translations = {
    'predictions.title': { en: 'Collective Predictions', tr: 'Kolektif Öngörüler', ru: 'Коллективные предсказания', es: 'Predicciones Colectivas', ar: 'التنبؤات الجماعية', hi: 'सामूहिक भविष्यवाणियां', zh: '集体预测', de: 'Kollektive Vorhersagen' },
    'stats.dreams': { en: 'Dreams', tr: 'Rüya', ru: 'Сны', es: 'Sueños', ar: 'أحلام', hi: 'सपने', zh: '梦', de: 'Träume' },
    'stats.regions': { en: 'Regions', tr: 'Bölge', ru: 'Регионы', es: 'Regiones', ar: 'مناطق', hi: 'क्षेत्र', zh: '地区', de: 'Regionen' },
    'stats.themes': { en: 'Themes', tr: 'Tema', ru: 'Темы', es: 'Temas', ar: 'مواضيع', hi: 'विषय', zh: '主题', de: 'Themen' },
    'labels.regions': { en: 'Regions', tr: 'Bölgeler', ru: 'Регионы', es: 'Regiones', ar: 'المناطق', hi: 'क्षेत्र', zh: '地区', de: 'Regionen' },
    'labels.themes': { en: 'Themes', tr: 'Temalar', ru: 'Темы', es: 'Temas', ar: 'المواضيع', hi: 'विषय', zh: '主题', de: 'Themen' },
    'labels.confidence': { en: 'Confidence', tr: 'Güven', ru: 'Уверенность', es: 'Confianza', ar: 'الثقة', hi: 'विश्वास', zh: '信心', de: 'Vertrauen' },
    'confidence.critical': { en: 'Critical', tr: 'Kritik', ru: 'Критический', es: 'Crítico', ar: 'حرج', hi: 'गंभीर', zh: '关键', de: 'Kritisch' },
    'confidence.high': { en: 'High', tr: 'Yüksek', ru: 'Высокий', es: 'Alto', ar: 'عالي', hi: 'उच्च', zh: '高', de: 'Hoch' },
    'confidence.medium': { en: 'Medium', tr: 'Orta', ru: 'Средний', es: 'Medio', ar: 'متوسط', hi: 'मध्यम', zh: '中', de: 'Mittel' },
    'confidence.low': { en: 'Low', tr: 'Düşük', ru: 'Низкий', es: 'Bajo', ar: 'منخفض', hi: 'कम', zh: '低', de: 'Niedrig' },
    'dream.dreamText': { en: 'Dream Text', tr: 'Rüya Metni', ru: 'Текст сна', es: 'Texto del sueño', ar: 'نص الحلم', hi: 'सपना पाठ', zh: '梦境文本', de: 'Traumtext' },
    'dream.showOriginal': { en: 'Show Original', tr: 'Orijinali Göster', ru: 'Показать оригинал', es: 'Mostrar original', ar: 'إظهار الأصلي', hi: 'मूल दिखाएं', zh: '显示原文', de: 'Original anzeigen' },
    'dream.translate': { en: 'Translate to {lang}', tr: '{lang} Diline Çevir', ru: 'Перевести на {lang}', es: 'Traducir al {lang}', ar: 'ترجمة إلى {lang}', hi: '{lang} में अनुवाद', zh: '翻译成{lang}', de: 'Ins {lang} übersetzen' },
    'dream.translating': { en: 'Translating dream and analysis...', tr: 'Rüya ve analiz çevriliyor...', ru: 'Перевод сна и анализа...', es: 'Traduciendo sueño y análisis...', ar: 'ترجمة الحلم والتحليل...', hi: 'सपना और विश्लेषण का अनुवाद...', zh: '翻译梦境和分析...', de: 'Traum und Analyse werden übersetzt...' }
  }
  return translations[key] || {}
}

function getLangName(code) {
  const names = { en: 'English', tr: 'Türkçe', ru: 'Русский', ar: 'العربية', es: 'Español', hi: 'हिन्दी', zh: '中文', de: 'Deutsch' }
  return names[code] || code
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

function getStableRandom(id, range = 0.4) {
  if (!id) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return (Math.abs(hash) % 100) / 100 * range - (range / 2);
}

export default function DreamGlobe() {
  const { t: translate, i18n } = useTranslation()
  const globeContainer = useRef(null)
  const globeInstance = useRef(null)
  const [dreams, setDreams] = useState([])
  const [allDreams, setAllDreams] = useState([])
  const [selectedDream, setSelectedDream] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeFilter, setTimeFilter] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [globeReady, setGlobeReady] = useState(false)
  
  const [translatedContent, setTranslatedContent] = useState(null)
  const [translatedAnalysis, setTranslatedAnalysis] = useState(null)
  const [isTranslating, setIsTranslating] = useState(false)

  const [predictions, setPredictions] = useState([])
  const [selectedPrediction, setSelectedPrediction] = useState(null)

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  useEffect(() => {
    async function fetchAllDreams() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(2000)
        if (error) throw error
        setAllDreams(data || [])
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load dreams')
      } finally {
        setLoading(false)
      }
    }
    fetchAllDreams()
  }, [])

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const { data, error } = await supabase
          .from('collective_predictions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (!error && data) {
          setPredictions(data)
        }
      } catch (err) {
        console.error('Predictions error:', err)
      }
    }
    fetchPredictions()
  }, [])

  useEffect(() => {
    if (allDreams.length === 0) { setDreams([]); return }

    const now = new Date()
    const validDreams = allDreams.filter(d => {
      const dd = new Date(d.dream_date)
      return !isNaN(dd.getTime())
    })

    let filtered = validDreams

    if (timeFilter === '1h') {
      const cutoff = new Date(now.getTime() - 60 * 60 * 1000)
      filtered = validDreams.filter(d => new Date(d.dream_date) >= cutoff)
    } else if (timeFilter === '24h') {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      filtered = validDreams.filter(d => new Date(d.dream_date) >= cutoff)
    } else if (timeFilter === '1w') {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = validDreams.filter(d => new Date(d.dream_date) >= cutoff)
    } else if (timeFilter === '1m') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = validDreams.filter(d => new Date(d.dream_date) >= cutoff)
    } else if (timeFilter === '1y') {
      const cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      filtered = validDreams.filter(d => new Date(d.dream_date) >= cutoff)
    } else if (timeFilter === 'custom' && customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      filtered = validDreams.filter(d => {
        const dd = new Date(d.dream_date)
        return dd >= start && dd <= end
      })
    }

    setDreams(filtered)
  }, [allDreams, timeFilter, customStart, customEnd])

  function buildPointsData(dreamsList) {
    return dreamsList.map(dream => {
      let lat = dream.latitude
      let lng = dream.longitude

      if (!lat || !lng) {
        const coords = getCoords(dream.location_name)
        if (coords) { lat = coords.lat; lng = coords.lng }
        else return null
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
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!globeContainer.current) return
    if (typeof window.Globe === 'undefined') {
      setError(translate('globe.libraryError'))
      return
    }

    const pointsData = buildPointsData(dreams)

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
            setTranslatedContent(null)
            setTranslatedAnalysis(null)
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
        setGlobeReady(true)
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load 3D globe: ' + err.message)
      }
    }

    setTimeout(initGlobe, 500)

    return () => {
      if (globeInstance.current && globeContainer.current) {
        globeContainer.current.innerHTML = ''
        globeInstance.current = null
      }
    }
  }, [dreams, translate])

  async function handleTranslate() {
    if (!selectedDream) return
    
    if (translatedContent) {
      setTranslatedContent(null)
      setTranslatedAnalysis(null)
      return
    }
    
    setIsTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamText: selectedDream.content,
          analysisText: selectedDream.ai_summary,
          targetLang: i18n.language
        })
      })
      const data = await res.json()
      if (data.translated) {
        setTranslatedContent(data.translated)
        if (data.analysisTranslated) {
          setTranslatedAnalysis(data.analysisTranslated)
        }
      }
    } catch (e) {
      console.error('Translation error:', e)
    } finally {
      setIsTranslating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">{translate('globe.loading')}</div>
      </div>
    )
  }

  const isSameLanguage = selectedDream?.original_language === i18n.language

  // Çeviri fonksiyonu
  const getTranslation = (key) => {
    const trans = t(key)
    return trans[i18n.language] || trans['en'] || key
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={globeContainer} className="w-full h-full" style={{ width: '100vw', height: '100vh' }} />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 to-transparent pointer-events-none z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 glass-card px-4 py-2 hover:bg-white/10 transition-all">
              <span className="text-2xl">🌙</span>
              <span className="text-white font-bold">Dreamap</span>
            </a>
            <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white transition-all">
              ← {translate('globe.backToFeed')}
            </a>
          </div>

          <div className="relative">
            <button onClick={() => setLangOpen(!langOpen)} className="glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all">
              <span className="text-xl">{currentLang.flag}</span>
              <span className="text-sm text-white/80">{currentLang.name}</span>
              <span className="text-white/60 text-xs">▼</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[180px] z-50">
                {languages.map((lang) => (
                  <button key={lang.code} onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false) }}
                    className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${i18n.language === lang.code ? 'bg-purple-500/30 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-sm">{lang.name}</span>
                    {i18n.language === lang.code && <span className="ml-auto text-purple-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔮 KOLEKTİF ÖNGÖRÜLER */}
      {predictions.length > 0 && (
        <div className="absolute top-24 left-6 z-20 pointer-events-auto">
          <div className="glass-card p-4 max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl"></span>
              <h3 className="text-lg font-bold gradient-text">{getTranslation('predictions.title')}</h3>
              <span className="text-xs text-white/60 ml-auto">
  {predictions.length} {
    i18n.language === 'tr' ? 'aktif' :
    i18n.language === 'en' ? 'active' :
    i18n.language === 'ru' ? 'активных' :
    i18n.language === 'ar' ? 'نشط' :
    i18n.language === 'es' ? 'activos' :
    i18n.language === 'hi' ? 'सक्रिय' :
    i18n.language === 'zh' ? '活跃' :
    i18n.language === 'de' ? 'aktiv' : 'active'
  }
</span>
            </div>
            
            <div className="space-y-2">
              {predictions.map((pred) => (
                <button
                  key={pred.id}
                  onClick={() => setSelectedPrediction(pred)}
                  className="w-full text-left glass-card p-3 hover:bg-purple-500/20 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      pred.confidence_level === 'critical' ? 'bg-red-500 animate-pulse' :
                      pred.confidence_level === 'high' ? 'bg-orange-500' :
                      pred.confidence_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {pred[`title_${i18n.language}`] || pred.title_en || pred.title}
                      </div>
                      <div className="text-xs text-white/60 mt-1">
                        {pred.dream_count} {getTranslation('stats.dreams').toLowerCase()} • {pred.regions?.slice(0, 3).join(', ')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sol Alt Kontroller */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3 z-20 pointer-events-auto">
        <div className="glass-card p-4 max-w-xs">
          <div className="text-white/60 text-xs">{translate('globe.totalDreams')}</div>
          <div className="text-2xl font-bold gradient-text">{allDreams.length}</div>
          {timeFilter !== 'all' && (
            <div className="text-xs text-purple-300 mt-1">🔮 {dreams.length} gösteriliyor</div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setFilterOpen(!filterOpen)} className="glass-card px-4 py-3 flex items-center gap-2 hover:bg-white/10 transition-all w-full">
            <span className="text-lg">⏰</span>
            <span className="text-sm text-white/80">{translate(`filter.${timeFilter}`)}</span>
            <span className="text-white/60 text-xs ml-auto">▼</span>
          </button>
          {filterOpen && (
            <div className="absolute left-0 bottom-full mb-2 glass-card p-2 min-w-[220px] z-50">
              {['1h', '24h', '1w', '1m', '1y', 'all', 'custom'].map((key) => (
                <button key={key} onClick={() => { setTimeFilter(key); setFilterOpen(false); setShowCustom(key === 'custom'); if (key !== 'custom') setShowCustom(false) }}
                  className={`w-full px-4 py-3 flex items-center gap-2 rounded-lg transition-all text-left ${timeFilter === key ? 'bg-purple-500/30 text-white' : 'text-white/70 hover:bg-white/10'}`}>
                  <span className="text-sm">{translate(`filter.${key}`)}</span>
                  {timeFilter === key && <span className="ml-auto text-purple-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {showCustom && (
          <div className="glass-card p-4 max-w-xs space-y-2">
            <div>
              <label className="text-xs text-white/60 block mb-1">{translate('filter.startDate')}</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1">{translate('filter.endDate')}</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm" />
            </div>
          </div>
        )}

        {dreams.length === 0 && globeReady && (
          <div className="glass-card p-4 max-w-xs border border-yellow-500/30">
            <div className="text-yellow-300 text-sm">⚠️ {translate('globe.noDreams')}</div>
          </div>
        )}
      </div>

      {/* Sağ Alt - Duygu Renkleri */}
      <div className="absolute bottom-6 right-6 glass-card p-4 max-w-xs pointer-events-auto z-20">
        <h3 className="text-white font-semibold mb-3 text-sm">{translate('globe.emotionColors')}</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[['Fear', '#ef4444'], ['Anxiety', '#f97316'], ['Joy', '#22c55e'], ['Peace', '#3b82f6'], ['Sadness', '#6366f1'], ['Awe', '#a855f7']].map(([emotion, color]) => {
  const emotionTranslations = {
    'Fear': { tr: 'Korku', en: 'Fear', ru: 'Страх', ar: 'خوف', es: 'Miedo', hi: 'भय', zh: '恐惧', de: 'Angst' },
    'Anxiety': { tr: 'Kaygı', en: 'Anxiety', ru: 'Тревога', ar: 'قلق', es: 'Ansiedad', hi: 'चिंता', zh: '焦虑', de: 'Angst' },
    'Joy': { tr: 'Neşe', en: 'Joy', ru: 'Радость', ar: 'فرح', es: 'Alegría', hi: 'आनंद', zh: '喜悦', de: 'Freude' },
    'Peace': { tr: 'Huzur', en: 'Peace', ru: 'Покой', ar: 'سلام', es: 'Paz', hi: 'शांति', zh: '平静', de: 'Frieden' },
    'Sadness': { tr: 'Üzüntü', en: 'Sadness', ru: 'Печаль', ar: 'حزن', es: 'Tristeza', hi: 'उदासी', zh: '悲伤', de: 'Trauer' },
    'Awe': { tr: 'Hayranlık', en: 'Awe', ru: 'Трепет', ar: 'رهبة', es: 'Asombro', hi: 'विस्मय', zh: '敬畏', de: 'Ehrfurcht' }
  }
  
  return (
    <div key={emotion} className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-white/80">
        {emotionTranslations[emotion]?.[i18n.language] || emotion}
      </span>
    </div>
  )
})}
        </div>
      </div>

      {/* Rüya Detay Popup */}
      {selectedDream && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div 
            className="absolute inset-0 bg-black/60 pointer-events-auto"
            onClick={() => { setSelectedDream(null); setTranslatedContent(null); setTranslatedAnalysis(null) }}
          />
          
          <div className="relative glass-card p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto pointer-events-auto z-10">
            <button 
              onClick={() => { setSelectedDream(null); setTranslatedContent(null); setTranslatedAnalysis(null) }} 
              className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl z-20"
            >
              ×
            </button>
            
            <h3 className="text-xl font-bold text-white mb-4 pr-8">
              📍 {selectedDream.location_name}
            </h3>
            
            <div className="mb-6">
              <div className="text-sm text-purple-300 font-semibold mb-2">
                {isSameLanguage ? getTranslation('dream.dreamText') : `${getTranslation('dream.dreamText')} (${selectedDream.original_language?.toUpperCase()})`}
              </div>
              <p className={`text-white/90 leading-relaxed ${translatedContent ? 'opacity-50' : ''}`}>
                {selectedDream.content}
              </p>
              
              {translatedContent && (
                <div className="mt-3 p-4 rounded-lg border border-purple-500/30 bg-purple-500/10">
                  <div className="text-purple-400 text-xs font-semibold mb-2">
                    🌐 Çeviri ({i18n.language.toUpperCase()})
                  </div>
                  <p className="text-white leading-relaxed">
                    {translatedContent}
                  </p>
                </div>
              )}
            </div>

            {!isSameLanguage && (
              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="mb-6 glass-card px-6 py-3 flex items-center gap-3 hover:bg-purple-500/20 transition-all disabled:opacity-50 w-full justify-center border border-purple-500/30"
              >
                {isTranslating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-white/80">{getTranslation('dream.translating')}</span>
                  </>
                ) : translatedContent ? (
                  <>
                    <span>🔄</span>
                    <span className="text-sm text-white/80">{getTranslation('dream.showOriginal')}</span>
                  </>
                ) : (
                  <>
                    <span></span>
                    <span className="text-sm text-white/80">
                      {getTranslation('dream.translate').replace('{lang}', i18n.language.toUpperCase())} (Rüya + Jung Analizi)
                    </span>
                  </>
                )}
              </button>
            )}

            <div className="glass-card p-5 mb-6" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
              <div className="text-sm font-semibold text-purple-300 mb-3">
                {translate('feed.analysis')}
              </div>
              <p className={`text-white/80 leading-relaxed ${translatedAnalysis ? 'opacity-50' : ''}`}>
                {selectedDream.ai_summary}
              </p>
              
              {translatedAnalysis && (
                <div className="mt-4 pt-4 border-t border-purple-500/30">
                  <div className="text-purple-400 text-xs font-semibold mb-2">
                     Analiz Çevirisi ({i18n.language.toUpperCase()})
                  </div>
                  <p className="text-white/90 leading-relaxed">
                    {translatedAnalysis}
                  </p>
                </div>
              )}
            </div>

            {selectedDream.ai_archetypes && selectedDream.ai_archetypes.length > 0 && (
              <div className="mb-6">
                <div className="text-sm text-purple-300 font-semibold mb-3">Arketipler</div>
                <div className="flex flex-wrap gap-2">
                  {selectedDream.ai_archetypes.map((arch, i) => (
                    <span key={i} className="archetype-badge text-xs">{arch}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{selectedDream.dream_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💭</span>
                <span>{selectedDream.ai_sentiment}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🌐</span>
                <span>{selectedDream.original_language?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Öngörü Detay Popup */}
      {selectedPrediction && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div 
            className="absolute inset-0 bg-black/60 pointer-events-auto"
            onClick={() => setSelectedPrediction(null)}
          />
          <div className="relative glass-card p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto pointer-events-auto z-10">
            <button 
              onClick={() => setSelectedPrediction(null)}
              className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
            >
              ×
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔮</span>
              <div>
                <h2 className="text-2xl font-bold gradient-text">
                  {selectedPrediction[`title_${i18n.language}`] || selectedPrediction.title_en || selectedPrediction.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedPrediction.confidence_level === 'critical' ? 'bg-red-500 animate-pulse' :
                    selectedPrediction.confidence_level === 'high' ? 'bg-orange-500' :
                    selectedPrediction.confidence_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm text-white/60">
                    {getTranslation('labels.confidence')}: {
                      selectedPrediction.confidence_level === 'critical' ? getTranslation('confidence.critical') :
                      selectedPrediction.confidence_level === 'high' ? getTranslation('confidence.high') :
                      selectedPrediction.confidence_level === 'medium' ? getTranslation('confidence.medium') : getTranslation('confidence.low')
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-white/90 leading-relaxed">
                {selectedPrediction[`content_${i18n.language}`] || selectedPrediction.content_en}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass-card p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{selectedPrediction.dream_count}</div>
                <div className="text-xs text-white/60">{getTranslation('stats.dreams')}</div>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{selectedPrediction.regions?.length || 0}</div>
                <div className="text-xs text-white/60">{getTranslation('stats.regions')}</div>
              </div>
              <div className="glass-card p-3 text-center">
                <div className="text-2xl font-bold gradient-text">{selectedPrediction.themes?.length || 0}</div>
                <div className="text-xs text-white/60">{getTranslation('stats.themes')}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-purple-300 mb-2">{getTranslation('labels.regions')}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedPrediction.regions?.map((region, i) => (
                    <span key={i} className="glass-card px-3 py-1 text-xs text-white/80">{region}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-purple-300 mb-2">{getTranslation('labels.themes')}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedPrediction.themes?.map((theme, i) => (
                    <span key={i} className="glass-card px-3 py-1 text-xs text-white/80">#{theme}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !globeReady && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-card p-6 max-w-md z-50">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button onClick={() => window.location.reload()} className="glass-card px-6 py-3 text-white hover:bg-white/10"> {translate('globe.retry')}</button>
        </div>
      )}
    </div>
  )
                              }
