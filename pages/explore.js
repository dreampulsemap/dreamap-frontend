import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import DreamCard from '@/components/DreamCard'

const BATCH_SIZE = 15;

export default function ExplorePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Seçili rüyanın modalı
  const [activeDream, setActiveDream] = useState(null)
  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'

  const loadGlobalDreams = useCallback(async (pageNum = 0, append = false) => {
    try {
      const from = pageNum * BATCH_SIZE
      const to = from + BATCH_SIZE - 1

      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('in_feed', true)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const fetched = Array.isArray(data) ? data : []
      if (append) {
        setDreams((prev) => [...prev, ...fetched])
      } else {
        setDreams(fetched)
      }

      setPage(pageNum)
      if (fetched.length < BATCH_SIZE) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }
    } catch (err) {
      console.error('Explore loading failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGlobalDreams(0, false)
  }, [loadGlobalDreams])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadGlobalDreams(page + 1, true)
    setLoadingMore(false)
  }, [page, hasMore, loadingMore, loadGlobalDreams])

  const lastElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [loading, loadingMore, hasMore, loadMore]
  )

  const getSentimentEmoji = (sentiment) => {
    const map = { Fear: '😨', Anxiety: '😰', Joy: '😊', Peace: '😌', Sadness: '😢', Awe: '😲', Confusion: '😕', Surprise: '😮' }
    return map[sentiment] || '🔮'
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="starry-bg" />
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />
      
      <main className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-6">
        {/* ÜST BAŞLIK */}
        <div className="mb-8 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2">
            🌐 {lang === 'tr' ? 'Küresel Rüya Ağı' : 'Global Dream Nexus'}
          </span>
          <h1 className="text-3xl font-bold font-serif gradient-text">
            {lang === 'tr' ? 'Kolektif Keşfet' : 'Collective Explore'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
            {lang === 'tr' 
              ? 'Tüm dünyadaki bilinçaltı parlamalarını, mistik görselleri ve nadir rüya kartlarını keşfedin.' 
              : 'Discover deep archetypes, beautiful visuals, and raw subconscious signals from the global network.'}
          </p>
        </div>

        {/* 3 KOLONLU GÖRSEL IZGARA (INSTAGRAM STYLE) */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="text-xs tracking-wider uppercase">{lang === 'tr' ? 'Keşfet Yükleniyor...' : 'Loading Explore Grid...'}</span>
          </div>
        ) : dreams.length === 0 ? (
          <div className="glass-card rounded-[24px] p-12 text-center max-w-md mx-auto mt-10">
            <span className="text-3xl">🌌</span>
            <h3 className="text-lg font-bold text-white mt-4">{lang === 'tr' ? 'Keşfedecek Rüya Yok' : 'Explore is Empty'}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {dreams.map((dream, index) => {
              const isLast = index === dreams.length - 1
              const hasImg = !!dream.ai_image_url

              return (
                <div
                  key={dream.id}
                  ref={isLast ? lastElementRef : null}
                  onClick={() => setActiveDream(dream)}
                  className="group aspect-square relative overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 hover:border-fuchsia-500/40 shadow-lg cursor-pointer transition-all duration-300"
                >
                  {hasImg ? (
                    <img
                      src={dream.ai_image_url}
                      alt="Explore Card"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    // Görseli olmayan rüyalar için estetik duygu kartları (Kullanıcıya 2 Aura harcatma teşviki)
                    <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-br from-purple-950/20 to-black select-none">
                      <span className="text-lg sm:text-2xl">{getSentimentEmoji(dream.ai_sentiment)}</span>
                      <p className="text-[10px] sm:text-xs text-white/70 leading-relaxed font-light line-clamp-3">"{dream.content}"</p>
                      <span className="text-[8px] sm:text-[10px] tracking-wider text-slate-500 uppercase">✦ {dream.location_name || 'Mystic Node'}</span>
                    </div>
                  )}

                  {/* HOVER HOVER KAPLAMA EFEKTİ (Giriş Etkileşim Sayıları) */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all duration-300">
                    <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white">
                      ❤️ {dream.likes_count || 0}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold flex items-center gap-1 text-white">
                      💬 {dream.comments_count || 0}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {loadingMore && (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
            <span className="text-xs uppercase tracking-widest">{lang === 'tr' ? 'Keşif Devam Ediyor...' : 'Loading More...'}</span>
          </div>
        )}
      </main>

      {/* SESSİZ MODAL TETİKLEYİCİSİ (Seçilen Keşfet rüyasını doğrudan 7 Slaytlı Carousel ile açar!) */}
      {activeDream && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setActiveDream(null)}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh]" 
            onClick={(e) => e.stopPropagation()}
          >
            <DreamCard 
              dream={activeDream} 
              lang={lang} 
              onTranslate={() => {}}
              translating={false}
              translated={false}
              translatedContent=""
              translatedAnalysis=""
            />
          </div>
        </div>
      )}
    </div>
  )
}