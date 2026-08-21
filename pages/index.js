import { useCallback, useEffect, useRef, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import Hero from '@/components/Hero'
import DreamFeedCard from '@/components/DreamFeedCard'
import VisionFeedCard from '@/components/VisionFeedCard'
import HomeFeedFilter from '@/components/HomeFeedFilter'
import GoalDetailModal from '@/components/GoalDetailModal'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import DreamReelsFeed from '@/components/DreamReelsFeed'
import DiaryStoryRow from '@/components/DiaryStoryRow'
import DiaryStoryViewer from '@/components/DiaryStoryViewer'
import DiaryComposer from '@/components/DiaryComposer'
import DailyCompass from '@/components/DailyCompass'
import TextSkeleton from '@/components/TextSkeleton'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import Seo, { SITE_NAME, SITE_URL } from '@/components/Seo'

const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  },
]

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
  const [activeSlidesGoal, setActiveSlidesGoal] = useState(null)
  const [activeVideoGoal, setActiveVideoGoal] = useState(null)
  const [reelsGoalId, setReelsGoalId] = useState(null)
  const [diaryViewer, setDiaryViewer] = useState(null) // { groups, startIndex } | null
  const [showDiaryComposer, setShowDiaryComposer] = useState(false)

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

  const visionItems = items.filter((it) => it.feed_type === 'vision')
  const dreamItems = items.filter((it) => it.feed_type === 'dream')

  // Bir vizyon kartına ya da Shuffle'a dokununca: video varsa doğrudan
  // oto-oynayan VisionVideoPlayer'a gir (Reels beslemesi video oynatmıyor,
  // sadece kapak görselini gösteriyor) — geri kalan HER ŞEY (slaytlı ya da
  // düz görselli) artık dikey kaydırmalı, tam ekran VisionReelsFeed'den
  // açılıyor; slayt/detay görüntüleyicileri beslemenin İÇİNDEN ikincil eylem
  // olarak tetikleniyor (onOpenSlides/onOpenGoal prop'ları).
  function handleOpenGoal(goal) {
    if (goal.vision_video_url) setActiveVideoGoal(goal)
    else setReelsGoalId(goal.id)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Seo jsonLd={HOME_JSON_LD} />

      {mounted && user && (
        <DiaryStoryRow
          lang={lang}
          currentUser={user}
          onOpenViewer={(groups, startIndex) => setDiaryViewer({ groups, startIndex })}
          onCompose={() => setShowDiaryComposer(true)}
        />
      )}

      <div className="sticky top-14 sm:top-16 z-30 bg-black/85 backdrop-blur-md border-b border-white/5">
        <HomeFeedFilter value={filterMode} onChange={setFilterMode} lang={lang} />
      </div>

      <div className="pt-4 px-3 sm:px-4 max-w-xl mx-auto pb-24">
        {/* Hero artık dıştaki `mounted` bayrağının arkasında değil. `user`
            başlangıç değeri (useState(null)) hem sunucuda hem de istemcinin
            hydration-öncesi ilk renderında aynı olduğu için `!user` kontrolü
            burada hydration mismatch riski taşımıyor. Önceki haliyle Hero
            tamamen `mounted`'a bağlıydı ve SSR/ilk HTML'de (Google,
            WhatsApp/Twitter link önizlemesi gibi JS çalıştırmayan ya da geç
            çalıştıran taramalarda) hiç görünmüyordu — anasayfanın tek gerçek
            metin içeriği bu şekilde arama motorlarına ulaşmıyordu. */}
        {!user && <Hero />}
        {user && (
          <div className="mb-4">
            <DailyCompass lang={lang} />
          </div>
        )}

        {!mounted || loading ? (
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
                    <VisionFeedCard goal={item} lang={lang} onOpen={handleOpenGoal} />
                  )}
                </div>
              ))
        )}
        {loadingMore && <TextSkeleton />}
      </div>

      {/* Rastgele bir vizyonla Reels akışını açan sürpriz kısayol */}
      {mounted && user && visionItems.length > 0 && (
        <button
          onClick={() => {
            const pick = visionItems[Math.floor(Math.random() * visionItems.length)]
            handleOpenGoal(pick)
          }}
          className="group fixed bottom-20 sm:bottom-6 right-5 z-40 block active:scale-95 transition-transform"
          aria-label={lang === 'tr' ? 'Sürpriz vizyon reels aç' : 'Open a surprise vision reel'}
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-aether-indigo to-aether-violet blur opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-void-950 border border-aether-indigo/40 text-aether-indigo shadow-[0_0_25px_rgba(129,140,248,0.3)]">
            <Shuffle size={22} />
          </span>
          <span className="absolute -top-1 -right-1 text-sm leading-none">✨</span>
        </button>
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
          goals={visionItems}
          lang={lang}
          t={tVision}
          currentUserId={user?.id}
          initialGoalId={reelsGoalId}
          hasMore={false}
          loading={false}
          onClose={() => setReelsGoalId(null)}
          onOpenGoal={(g) => { setReelsGoalId(null); setActiveGoal(g) }}
          onOpenSlides={(g) => { setReelsGoalId(null); setActiveSlidesGoal(g) }}
        />
      )}

      {activeVideoGoal && (
        <VisionVideoPlayer
          goal={activeVideoGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveVideoGoal(null)}
          onChanged={(updated) => {
            setActiveVideoGoal((g) => (g ? { ...g, ...updated } : g))
            setItems((prev) => prev.map((it) => (it.id === updated.id && it.feed_type === 'vision' ? { ...it, ...updated } : it)))
          }}
          onOpenDetails={(g) => {
            setActiveVideoGoal(null)
            setActiveGoal(g || activeVideoGoal)
          }}
        />
      )}

      {activeSlidesGoal && (
        <SlidesViewer
          goal={activeSlidesGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveSlidesGoal(null)}
          onChanged={(updated) => {
            setActiveSlidesGoal((g) => (g ? { ...g, ...updated } : g))
            setItems((prev) => prev.map((it) => (it.id === updated.id && it.feed_type === 'vision' ? { ...it, ...updated } : it)))
          }}
          onOpenDetails={() => {
            const goal = activeSlidesGoal
            setActiveSlidesGoal(null)
            setActiveGoal(goal)
          }}
          onEditSlides={() => {
            const goal = activeSlidesGoal
            setActiveSlidesGoal(null)
            setActiveGoal(goal)
          }}
        />
      )}

      {diaryViewer && (
        <DiaryStoryViewer
          groups={diaryViewer.groups}
          startIndex={diaryViewer.startIndex}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setDiaryViewer(null)}
        />
      )}

      {showDiaryComposer && (
        <DiaryComposer
          lang={lang}
          currentUser={user}
          onClose={() => setShowDiaryComposer(false)}
          onCreated={() => setShowDiaryComposer(false)}
        />
      )}

      {activeDream && (
        <DreamReelsFeed
          dreams={dreamItems}
          lang={lang}
          currentUserId={user?.id}
          initialDreamId={activeDream.id}
          hasMore={false}
          loading={false}
          onClose={() => setActiveDream(null)}
        />
      )}
    </div>
  )
}
