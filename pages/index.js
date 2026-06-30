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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🌌 Dreamap</h1>
          <nav className="flex gap-4">
            <a href="/" className="text-white/80 hover:text-white">Feed</a>
            <a href="/globe" className="text-white/80 hover:text-white">Globe</a>
            <a href="/auth" className="text-white/80 hover:text-white">Giriş</a>
          </nav>
        </div>
      </header>

      {/* Dream Feed */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-white mb-6">Son Rüyalar</h2>
        
        {loading ? (
          <div className="text-center text-white/60">Yükleniyor...</div>
        ) : dreams.length === 0 ? (
          <div className="text-center text-white/60">Henüz rüya yok</div>
        ) : (
          <div className="space-y-6">
            {dreams.map((dream) => (
              <DreamCard key={dream.id} dream={dream} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function DreamCard({ dream }) {
  return (
    <article className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden border border-white/20 hover:border-white/40 transition-all">
      {/* Görsel */}
      {dream.ai_image_url && (
        <div className="aspect-square bg-black/20">
          <img 
            src={dream.ai_image_url} 
            alt="Dream visualization"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* İçerik */}
      <div className="p-6">
        {/* Arketipler */}
        <div className="flex flex-wrap gap-2 mb-3">
          {dream.ai_archetypes?.map((arch, i) => (
            <span key={i} className="px-3 py-1 bg-purple-500/30 rounded-full text-xs text-white">
              {arch}
            </span>
          ))}
        </div>

        {/* Rüya Metni */}
        <p className="text-white/90 mb-4 line-clamp-3">
          {dream.content}
        </p>

        {/* AI Özeti */}
        <div className="bg-black/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-white/70">
            <span className="font-semibold text-purple-300">Jungian Analiz: </span>
            {dream.ai_summary}
          </p>
        </div>

        {/* Meta Bilgiler */}
        <div className="flex items-center justify-between text-sm text-white/60">
          <div className="flex items-center gap-4">
            <span>📅 {dream.dream_date}</span>
            <span>🌍 {dream.original_language?.toUpperCase()}</span>
            <span>💭 {dream.ai_sentiment}</span>
          </div>
          {dream.location_name && dream.location_name !== 'Unknown' && (
            <span>📍 {dream.location_name}</span>
          )}
        </div>
      </div>
    </article>
  )
}
