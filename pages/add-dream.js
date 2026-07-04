import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function AddDreamPage() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const lang = i18n.language || 'en'
  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [inFeed, setInFeed] = useState(true)
  const [mapDetail, setMapDetail] = useState('full')
  const [visibility, setVisibility] = useState('public')
  const [userSentiment, setUserSentiment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Duygular - 8 dilde
  const emotions = [
    { value: 'Fear', emoji: '😨', label: getTranslation('emotion.fear', lang) },
    { value: 'Joy', emoji: '😊', label: getTranslation('emotion.joy', lang) },
    { value: 'Sadness', emoji: '😢', label: getTranslation('emotion.sadness', lang) },
    { value: 'Peace', emoji: '😌', label: getTranslation('emotion.peace', lang) },
    { value: 'Anxiety', emoji: '😰', label: getTranslation('emotion.anxiety', lang) },
    { value: 'Awe', emoji: '', label: getTranslation('emotion.awe', lang) },
    { value: 'Confusion', emoji: '😕', label: getTranslation('emotion.confusion', lang) },
    { value: 'Surprise', emoji: '', label: getTranslation('emotion.surprise', lang) }
  ]

  useEffect(() => {
    async function checkUser() {
      const currentUser = await auth.getUser()
      if (!currentUser) {
        router.push('/auth')
        return
      }
      setUser(currentUser)
      fetchLocationFromIP()
    }
    checkUser()
  }, [router])

  async function fetchLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      if (data.city && data.country_name) {
        setLocation(`${data.city}, ${data.country_name}`)
      }
    } catch (error) {
      console.error('Konum alınamadı:', error)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Konumdan koordinat al
      let lat = null
      let lng = null
      
      if (location) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`)
          const data = await response.json()
          if (data && data[0]) {
            lat = parseFloat(data[0].lat)
            lng = parseFloat(data[0].lon)
          }
        } catch (err) {
          console.error('Koordinat alınamadı:', err)
        }
      }

      const { data, error } = await supabase
        .from('dreams')
        .insert([{
          user_id: user.id,
          content: content,
          location_name: location || getTranslation('location.unknown', lang),
          latitude: lat,
          longitude: lng,
          in_feed: inFeed,
          map_detail: mapDetail,
          visibility: visibility,
          user_selected_sentiment: userSentiment || null,
          dream_date: new Date().toISOString().split('T')[0],
          original_language: lang,
          created_at: new Date().toISOString()
        }])
        .select()

      if (error) throw error

      if (data && data[0]) {
        await fetch('/api/analyze-dream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            dreamId: data[0].id, 
            content: content,
            language: lang
          })
        })
      }

      router.push('/profile')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">{getTranslation('auth.loading', lang)}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-all">
              <span className="text-3xl">🌙</span>
              <span className="text-xl font-bold gradient-text">Dreamap</span>
            </a>
          </div>
          <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white transition-all flex items-center gap-2">
            <span>←</span>
            <span>{getTranslation('nav.backToHome', lang)}</span>
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold gradient-text mb-8">
            {getTranslation('dream.addTitle', lang)}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rüya Metni */}
            <div>
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('dream.dreamText', lang)}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none h-40"
                required
                placeholder={getTranslation('dream.placeholder', lang)}
              />
            </div>

            {/* Konum */}
            <div>
              <label className="text-sm text-white/60 block mb-2">
                {getTranslation('dream.location', lang)}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder={getTranslation('dream.locationPlaceholder', lang)}
              />
            </div>

            {/* Paylaşım Seçenekleri */}
            <div className="glass-card p-4 bg-purple-500/10">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">
                {getTranslation('dream.shareOptions', lang)}
              </h3>

              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="inFeed"
                  checked={inFeed}
                  onChange={(e) => setInFeed(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="inFeed" className="text-white/80 cursor-pointer">
                  {getTranslation('dream.shareInFeed', lang)}
                </label>
              </div>

              <div className="mb-4">
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('dream.mapDetail', lang)}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mapDetail"
                      value="full"
                      checked={mapDetail === 'full'}
                      onChange={(e) => setMapDetail(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.fullText', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mapDetail"
                      value="summary"
                      checked={mapDetail === 'summary'}
                      onChange={(e) => setMapDetail(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.summaryOnly', lang)}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {getTranslation('dream.visibility', lang)}
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={visibility === 'public'}
                      onChange={(e) => setVisibility(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.public', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="friends"
                      checked={visibility === 'friends'}
                      onChange={(e) => setVisibility(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.friends', lang)}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={visibility === 'private'}
                      onChange={(e) => setVisibility(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-white/80">{getTranslation('dream.private', lang)}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Kullanıcı Duygu Seçimi */}
            <div className="glass-card p-4 bg-purple-500/10">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">
                {getTranslation('dream.emotions', lang)}
              </h3>
              <p className="text-white/60 text-sm mb-4">
                {getTranslation('dream.emotionsHelp', lang)}
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {emotions.map((emotion) => (
                  <button
                    key={emotion.value}
                    type="button"
                    onClick={() => setUserSentiment(userSentiment === emotion.value ? '' : emotion.value)}
                    className={`p-3 rounded-lg border transition-all ${
                      userSentiment === emotion.value
                        ? 'bg-purple-500/30 border-purple-500 text-white'
                        : 'bg-black/40 border-white/20 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-2xl mb-1">{emotion.emoji}</div>
                    <div className="text-xs">{emotion.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-card px-6 py-3 text-white font-semibold hover:bg-purple-500/20 transition-all disabled:opacity-50"
            >
              {loading ? getTranslation('auth.loading', lang) : getTranslation('dream.submit', lang)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
                            }
