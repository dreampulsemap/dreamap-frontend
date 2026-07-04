import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, auth } from '../lib/supabase'
import { getTranslation } from '../lib/translations'
import MiniGlobe from '../components/MiniGlobe'

export default function Home() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'
  const [dreams, setDreams] = useState([])
  const [prophecy, setProphecy] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [langOpen, setLangOpen] = useState(false)
  const [translatingDreams, setTranslatingDreams] = useState({})

  const languages = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
    { code: 'ru', flag: '🇷🇺', name: 'Русский' },
    { code: 'ar', flag: '🇸🇦', name: 'العربية' },
    { code: 'es', flag: '🇪', name: 'Español' },
    { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
    { code: 'zh', flag: '🇨', name: '中文' },
    { code: 'de', flag: '🇩', name: 'Deutsch' }
  ]
  const currentLang = languages.find(l => l.code === lang) || languages[0]

  const getDreamAnalysis = (dream) => dream[`ai_summary_${lang}`] || dream.ai_summary || dream.ai_summary_en || ''
  const getDreamMotiv = (dream) => dream[`ai_motiv_${lang}`] || dream.ai_motiv || dream.ai_motiv_en || ''
  const getDreamImage = (dream) => dream.ai_image_url || null

  const getTranslatedContent = (dream) => {
    const trans = translatingDreams[dream.id]
    return trans?.translated ? trans.translatedContent : dream.content
  }

  const getTranslatedAnalysis = (dream) => {
    const trans = translatingDreams[dream.id]
    return trans?.translated ? trans.translatedAnalysis : getDreamAnalysis(dream)
  }

  async function handleTranslateDream(dream) {
    const dreamId = dream.id
    
    if (translatingDreams[dreamId]?.translated) {
      setTranslatingDreams(prev => ({
        ...prev,
        [dreamId]: { ...prev[dreamId], translated: false }
      }))
      return
    }

    setTranslatingDreams(prev => ({
      ...prev,
      [dreamId]: { ...prev[dreamId], loading: true }
    }))

    try {
      const res = await fetch('/api/translator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamText: dream.content,
          analysisText: getDreamAnalysis(dream),
          targetLang: lang
        })
      })
      
      const data = await res.json()
      
      if (data.translated) {
        setTranslatingDreams(prev => ({
          ...prev,
          [dreamId]: { 
            translated: true,
            translatedContent: data.translated,
            translatedAnalysis: data.analysisTranslated 
          }
        }))
      }
    } catch (err) {
      console.error('Translation error:', err)
    } finally {
      setTranslatingDreams(prev => ({
        ...prev,
        [dreamId]: { ...prev[dreamId], loading: false }
      }))
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const currentUser = await auth.getUser()
      setUser(currentUser)

      const { data: dreamsData } = await supabase
        .from('dreams')
        .select('*')
        .eq('in_feed', true)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50)
      
      setDreams(dreamsData || [])

      const today = new Date().toISOString().split('T')[0]
      const { data: prophecyData } = await supabase
        .from('daily_prophecy')
        .select('*')
        .eq('prophecy_date', today)
        .single()
      
      setProphecy(prophecyData)
      setLoading(false)
    }
    fetchData()
  }, [lang])

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌙</span>
            <span className="text-xl font-bold gradient-text">Dreamap</span>
          </div>
          
          <nav className="flex items-center gap-6">
            <a href="/" className="text-white hover:text-purple-400 transition-colors flex items-center gap-2">
              <span>✨</span> {getTranslation('nav.feed', lang)}
            </a>
            <a href="/globe" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
              <span>🌍</span> {getTranslation('nav.globe', lang)}
            </a>
            {user ? (
              <a href="/profile" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                <span>📖</span> Dream Journal
              </a>
            ) : (
              <a href="/auth" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                <span>🔮</span> {getTranslation('nav.auth', lang)}
              </a>
            )}
            
            <div className="relative">
              <button onClick={() => setLangOpen(!langOpen)} className="glass-card px-3 py-1 flex items-center gap-2">
                <span>{currentLang.flag}</span>
                <span className="text-sm hidden sm:inline">{currentLang.name}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[150px] z-50">
                  {languages.map((l) => (
                    <button key={l.code} onClick={() => { i18n.changeLanguage(l.code); setLangOpen(false) }}
                      className={`w-full px-3 py-2 text-left rounded hover:bg-white/10 ${lang === l.code ? 'bg-purple-500/30' : ''}`}>
                      {l.flag} {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-6">
              {getTranslation('feed.latestDreams', lang)}
            </h1>
            <p className="text-white/60 text-lg mb-8">
              Dünyanın dört bir yanından rüyalar, Jungian analizler ve kolektif bilinçdışı.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <a href="/globe" className="glass-card px-8 py-4 hover:bg-purple-500/20 transition-all">
                🌍 {getTranslation('nav.globe', lang)} →
              </a>
              {user ? (
                <a href="/add-dream" className="glass-card px-8 py-4 bg-purple-500/20 hover:bg-purple-500/40 transition-all">
                   {getTranslation('dream.addTitle', lang)}
                </a>
              ) : (
                <a href="/auth" className="glass-card px-8 py-4 bg-purple-500/20 hover:bg-purple-500/40 transition-all">
                   {getTranslation('nav.auth', lang)}
                </a>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <MiniGlobe />
          </div>
        </div>
      </div>

      {prophecy && (
        <div className="max-w-4xl mx-auto px-6 mb-12">
          <div className="glass-card p-8 border-2 border-purple-500/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🔮</span>
              <h2 className="text-3xl font-bold gradient-text">
                {getTranslation('prophecy.dailyTitle', lang) || 'Günlük Kehanet'}
              </h2>
            </div>
            <div className="text-white/90 leading-relaxed mb-6">
              {prophecy[`content_${lang}`] || prophecy.content_en}
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
                <span>💫</span> {getTranslation('prophecy.advice', lang) || 'Tavsiye'}
              </div>
              <p className="text-white/80 text-sm">
                {prophecy[`advice_${lang}`] || prophecy.advice_en}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-20">
        {loading ? (
          <div className="text-center py-20 text-white/60 animate-pulse">
            {getTranslation('auth.loading', lang)}
          </div>
        ) : (
          <div className="space-y-8">
            {dreams.map((dream) => (
              <div key={dream.id} className="glass-card overflow-hidden hover:scale-[1.01] transition-transform">
                {getDreamImage(dream) && (
                  <div className="relative w-full h-64 overflow-hidden bg-black">
                    <img 
                      src={getDreamImage(dream)} 
                      alt="Dream"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </div>
                )}
                
                <div className="p-6">
                  {dream.ai_archetypes && dream.ai_archetypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {dream.ai_archetypes.map((arch, i) => (
                        <span key={i} className="glass-card px-3 py-1 text-xs text-purple-300 border border-purple-500/30">
                          {arch}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-white/90 text-lg mb-6 leading-relaxed whitespace-pre-wrap">
                    {getTranslatedContent(dream)}
                  </p>

                  {!dream.original_language || dream.original_language !== lang ? (
                    <button
                      onClick={() => handleTranslateDream(dream)}
                      disabled={translatingDreams[dream.id]?.loading}
                      className="w-full glass-card px-4 py-2 mb-4 text-sm hover:bg-purple-500/20 transition-all disabled:opacity-50"
                    >
                      {translatingDreams[dream.id]?.loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                          Çevriliyor...
                        </span>
                      ) : translatingDreams[dream.id]?.translated ? (
                        '🔄 Orijinali Göster'
                      ) : (
                        `🌐 ${lang.toUpperCase()} Diline Çevir`
                      )}
                    </button>
                  ) : null}

                  {getTranslatedAnalysis(dream) && (
                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🔮</span>
                        <span className="font-semibold text-purple-300">{getTranslation('feed.jungianAnalysis', lang)}</span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed mb-2">{getTranslatedAnalysis(dream)}</p>
                      {getDreamMotiv(dream) && (
                        <div className="pt-2 border-t border-purple-500/30 mt-2">
                          <p className="text-white/60 text-xs italic">💫 {getDreamMotiv(dream)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10 text-sm text-white/60">
                    <span>📅 {dream.dream_date}</span>
                    <span>📍 {dream.location_name}</span>
                    <span>🌐 {dream.original_language?.toUpperCase()}</span>
                    {dream.user_selected_sentiment && <span>💭 {dream.user_selected_sentiment}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
