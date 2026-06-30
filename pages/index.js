import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [dreams, setDreams] = useState([])
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
      .limit(50)
    
    if (error) {
      console.error('Error:', error)
    } else {
      setDreams(data || [])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Animated Background */}
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
                <h1 className="text-2xl font-bold gradient-text">Dreamap</h1>
                <p className="text-xs text-white/50">Kolektif Bilinçdışı Haritası</p>
              </div>
            </div>
            <nav className="flex gap-6">
              <a href="/" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                <span>✨</span> Feed
              </a>
              <a href="/globe" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                <span>🌍</span> Globe
              </a>
              <a href="/auth" className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
                <span>🔮</span> Giriş
              </a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-5xl font-bold mb-4 glow-text">
            Dünyanın Rüyaları<br/>
            <span className="gradient-text">Tek Bir Haritada</span>
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Jungian arketipler, kolektif bilinçdışı ve insanlığın ortak rüya deneyimleri
          </p>
          <div className="flex justify-center gap-4">
            <div className="glass-card px-6 py-3">
              <div className="text-3xl font-bold gradient-text">{dreams.length}</div>
              <div className="text-sm text-white/60">Rüya</div>
            </div>
            <div className="glass-card px-6 py-3">
              <div className="text-3xl font-bold gradient-text">8</div>
              <div className="text-sm text-white/60">Dil</div>
            </div>
            <div className="glass-card px-6 py-3">
              <div className="text-3xl font-bold gradient-text">∞</div>
              <div className="text-sm text-white/60">Arketip</div>
            </div>
          </div>
        </section>

        {/* Dream Feed */}
        <main className="max-w-3xl mx-auto px-6 pb-16">
          <h3 className="text-3xl font-bold mb-8 flex items-center gap-3">
            <span>🌌</span>
            <span className="gradient-text">Son Rüyalar</span>
          </h3>
          
          {loading ? (
            <div className="text-center text-white/60 py-12">
              <div className="text-4xl mb-4 animate-pulse">🔮</div>
              <div>Rüyalar yükleniyor...</div>
            </div>
          ) : dreams.length === 0 ? (
            <div className="text-center text-white/60 py-12">
              <div className="text-4xl mb-4">🌙</div>
              <div>Henüz rüya yok</div>
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
            <p>🌙 Dreamap © 2026 - Kolektif Bilinçdışının Dijital Haritası</p>
          </div>
        </footer>
      </div>
    </>
  )
}

function DreamCard({ dream }) {
  return (
    <article className="glass-card overflow-hidden">
      {/* Görsel */}
      {dream.ai_image_url && (
        <div className="dream-image aspect-video">
          <img 
            src={dream.ai_image_url} 
            alt="Dream visualization"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* İçerik */}
      <div className="p-8">
        {/* Arketipler */}
        <div className="flex flex-wrap gap-2 mb-4">
          {dream.ai_archetypes?.map((arch, i) => (
            <span key={i} className="archetype-badge">
              {getArchetypeIcon(arch)} {arch}
            </span>
          ))}
        </div>

        {/* Rüya Metni */}
        <p className="text-lg text-white/90 mb-6 leading-relaxed">
          {dream.content}
        </p>

        {/* AI Özeti */}
        <div className="glass-card p-6 mb-6" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔮</div>
            <div>
              <div className="text-sm font-semibold text-purple-300 mb-2">Jungian Analiz</div>
              <p className="text-white/80 leading-relaxed">
                {dream.ai_summary}
              </p>
            </div>
          </div>
        </div>

        {/* Meta Bilgiler */}
        <div className="flex items-center justify-between text-sm text-white/60 pt-4 border-t border-white/10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{dream.dream_date}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🌍</span>
              <span>{dream.original_language?.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💭</span>
              <span>{getEmotionEmoji(dream.ai_sentiment)} {dream.ai_sentiment}</span>
            </div>
          </div>
          {dream.location_name && dream.location_name !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span>{dream.location_name}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function getArchetypeIcon(archetype) {
  const icons = {
    'Shadow': '🌑',
    'Anima': '🌸',
    'Animus': '⚔️',
    'Wise Old Man': '🧙',
    'Great Mother': '🌺',
    'Hero': '🦸',
    'Trickster': '🎭',
    'Self': '☯️',
    'Snake': '🐍',
    'Water': '🌊',
    'Forest': '🌲',
    'Door': '🚪',
    'Tower': '🗼'
  }
  return icons[archetype] || '✨'
}

function getEmotionEmoji(emotion) {
  const emojis = {
    'Fear': '😨',
    'Anxiety': '😰',
    'Awe': '🤩',
    'Joy': '😊',
    'Confusion': '😕',
    'Peace': '😌',
    'Sadness': '😢',
    'Anger': '😠',
    'Disgust': '🤢',
    'Surprise': '😲'
  }
  return emojis[emotion] || '💭'
          }
