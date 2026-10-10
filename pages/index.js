import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import Hero from '@/components/Hero'
import DreamFeedCard from '@/components/DreamFeedCard'
import VisionFeedCard from '@/components/VisionFeedCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import DreamReelsFeed from '@/components/DreamReelsFeed'
import DiaryStoryRow from '@/components/DiaryStoryRow'
import DiaryStoryViewer from '@/components/DiaryStoryViewer'
import DiaryComposer from '@/components/DiaryComposer'
import DailyCompass from '@/components/DailyCompass'
import { DailyQuestsCard } from '@/components/game/GameUI'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import Seo, { SITE_NAME, SITE_URL } from '@/components/Seo'

const HOME_JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['Lunosfer Rüya Nabız Ağı', 'Lunosfer Rüya Analizi'],
    url: SITE_URL,
    inLanguage: 'tr',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lunosfer — AI Destekli Jung Rüya Analizi',
    url: SITE_URL,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android',
    inLanguage: 'tr',
    description:
      'Rüyanı yaz; yapay zekâ sembollerini, baskın Jung arketipini ve duygusal temalarını çıkarsın. Rüya günlüğü, rüya tabirleri ve küresel rüya haritası.',
    keywords: 'rüya tabiri, rüya yorumu, rüya analizi, jung arketipleri, yapay zeka rüya yorumu, rüya günlüğü',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      'https://www.instagram.com/lunosfer.dream.app/',
      'https://play.google.com/store/apps/details?id=io.lunosfer.dreamap',
    ],
  },
]

const HOME_TEXT = {
  tr: {
    welcome: 'HOŞ GELDİN', summary: (d, v) => `Bugün ${d} rüya, ${v} aktif vizyon seni bekliyor`,
    streakStart: 'Serini bugün başlat', streakDays: (n) => `${n} gün seri`,
    tickerDream: (n) => `✨ ${n} az önce bir rüya paylaştı`, tickerVision: (n) => `🌠 ${n} az önce yeni bir vizyon başlattı`, someone: 'Biri',
    emptyTitle: 'Henüz akışında bir şey yok', emptyDesc: 'Bir rüya kaydet ya da bir vizyon oluştur, burada görünsün.',
    errorTitle: 'Akış yüklenemedi', retry: 'Tekrar Dene',
  },
  en: {
    welcome: 'WELCOME', summary: (d, v) => `Today, ${d} dreams and ${v} active visions await you`,
    streakStart: 'Start your streak today', streakDays: (n) => `${n} day streak`,
    tickerDream: (n) => `✨ ${n} just shared a dream`, tickerVision: (n) => `🌠 ${n} just started a new vision`, someone: 'Someone',
    emptyTitle: 'Nothing in your feed yet', emptyDesc: 'Record a dream or create a vision to see it here.',
    errorTitle: 'Could not load feed', retry: 'Retry',
  },
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// Android HomeViewModel.computeStreak: bugün ya da dünden geriye kesintisiz rüya günleri.
function computeStreak(dates) {
  const keys = [...new Set(dates.map((s) => dayKey(new Date(s))))]
  if (!keys.length) return 0
  const cursor = new Date()
  const today = dayKey(cursor)
  cursor.setDate(cursor.getDate() - 1)
  const yesterday = dayKey(cursor)
  if (keys[0] !== today && keys[0] !== yesterday) return 0
  const start = new Date()
  if (keys[0] === yesterday) start.setDate(start.getDate() - 1)
  let streak = 1
  for (let i = 1; i < keys.length; i++) {
    start.setDate(start.getDate() - 1)
    if (keys[i] === dayKey(start)) streak++
    else break
  }
  return streak
}

function WelcomeStreakHeader({ t, streak, dreamCount, visionCount }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-bold tracking-[3px] text-astral-gold">{t.welcome}</p>
      <p className="font-serif text-[15px] text-white">{t.summary(dreamCount, visionCount)}</p>
      <p className="flex items-center gap-1.5 text-xs">
        <span className="text-[13px]">🔥</span>
        <span className={streak > 0 ? 'font-bold text-astral-gold' : 'text-gray-500'}>{streak > 0 ? t.streakDays(streak) : t.streakStart}</span>
      </p>
    </div>
  )
}

function LiveActivityTicker({ items, t }) {
  const recent = items.slice(0, 10)
  const [i, setI] = useState(0)
  useEffect(() => {
    if (recent.length < 2) return
    const id = setInterval(() => setI((n) => (n + 1) % recent.length), 3500)
    return () => clearInterval(id)
  }, [recent.length])
  const item = recent[i % recent.length]
  if (!item) return null
  const name = item.owner?.username || t.someone
  return (
    <div className="rounded-xl border border-astral-gold/25 bg-void-800/60 px-3.5 py-2.5">
      <p key={`${item.feed_type}-${item.id}`} className="flex items-center gap-2 animate-fade-in">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-semantic-success-400" />
        <span className="truncate text-xs text-slate-300">{item.feed_type === 'dream' ? t.tickerDream(name) : t.tickerVision(name)}</span>
      </p>
    </div>
  )
}

export default function HomePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  const [feedError, setFeedError] = useState(false)
  const [streak, setStreak] = useState(0)
  const [activeVisions, setActiveVisions] = useState(0)
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [likeCounts, setLikeCounts] = useState({})
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

  useEffect(() => { setMounted(true) }, [])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const lang = currentLang
  const tVision = getVisionBoardText(lang)
  const tHome = HOME_TEXT[lang === 'tr' ? 'tr' : 'en']

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkUser()
  }, [])

  // Karşılama başlığı: kendi rüya günleri (seri) + kendi aktif vizyon sayısı (Android HomeRepository).
  useEffect(() => {
    if (!user) return
    supabase.from('dreams').select('created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(120)
      .then(({ data }) => setStreak(computeStreak((data || []).map((r) => r.created_at))))
    supabase.from('goals').select('id').eq('user_id', user.id).eq('status', 'active').limit(200)
      .then(({ data }) => setActiveVisions((data || []).length))
  }, [user])

  // Akıştaki rüyalardan hangilerini beğendiğim — kalp dolu/boş başlasın.
  const dreamIdsKey = items.filter((it) => it.feed_type === 'dream').map((it) => it.id).join(',')
  useEffect(() => {
    if (!user || !dreamIdsKey) return
    supabase.from('likes').select('dream_id').eq('user_id', user.id).in('dream_id', dreamIdsKey.split(',').map(Number))
      .then(({ data }) => setLikedIds(new Set((data || []).map((r) => r.dream_id))))
  }, [user, dreamIdsKey])

  async function toggleLike(dream) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const wasLiked = likedIds.has(dream.id)
    const prev = likeCounts[dream.id] ?? dream.likes_count ?? 0
    setLikedIds((s) => { const n = new Set(s); wasLiked ? n.delete(dream.id) : n.add(dream.id); return n })
    setLikeCounts((c) => ({ ...c, [dream.id]: wasLiked ? Math.max(0, prev - 1) : prev + 1 }))
    try {
      const res = await fetch('/api/like', {
        method: wasLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id }),
      })
      const json = await res.json()
      if (!res.ok && res.status !== 409) throw new Error()
      if (typeof json.count === 'number') setLikeCounts((c) => ({ ...c, [dream.id]: json.count }))
    } catch {
      setLikedIds((s) => { const n = new Set(s); wasLiked ? n.add(dream.id) : n.delete(dream.id); return n })
      setLikeCounts((c) => ({ ...c, [dream.id]: prev }))
    }
  }

  const loadFeed = useCallback(async (mode, cursorState, append) => {
    try {
      setFeedError(false)
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
      if (!append) setFeedError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const refreshFeed = useCallback(() => {
    setLoading(true)
    setItems([])
    setHasMore(true)
    loadFeed('all', { dreamsBefore: null, visionsBefore: null }, false)
  }, [loadFeed])

  useEffect(() => {
    refreshFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    loadFeed('all', cursors, true)
  }, [loadingMore, hasMore, cursors, loadFeed])

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

  const todayKey = dayKey(new Date())
  const todayDreams = dreamItems.filter((d) => d.created_at && dayKey(new Date(d.created_at)) === todayKey).length

  return (
    <div className="min-h-screen bg-void-950 text-white">
      <Seo jsonLd={HOME_JSON_LD} />

      {/* Android HomeFeedList sırası: karşılama > görevler > hikayeler > pusula > canlı bant > akış */}
      <div className="flex flex-col gap-5 px-4 pb-6 pt-5">
        {/* Hero artık dıştaki `mounted` bayrağının arkasında değil. `user`
            başlangıç değeri (useState(null)) hem sunucuda hem de istemcinin
            hydration-öncesi ilk renderında aynı olduğu için `!user` kontrolü
            burada hydration mismatch riski taşımıyor. Önceki haliyle Hero
            tamamen `mounted`'a bağlıydı ve SSR/ilk HTML'de (Google,
            WhatsApp/Twitter link önizlemesi gibi JS çalıştırmayan ya da geç
            çalıştıran taramalarda) hiç görünmüyordu — anasayfanın tek gerçek
            metin içeriği bu şekilde arama motorlarına ulaşmıyordu. */}
        {!user && <Hero />}
        {mounted && user && <WelcomeStreakHeader t={tHome} streak={streak} dreamCount={todayDreams} visionCount={activeVisions} />}
        {user && <DailyQuestsCard lang={lang} href="/journey" />}
        {mounted && user && (
          <DiaryStoryRow
            lang={lang}
            currentUser={user}
            onOpenViewer={(groups, startIndex) => setDiaryViewer({ groups, startIndex })}
            onCompose={() => setShowDiaryComposer(true)}
          />
        )}
        {user && <DailyCompass lang={lang} />}

        {!mounted || loading ? (
          <div className="flex justify-center py-16">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-astral-gold/25 border-t-astral-gold" />
          </div>
        ) : feedError ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <p className="font-serif text-base text-white">{tHome.errorTitle}</p>
            <button onClick={refreshFeed} className="mt-4 rounded-full border border-astral-gold/40 px-5 py-2 text-sm text-astral-gold">↻ {tHome.retry}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="font-serif text-base text-white">{tHome.emptyTitle}</p>
            <p className="mt-2 text-xs text-slate-400">{tHome.emptyDesc}</p>
          </div>
        ) : (
          <>
            <LiveActivityTicker items={items} t={tHome} />
            {items.map((item, idx) => (
              <div key={`${item.feed_type}-${item.id}`} ref={idx === items.length - 1 ? lastElementRef : null}>
                {item.feed_type === 'dream' ? (
                  <DreamFeedCard
                    dream={item}
                    lang={lang}
                    onOpen={setActiveDream}
                    currentUserId={user?.id}
                    liked={likedIds.has(item.id)}
                    likesCount={likeCounts[item.id]}
                    onToggleLike={() => (user ? toggleLike(item) : null)}
                  />
                ) : (
                  <VisionFeedCard goal={item} lang={lang} onOpen={handleOpenGoal} currentUserId={user?.id} />
                )}
              </div>
            ))}
          </>
        )}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-astral-gold/25 border-t-astral-gold" />
          </div>
        )}
      </div>

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
