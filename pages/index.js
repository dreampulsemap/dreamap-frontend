import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import dynamic from 'next/dynamic'

// ============================================
// 🔮 DUYGU ÇEVİRİLERİ
// ============================================
const emotionTranslations = {
  'Fear': { tr: 'Korku', ru: 'Страх', es: 'Miedo', ar: 'خوف', hi: 'भय', zh: '恐惧', de: 'Angst' },
  'Anxiety': { tr: 'Kaygı', ru: 'Тревога', es: 'Ansiedad', ar: 'قلق', hi: 'चिंता', zh: '焦虑', de: 'Angst' },
  'Joy': { tr: 'Neşe', ru: 'Радость', es: 'Alegría', ar: 'فرح', hi: 'आनंद', zh: '喜悦', de: 'Freude' },
  'Sadness': { tr: 'Üzüntü', ru: 'Печаль', es: 'Tristeza', ar: 'حزن', hi: 'उदासी', zh: '悲伤', de: 'Trauer' },
  'Anger': { tr: 'Öfke', ru: 'Гнев', es: 'Ira', ar: 'غضب', hi: 'क्रोध', zh: '愤怒', de: 'Wut' },
  'Peace': { tr: 'Huzur', ru: 'Покой', es: 'Paz', ar: 'سلام', hi: 'शांति', zh: '平静', de: 'Frieden' },
  'Confusion': { tr: 'Kafa Karışıklığı', ru: 'Замешательство', es: 'Confusión', ar: 'ارتباك', hi: 'भ्रम', zh: '困惑', de: 'Verwirrung' },
  'Awe': { tr: 'Hayranlık', ru: 'Трепет', es: 'Asombro', ar: 'رهبة', hi: 'विस्मय', zh: '敬畏', de: 'Ehrfurcht' },
  'Surprise': { tr: 'Şaşkınlık', ru: 'Удивление', es: 'Sorpresa', ar: 'مفاجأة', hi: 'आश्चर्य', zh: '惊讶', de: 'Überraschung' },
  'Disgust': { tr: 'İğrenme', ru: 'Отвращение', es: 'Asco', ar: 'اشمئزاز', hi: 'घृणा', zh: '厌恶', de: 'Ekel' },
  'Mystery': { tr: 'Gizem', ru: 'Тайна', es: 'Misterio', ar: 'غموض', hi: 'रहस्य', zh: '神秘', de: 'Mysterium' },
  'Introspective': { tr: 'İçgözlem', ru: 'Интроверсия', es: 'Introspección', ar: 'تأمل', hi: 'आत्मनिरीक्षण', zh: '内省', de: 'Introspektion' }
};

function getTranslatedEmotion(emotion, lang) {
  return emotionTranslations[emotion]?.[lang] || emotion;
}

const MiniGlobe = dynamic(() => import('../components/MiniGlobe'), {
  ssr: false,
  loading: () => (
    <div className="w-80 h-80 rounded-full border-2 border-purple-500/30 flex items-center justify-center">
      <div className="text-white/60 animate-pulse">🌍</div>
    </div>
  )
})

const languages = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' }
]

export default function Home() {
  const { t, i18n } = useTranslation()
  const [dreams, setDreams] = useState([])
  const [prophecy, setProphecy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [langOpen, setLangOpen] = useState(false)

useEffect(() => { 
  fetchDreams()
  fetchProphecy()
}, [i18n.language]) // Dil değişince tekrar çalış

  async function fetchProphecy() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('daily_prophecy')
        .select('*')
        .eq('prophecy_date', today)
        .single()
      
      if (error) {
        console.warn('Prophecy not found:', error.message)
        return
      }
      
      if (data) {
        setProphecy(data)
      }
    } catch (err) {
      console.error('Prophecy error:', err)
    }
  }

  async function fetchDreams() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Dreams fetch error:', error)
        setDreams([])
      } else {
        setDreams(data || [])
      }
    } catch (err) {
      console.error('Dreams fetch error:', err)
      setDreams([])
    } finally {
      setLoading(false)
    }
  }

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  return (
    <>
      <div className="starry-bg"></div>
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>

      <div className="min-h-screen relative">
        {/* Header */}
        <header className="sticky top-0 z-50 glass-card border-b border-white/10" style={{ borderRadius: 0 }}>
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌙</div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">{t('app.name')}</h1>
                <p className="text-xs text-white/50">{t('app.tagline')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <nav className="flex gap-6">
                <a href="/" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span>✨</span> {t('nav.feed')}
                </a>
                <a href="/globe" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span>🌍</span> {t('nav.globe')}
                </a>
                <a href="/auth" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                  <span>🔮</span> {t('nav.auth')}
                </a>
              </nav>
              
              <div className="relative">
                <button 
                  onClick={() => setLangOpen(!langOpen)}
                  className="glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all"
                >
                  <span className="text-2xl">{currentLang.flag}</span>
                  <span className="text-sm text-white/80">{currentLang.name}</span>
                  <span className="text-white/60 text-xs">▼</span>
                </button>
                
                {langOpen && (
                  <div className="absolute right-0 top-full mt-2 glass-card p-2 min-w-[180px] z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          i18n.changeLanguage(lang.code)
                          setLangOpen(false)
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all ${
                          i18n.language === lang.code 
                            ? 'bg-purple-500/30 text-white' 
                            : 'text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <span className="text-sm">{lang.name}</span>
                        {i18n.language === lang.code && <span className="ml-auto text-purple-400">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Sol: Metin */}
            <div className="text-center md:text-left">
              <h2 className="text-5xl font-bold mb-4 glow-text">
                {t('hero.title')}<br/>
                <span className="gradient-text">{t('hero.subtitle')}</span>
              </h2>
              <p className="text-xl text-white/70 mb-8">
                {t('hero.description')}
              </p>
              <div className="flex justify-center md:justify-start gap-4 mb-8">
                <div className="glass-card px-6 py-3">
                  <div className="text-3xl font-bold gradient-text">{dreams.length}</div>
                  <div className="text-sm text-white/60">{t('hero.dreams')}</div>
                </div>
                <div className="glass-card px-6 py-3">
                  <div className="text-3xl font-bold gradient-text">8</div>
                  <div className="text-sm text-white/60">{t('hero.languages')}</div>
                </div>
                <div className="glass-card px-3 py-3">
                  <div className="text-3xl font-bold gradient-text">∞</div>
                  <div className="text-sm text-white/60">{t('hero.archetypes')}</div>
                </div>
              </div>
              <a href="/globe" className="inline-block glass-card px-8 py-4 text-white hover:bg-purple-500/30 transition-all glow-border">
                🌍 {t('nav.globe')} →
              </a>
            </div>

            {/* Sağ: Mini Globe */}
            <div className="flex justify-center">
              <MiniGlobe />
            </div>
          </div>
        </section>

        {/* 🔮 BUGÜNÜN KEHANETİ */}
        {prophecy && (
          <section className="max-w-4xl mx-auto px-6 py-8">
            <div className="glass-card p-8 border-2 border-purple-500/30 glow-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-4xl">🔮</div>
                <div>
                  <h2 className="text-2xl font-bold gradient-text">
                    {t('prophecy.title')}
                  </h2>
                  <p className="text-sm text-white/60">
                    {prophecy.prophecy_date} • {prophecy.archetype}
                  </p>
                </div>
              </div>

              {/* İstatistikler */}
              {prophecy.ai_stats && (
                <div className="flex gap-4 mb-6">
                  <div className="glass-card px-4 py-2">
                    <div className="text-2xl font-bold gradient-text">{prophecy.ai_stats.totalDreams}</div>
                    <div className="text-xs text-white/60">Rüya Analiz Edildi</div>
                  </div>
                  <div className="glass-card px-4 py-2">
                    <div className="text-2xl font-bold gradient-text">{prophecy.ai_stats.dominancePercentage}%</div>
                    <div className="text-xs text-white/60">{prophecy.ai_stats.dominantArchetype} Baskın</div>
                  </div>
                  <div className="glass-card px-4 py-2">
                    <div className="text-2xl font-bold gradient-text">
                      {getTranslatedEmotion(prophecy.ai_stats.dominantEmotion, i18n.language)}
                    </div>
                    <div className="text-xs text-white/60">Baskın Duygu</div>
                  </div>
                </div>
              )}

              {/* Kehanet Metni */}
              <div className="mb-6">
                <p className="text-lg text-white/90 leading-relaxed italic">
                  {prophecy[`content_${i18n.language}`] || prophecy.content_en}
                </p>
              </div>

              {/* Tavsiye */}
              <div className="glass-card p-4 bg-purple-500/10">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💫</div>
                  <div>
                    <div className="text-sm font-semibold text-purple-300 mb-2">
                      {t('prophecy.advice')}
                    </div>
                    <p className="text-white/80 text-sm">
                     {prophecy[`advice_${i18n.language}`] || 
                    prophecy[`content_${i18n.language}`]?.substring(0, 100) + '...' || 
                    prophecy.advice_en || 
                    prophecy.ai_advice ||
   'Rüyalarınızı not edin.'}
</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Feed */}
        <main className="max-w-3xl mx-auto px-6 pb-16">
          <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span>🌌</span>
            <span className="gradient-text">{t('feed.title')}</span>
          </h3>
          
          {loading ? (
            <div className="text-center text-white/60 py-12">
              <div className="text-4xl mb-4 animate-pulse">🔮</div>
              <div>{t('feed.loading')}</div>
            </div>
          ) : dreams.length === 0 ? (
            <div className="text-center text-white/60 py-12">
              <div className="text-4xl mb-4">🌙</div>
              <div>{t('feed.empty')}</div>
            </div>
          ) : (
            <div className="space-y-8">
              {dreams.map((dream) => (
                <DreamCard key={dream.id} dream={dream} />
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="glass-card border-t border-white/10 py-8" style={{ borderRadius: 0 }}>
          <div className="max-w-6xl mx-auto px-6 text-center text-white/50">
            <p>{t('footer.text')}</p>
          </div>
        </footer>
      </div>
    </>
  )
}

function DreamCard({ dream }) {
  const { t, i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState(null);
  const [translatedAnalysis, setTranslatedAnalysis] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const isSameLanguage = dream.original_language === i18n.language;

  const handleTranslate = async () => {
    if (translatedText) {
      setTranslatedText(null);
      setTranslatedAnalysis(null);
      return;
    }
    
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dreamText: dream.content,
          analysisText: dream.ai_summary,
          targetLang: i18n.language 
        })
      });
      const data = await res.json();
      if (data.translated) {
        setTranslatedText(data.translated);
        if (data.analysisTranslated) {
          setTranslatedAnalysis(data.analysisTranslated);
        }
      }
    } catch (e) {
      console.error('Çeviri hatası:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <article className="glass-card overflow-hidden">
      {dream.ai_image_url && (
        <div className="dream-image aspect-video relative bg-gradient-to-br from-purple-900/50 to-indigo-900/50">
          <img 
            src={dream.ai_image_url} 
            alt="Dream" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML = `
                <div class="w-full h-full flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-6xl mb-2">🌙</div>
                    <div class="text-white/40 text-sm">Dream Visualization</div>
                  </div>
                </div>
              `
            }}
          />
        </div>
      )}

      <div className="p-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {dream.ai_archetypes?.map((arch, i) => (
            <span key={i} className="archetype-badge">
              {getArchetypeIcon(arch)} {arch}
            </span>
          ))}
        </div>

        <div className="mb-6">
          <p className={`text-lg text-white/90 leading-relaxed transition-all duration-500 ${translatedText ? 'opacity-50 blur-[1px]' : ''}`}>
            {dream.content}
          </p>
          
          {translatedText && (
            <div className="mt-4 p-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-purple-400 text-sm font-semibold">🌐 Çeviri ({i18n.language.toUpperCase()})</span>
              </div>
              <p className="text-lg text-white leading-relaxed">
                {translatedText}
              </p>
            </div>
          )}
        </div>

        {!isSameLanguage && (
          <button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="mb-6 glass-card px-4 py-2 flex items-center gap-2 hover:bg-purple-500/20 transition-all disabled:opacity-50"
          >
            {isTranslating ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-white/80">Çevriliyor...</span>
              </>
            ) : translatedText ? (
              <>
                <span className="text-lg">🔄</span>
                <span className="text-sm text-white/80">Orijinali Göster</span>
              </>
            ) : (
              <>
                <span className="text-lg">🌐</span>
                <span className="text-sm text-white/80">
                  {t('lang.' + i18n.language) || i18n.language.toUpperCase()} Diline Çevir
                </span>
              </>
            )}
          </button>
        )}

        <div className="glass-card p-6 mb-6" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔮</div>
            <div>
              <div className="text-sm font-semibold text-purple-300 mb-2">{t('feed.analysis')}</div>
              <p className={`text-white/80 leading-relaxed transition-all duration-500 ${translatedAnalysis ? 'opacity-50 blur-[1px]' : ''}`}>
                {dream.ai_summary}
              </p>
              {translatedAnalysis && (
                <div className="mt-3 pt-3 border-t border-purple-500/30">
                  <p className="text-white/90 leading-relaxed">
                    {translatedAnalysis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-white/60 pt-4 border-t border-white/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><span>📅</span><span>{dream.dream_date}</span></div>
            <div className="flex items-center gap-2"><span>🌍</span><span>{dream.original_language?.toUpperCase()}</span></div>
            <div className="flex items-center gap-2"><span>💭</span><span>{getEmotionEmoji(dream.ai_sentiment)} {dream.ai_sentiment}</span></div>
          </div>
          {dream.location_name && dream.location_name !== 'Unknown' && (
            <div className="flex items-center gap-2"><span>📍</span><span>{dream.location_name}</span></div>
          )}
        </div>
      </div>
    </article>
  )
}

function getArchetypeIcon(archetype) {
  const icons = {
    'Shadow': '🌑', 'Anima': '🌸', 'Animus': '⚔️', 'Wise Old Man': '🧙',
    'Great Mother': '🌺', 'Hero': '🦸', 'Trickster': '🎭', 'Self': '☯️',
    'Snake': '🐍', 'Water': '🌊', 'Forest': '🌲', 'Door': '🚪', 'Tower': '🗼'
  }
  return icons[archetype] || '✨'
}

function getEmotionEmoji(emotion) {
  const emojis = {
    'Fear': '😨', 'Anxiety': '😰', 'Awe': '🤩', 'Joy': '😊',
    'Confusion': '😕', 'Peace': '😌', 'Sadness': '😢', 'Anger': '😠',
    'Disgust': '🤢', 'Surprise': '😲'
  }
  return emojis[emotion] || '💭'
                    }
