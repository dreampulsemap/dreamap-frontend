import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import DreamCard from '@/components/DreamCard'

const BATCH_SIZE = 15;

const TABS = [
  { id: 'dreamscape', label: 'Dreamscape', emoji: '🌌' },
  { id: 'visionboard', label: 'Vision Board', emoji: '🎯' },
  { id: 'victorywall', label: 'Victory Wall', emoji: '🏆' },
  { id: 'phoenixwall', label: 'Phoenix Wall', emoji: '🔥' },
]

export default function ExplorePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  const [activeTab, setActiveTab] = useState('dreamscape')

  // Dreamscape tab state (existing functionality)
  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Seçili rüyanın dizi içerisindeki indeksini tutar (Explore Slider için)
  const [activeDreamIndex, setActiveDreamIndex] = useState(null)
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

  const tabsLabel = mounted ? (lang === 'tr' ? 'Sekmeler' : 'Tabs') : 'Tabs'
  const dreamscapeLabel = mounted ? 'Dreamscape' : 'Dreamscape'
  const visionBoardLabel = mounted ? (lang === 'tr' ? 'Vizyon Panosu' : 'Vision Board') : 'Vision Board'
  const victoryWallLabel = mounted ? (lang === 'tr' ? 'Zafer Duvarı' : 'Victory Wall') : 'Victory Wall'
  const phoenixWallLabel = mounted ? (lang === 'tr' ? 'Phoenix Duvarı' : 'Phoenix Wall') : 'Phoenix Wall'

  const comingSoonLabel = mounted ? (lang === 'tr' ? 'Yakında' : 'Coming Soon') : 'Coming Soon'
  const victoryMsg = mounted ? (lang === 'tr' ? 'Zafer hikayeleri yakında burada olacak' : 'Victory stories coming soon') : 'Victory stories coming soon'
  const phoenixMsg = mounted ? (lang === 'tr' ? 'Kurtuluş hikayeleri yakında burada olacak' : 'Liberation stories coming soon') : 'Liberation stories coming soon'

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="starry-bg" />
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />

      <main className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-6">
        {/* ÜST BAŞLIK */}
        <div className="mb-6 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300 mb-2">
            🌐 {lang === 'tr' ? 'Küresel Rüya Ağı' : 'Global Dream Nexus'}
          </span>
          <h1 className="text-3xl font-bold font-serif gradient-text">
            {lang === 'tr' ? 'Kolektif Keşfet' : 'Explore'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
            {lang === 'tr'
              ? 'Tüm dünyadaki bilinçaltı parlamalarını, mistik görselleri ve nadir rüya kartlarını keşfedin.'
              : 'Discover deep archetypes, beautiful visuals, and raw subconscious signals from the global network.'}
          </p>
        </div>

        {/* TAB BAR — sticky, pill-shaped */}
        <div className="sticky top-0 z-40 -mx-3 sm:-mx-6 px-3 sm:px-6 pb-3 bg-black/60 backdrop-blur-md">
          <div
            role="tablist"
            aria-label={tabsLabel}
            className="flex gap-2 overflow-x-auto scrollbar-hide py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-fuchsia-500/30 text-white shadow-[0_0_12px_rgba(236,72,153,0.15)]'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base">{tab.emoji}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* TAB CONTENT with fade transition */}
        <div className="relative">
          {/* Dreamscape Tab (existing) */}
          <div
            role="tabpanel"
            className={`transition-opacity duration-300 ${activeTab === 'dreamscape' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          >
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
                      onClick={() => setActiveDreamIndex(index)}
                      className="group aspect-square relative overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 hover:border-fuchsia-500/40 shadow-lg cursor-pointer transition-all duration-300"
                    >
                      {hasImg ? (
                        <img
                          src={dream.ai_image_url}
                          alt="Explore Card"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col justify-between p-3 sm:p-5 bg-gradient-to-br from-purple-950/20 to-black select-none">
                          <span className="text-lg sm:text-2xl">{getSentimentEmoji(dream.ai_sentiment)}</span>
                          <p className="text-[10px] sm:text-xs text-white/70 leading-relaxed font-light line-clamp-3">"{dream.content}"</p>
                          <span className="text-[8px] sm:text-[10px] tracking-wider text-slate-500 uppercase">✦ {dream.location_name || 'Mystic Node'}</span>
                        </div>
                      )}

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
          </div>

          {/* Vision Board Tab — placeholder grid */}
          <div
            role="tabpanel"
            className={`transition-opacity duration-300 ${activeTab === 'visionboard' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          >
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`vision-${i}`}
                  className="group aspect-square relative overflow-hidden rounded-xl border border-white/5 bg-slate-900/40 hover:border-fuchsia-500/40 shadow-lg transition-all duration-300"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-purple-950/20 to-black select-none">
                    <span className="text-2xl sm:text-3xl">🎯</span>
                    <span className="text-[10px] sm:text-xs text-white/50 font-medium uppercase tracking-wider">{comingSoonLabel}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <span className="text-xs sm:text-sm font-semibold text-white/80">{comingSoonLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Victory Wall Tab — placeholder */}
          <div
            role="tabpanel"
            className={`transition-opacity duration-300 ${activeTab === 'victorywall' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          >
            <div className="glass-card rounded-[24px] p-12 text-center max-w-md mx-auto mt-10">
              <span className="text-5xl block mb-4">🏆</span>
              <h3 className="text-lg font-bold text-white mb-2">{victoryWallLabel}</h3>
              <p className="text-sm text-slate-400">{victoryMsg}</p>
            </div>
          </div>

          {/* Phoenix Wall Tab — placeholder */}
          <div
            role="tabpanel"
            className={`transition-opacity duration-300 ${activeTab === 'phoenixwall' ? 'opacity-100 block' : 'opacity-0 hidden'}`}
          >
            <div className="glass-card rounded-[24px] p-12 text-center max-w-md mx-auto mt-10">
              <span className="text-5xl block mb-4">🔥</span>
              <h3 className="text-lg font-bold text-white mb-2">{phoenixWallLabel}</h3>
              <p className="text-sm text-slate-400">{phoenixMsg}</p>
            </div>
          </div>
        </div>
      </main>

      {/* INSTAGRAM EXPLORE TARZI ARALIKSIZ GEÇİŞLİ MODAL ALTYAPISI */}
      {activeDreamIndex !== null && dreams[activeDreamIndex] && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveDreamIndex(null)}
        >
          {/* SOL GEÇİŞ OKU (Instagram Explore Style) */}
          {activeDreamIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveDreamIndex(activeDreamIndex - 1); }}
              className="fixed left-4 z-[200] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur hover:bg-white/15 transition-all text-xl"
              title={lang === 'tr' ? 'Önceki Rüya' : 'Previous Dream'}
            >
              ←
            </button>
          )}

          <div
            className="w-full max-w-2xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <DreamCard
              dream={dreams[activeDreamIndex]}
              lang={lang}
              onTranslate={() => {}}
              translating={false}
              translated={false}
              translatedContent=""
              translatedAnalysis=""
            />
          </div>

          {/* SAĞ GEÇİŞ OKU (Instagram Explore Style) */}
          {activeDreamIndex < dreams.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActiveDreamIndex(activeDreamIndex + 1); }}
              className="fixed right-4 z-[200] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur hover:bg-white/15 transition-all text-xl"
              title={lang === 'tr' ? 'Sonraki Rüya' : 'Next Dream'}
            >
              →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
