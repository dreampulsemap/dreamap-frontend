import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import Hero from '@/components/Hero'
import DreamCard from '@/components/DreamCard'
import DreamFeedCard from '@/components/DreamFeedCard'
import VisionFeedCard from '@/components/VisionFeedCard'
import HomeFeedFilter from '@/components/HomeFeedFilter'
import GoalDetailModal from '@/components/GoalDetailModal'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import CreateGoalModal from '@/components/CreateGoalModal'
import TextSkeleton from '@/components/TextSkeleton'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'

export default function HomePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'dreams' | 'visions'
  const [items, setItems] = useState([])
  const [cursors, setCursors] = useState({ dreamsBefore: null, visionsBefore: null })
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeDream, setActiveDream] = useState(null)
  const [activeGoal, setActiveGoal] = useState(null)
  const [reelsGoalId, setReelsGoalId] = useState(null)
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [showCreateMenu, setShowCreateMenu] = useState(false)

  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = window.sessionStorage.getItem('dreamap_home_filter')
      if (saved === 'all' || saved === 'dreams' || saved === 'visions') setFilterMode(saved)
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (!mounted) return
    try { window.sessionStorage.setItem('dreamap_home_filter', filterMode) } catch (_) {}
  }, [filterMode, mounted])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const lang = currentLang
  const tVision = getVisionBoardText(lang)

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkUser()
  }, [])

  const loadFeed = useCallback(async (mode, cursorState, append) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const params = new URLSearchParams({ type: mode })
      if (append) {
        if (cursorState.dreamsBefore) params.set('dreamsBefore', cursorState.dreamsBefore)
        if (cursorState.visionsBefore) params.set('visionsBefore', cursorState.visionsBefore)
      }
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {}
      const res = await fetch(`/api/home-feed?${params.toString()}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'feed_error')

      setItems((prev) => (append ? [...prev, ...json.items] : json.items))
      setCursors({ dreamsBefore: json.nextDreamsBefore, visionsBefore: json.nextVisionsBefore })
      setHasMore(json.hasMore)
    } catch (err) {
      console.error('home feed error', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const refreshFeed = useCallback(() => {
    setLoading(true)
    setItems([])
    setHasMore(true)
    loadFeed(filterMode, { dreamsBefore: null, visionsBefore: null }, false)
  }, [filterMode, loadFeed])

  useEffect(() => {
    refreshFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    loadFeed(filterMode, cursors, true)
  }, [loadingMore, hasMore, filterMode, cursors, loadFeed])

  const lastElementRef = useCallback(
    (node) => {
      if (loading || !hasMore) return
      if (observerRef.current) observerRef.current.disconnect()
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !loadingMore) loadMore()
      })
      if (node) observerRef.current.observe(node)
    },
    [loading, hasMore, loadingMore, loadMore]
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="sticky top-14 sm:top-16 z-30 bg-black/85 backdrop-blur-md border-b border-white/5">
        <HomeFeedFilter value={filterMode} onChange={setFilterMode} lang={lang} />
      </div>

      <div className="pt-4 px-3 sm:px-4 max-w-xl mx-auto pb-24">
        {!mounted ? (
          <div className="space-y-6">
            <TextSkeleton />
            <TextSkeleton />
          </div>
        ) : (
          <>
            {!user && <Hero />}
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <TextSkeleton key={i} />)}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-400">{getTranslation('common.noDreams', lang)}</p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={`${item.feed_type}-${item.id}`} ref={idx === items.length - 1 ? lastElementRef : null}>
                  {item.feed_type === 'dream' ? (
                    <DreamFeedCard dream={item} lang={lang} onOpen={setActiveDream} />
                  ) : (
                    <VisionFeedCard goal={item} lang={lang} onOpen={(g) => setReelsGoalId(g.id)} />
                  )}
                </div>
              ))
            )}
            {loadingMore && <TextSkeleton />}
          </>
        )}
      </div>

      {/* Yeni rüya/vizyon oluşturma FAB'ı */}
      {mounted && user && (
        <div className="fixed bottom-20 sm:bottom-6 right-5 z-40">
          {showCreateMenu && (
            <div className="mb-3 flex flex-col items-end gap-2 animate-fade-in">
              <Link
                href="/add-dream"
                className="rounded-full bg-white text-black text-xs font-bold px-4 py-2.5 shadow-lg whitespace-nowrap"
              >
                {lang === 'tr' ? '🌙 Rüya Ekle' : '🌙 Log a Dream'}
              </Link>
              <button
                onClick={() => { setShowCreateMenu(false); setShowCreateGoal(true) }}
                className="rounded-full bg-white text-black text-xs font-bold px-4 py-2.5 shadow-lg whitespace-nowrap"
              >
                {lang === 'tr' ? '✨ Vizyon Ekle' : '✨ New Vision'}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowCreateMenu((v) => !v)}
            className="h-14 w-14 rounded-full bg-fuchsia-600 text-white flex items-center justify-center shadow-xl hover:bg-fuchsia-500 transition-colors"
            aria-label={lang === 'tr' ? 'Oluştur' : 'Create'}
          >
            {showCreateMenu ? <X size={22} /> : <Plus size={22} />}
          </button>
        </div>
      )}

      {showCreateGoal && (
        <CreateGoalModal
          lang={lang}
          onClose={() => setShowCreateGoal(false)}
          onCreated={() => { setShowCreateGoal(false); refreshFeed() }}
        />
      )}

      {activeGoal && (
        <GoalDetailModal
          goal={activeGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveGoal(null)}
          onChanged={(updated) => setItems((prev) => prev.map((it) => (it.id === updated.id && it.feed_type === 'vision' ? { ...it, ...updated } : it)))}
        />
      )}

      {reelsGoalId && (
        <VisionReelsFeed
          goals={items.filter((it) => it.feed_type === 'vision')}
          lang={lang}
          t={tVision}
          currentUserId={user?.id}
          initialGoalId={reelsGoalId}
          hasMore={false}
          loading={false}
          onClose={() => setReelsGoalId(null)}
          onOpenGoal={(g) => { setReelsGoalId(null); setActiveGoal(g) }}
          onOpenSlides={(g) => { setReelsGoalId(null); setActiveGoal(g) }}
        />
      )}

      {activeDream && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setActiveDream(null)}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <DreamCard
              dream={activeDream}
              lang={lang}
              currentUserId={user?.id}
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
