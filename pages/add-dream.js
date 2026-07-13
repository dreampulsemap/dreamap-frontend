import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { tAddDream, normalizeAddDreamLang } from '../lib/addDreamTranslations'

export default function AddDreamPage() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const lang = normalizeAddDreamLang(i18n.resolvedLanguage || i18n.language)

  const [user, setUser] = useState(null)
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [inFeed, setInFeed] = useState(true)
  const [mapDetail, setMapDetail] = useState('full')
  const [visibility, setVisibility] = useState('public')
  const [userSentiment, setUserSentiment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const emotions = useMemo(
    () => [
      { value: 'Joy', emoji: '😊', label: tAddDream('emotion.joy', lang) },
      { value: 'Peace', emoji: '😌', label: tAddDream('emotion.peace', lang) },
      { value: 'Love', emoji: '🥰', label: tAddDream('emotion.love', lang) },
      { value: 'Hope', emoji: '✨', label: tAddDream('emotion.hope', lang) },
      { value: 'Awe', emoji: '😲', label: tAddDream('emotion.awe', lang) },
      { value: 'Surprise', emoji: '😮', label: tAddDream('emotion.surprise', lang) },
      { value: 'Curiosity', emoji: '🤔', label: tAddDream('emotion.curiosity', lang) },
      { value: 'Confusion', emoji: '😕', label: tAddDream('emotion.confusion', lang) },
      { value: 'Fear', emoji: '😨', label: tAddDream('emotion.fear', lang) },
      { value: 'Anxiety', emoji: '😰', label: tAddDream('emotion.anxiety', lang) },
      { value: 'Sadness', emoji: '😢', label: tAddDream('emotion.sadness', lang) },
      { value: 'Loneliness', emoji: '🫥', label: tAddDream('emotion.loneliness', lang) },
      { value: 'Anger', emoji: '😡', label: tAddDream('emotion.anger', lang) },
      { value: 'Shame', emoji: '😞', label: tAddDream('emotion.shame', lang) },
      { value: 'Disgust', emoji: '🤢', label: tAddDream('emotion.disgust', lang) },
      { value: 'Relief', emoji: '😮‍💨', label: tAddDream('emotion.relief', lang) }
    ],
    [lang]
  )

  useEffect(() => {
    let active = true

    async function checkUser() {
      try {
        const {
          data: { user: currentUser },
          error: userError
        } = await supabase.auth.getUser()

        if (userError || !currentUser) {
          router.push('/auth')
          return
        }

        if (!active) return
        setUser(currentUser)
        fetchLocationFromIP()
      } catch (err) {
        console.error('User check failed:', err)
        router.push('/auth')
      }
    }

    checkUser()

    return () => {
      active = false
    }
  }, [router])

  async function fetchLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()

      if (data?.city && data?.country_name) {
        setLocation(`${data.city}, ${data.country_name}`)
      }
    } catch (err) {
      console.error('Location could not be fetched:', err)
    }
  }

  async function getCoordinatesFromLocation(place) {
    if (!place) return { lat: null, lng: null }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
        {
          headers: { Accept: 'application/json' }
        }
      )

      const data = await response.json()

      if (Array.isArray(data) && data[0]) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }
      }
    } catch (err) {
      console.error('Coordinates could not be fetched:', err)
    }

    return { lat: null, lng: null }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!content.trim()) {
      setError(tAddDream('dream.validationContent', lang))
      return
    }

    if (!user?.id) {
      setError(tAddDream('common.errorGeneric', lang))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { lat, lng } = await getCoordinatesFromLocation(location)

      const { data, error: insertError } = await supabase
        .from('dreams')
        .insert([
          {
            user_id: user.id,
            content: content.trim(),
            location_name: location.trim() || tAddDream('location.unknown', lang),
            latitude: lat,
            longitude: lng,
            in_feed: inFeed,
            map_detail: mapDetail,
            visibility,
            user_selected_sentiment: userSentiment || null,
            dream_date: new Date().toISOString().split('T')[0],
            original_language: lang,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (insertError) throw insertError
      if (!data?.id) {
        throw new Error(tAddDream('dream.createFailed', lang))
      }

      try {
        const analyzeRes = await fetch('/api/analyze-dream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dreamId: data.id,
            content: content.trim(),
            lang
          })
        })

        if (!analyzeRes.ok) {
          const errorData = await analyzeRes.json().catch(() => null)
          console.error('Free analysis failed:', errorData || analyzeRes.status)
        }
      } catch (analysisError) {
        console.error('Free analysis request failed:', analysisError)
      }

      router.push(`/profile?highlightDream=${data.id}`)
    } catch (err) {
      console.error('Add dream failed:', err)
      setError(err?.message || tAddDream('common.errorGeneric', lang))
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl animate-pulse">
          {tAddDream('auth.loading', lang)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-all">
            <img src="/logo.png" alt="Lunosfer Logo" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold gradient-text">{tAddDream('brand.name', lang)}</span>
          </a>

          <a href="/" className="glass-card px-4 py-2 text-white/80 hover:text-white transition-all flex items-center gap-2">
            <span>←</span>
            <span>{tAddDream('nav.backToHome', lang)}</span>
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <div className="glass-card p-6 sm:p-8">
          <h1 className="text-3xl font-bold gradient-text mb-8">
            {tAddDream('dream.addTitle', lang)}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-white/60 block mb-2">
                {tAddDream('dream.dreamText', lang)}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none h-40"
                required
                placeholder={tAddDream('dream.placeholder', lang)}
              />
            </div>

            <div>
              <label className="text-sm text-white/60 block mb-2">
                {tAddDream('dream.location', lang)}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder={tAddDream('dream.locationPlaceholder', lang)}
              />
            </div>

            <div className="glass-card p-4 bg-purple-500/10">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">
                {tAddDream('dream.shareOptions', lang)}
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
                  {tAddDream('dream.shareInFeed', lang)}
                </label>
              </div>

              <div className="mb-4">
                <label className="text-sm text-white/60 block mb-2">
                  {tAddDream('dream.mapDetail', lang)}
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
                    <span className="text-white/80">{tAddDream('dream.fullText', lang)}</span>
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
                    <span className="text-white/80">{tAddDream('dream.summaryOnly', lang)}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 block mb-2">
                  {tAddDream('dream.visibility', lang)}
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
                    <span className="text-white/80">{tAddDream('dream.public', lang)}</span>
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
                    <span className="text-white/80">{tAddDream('dream.friends', lang)}</span>
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
                    <span className="text-white/80">{tAddDream('dream.private', lang)}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 bg-purple-500/10">
              <h3 className="text-lg font-semibold text-purple-300 mb-4">
                {tAddDream('dream.emotions', lang)}
              </h3>

              <p className="text-white/60 text-sm mb-4">
                {tAddDream('dream.emotionsHelp', lang)}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {emotions.map((emotion) => (
                  <button
                    key={emotion.value}
                    type="button"
                    onClick={() =>
                      setUserSentiment(userSentiment === emotion.value ? '' : emotion.value)
                    }
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
              {loading ? tAddDream('auth.loading', lang) : tAddDream('dream.submit', lang)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}