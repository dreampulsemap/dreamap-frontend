import { useEffect, useState, useCallback, useRef } from 'react'
import { Moon, Radar, Trophy, Sparkles, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import VisionGridCard from '@/components/VisionGridCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import SlidesViewer from '@/components/SlidesViewer'
import VisionVideoPlayer from '@/components/VisionVideoPlayer'
import VisionReelsFeed from '@/components/VisionReelsFeed'
import DreamReelsFeed from '@/components/DreamReelsFeed'
import Seo from '@/components/Seo'

// Android ExploreScreen ExploreTile: kare, yalnızca görsel; yüklenemezse ikon.
function ExploreTile({ dream, onClick }) {
  const [failed, setFailed] = useState(false)
  return (
    <button onClick={onClick} className="relative block aspect-square w-full overflow-hidden rounded-[2px] bg-void-800">
      {dream.ai_image_url && !failed ? (
        <img src={dream.ai_image_url} alt={dream.ai_title || ''} onError={() => setFailed(true)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center"><ImageIcon size={24} className="text-slate-600" /></span>
      )}
    </button>
  )
}

// Brief'teki orijinal mimari: Explore 4 alt-sekmeden oluşan bir "Yaşam Tarlası".
// Vision Board önceden ayrı bir sayfaydı (/vision-board) — bu geçici bir
// çözümdü. Artık Explore'un bir sekmesi, orijinal tasarımla tutarlı.
const HUBS = ['dreamscape', 'vision', 'victory', 'phoenix']

export default function ExplorePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [user, setUser] = useState(null)

  // Seçili rüyanın dizi içerisindeki indeksini tutar (Explore Slider için)
  const [activeDreamIndex, setActiveDreamIndex] = useState(null)
  const observerRef = useRef(null)

  // Kişiselleştirilmiş sıralama: ilk sayfada hesaplanan arketip-ilgi profilini
  // (rankToken) sonraki sayfalarda tekrar kullanıyoruz. asOf ise "şu an"ı
  // scroll boyunca sabitler, böylece araya yeni rüya girmesi sayfalar
  // arasında kayma/tekrar yaratmaz.
  const rankTokenRef = useRef(null)
  const asOfRef = useRef(null)

  // 4 sekmeli hub: Dreamscape (rüyalar) / Vision Board (aktif hedefler) /
  // Victory Wall (gerçekleşenler) / Phoenix Wall (vazgeçilenler)
  const [activeHub, setActiveHub] = useState('dreamscape')
  const [hubGoals, setHubGoals] = useState({ vision: [], victory: [], phoenix: [] })
  const [hubLoading, setHubLoading] = useState({ vision: false, victory: false, phoenix: false })
  const [hubError, setHubError] = useState({ vision: '', victory: '', phoenix: '' })
  const [hubLoaded, setHubLoaded] = useState({ vision: false, victory: false, phoenix: false })
  const [activeGoal, setActiveGoal] = useState(null)
  const [activeSlidesGoal, setActiveSlidesGoal] = useState(null)
  const [activeVideoGoal, setActiveVideoGoal] = useState(null)
  const [reelsGoalId, setReelsGoalId] = useState(null)

  // Bir karoya dokununca: video varsa doğrudan oto-oynayan
  // VisionVideoPlayer'a gir (Reels beslemesi video oynatmıyor, sadece kapak
  // görselini gösteriyor) — geri kalan HER ŞEY artık dikey kaydırmalı, tam
  // ekran VisionReelsFeed'den açılıyor; slayt/detay görüntüleyicileri
  // beslemenin İÇİNDEN ikincil eylem olarak tetikleniyor.
  function handleOpenGoal(goal) {
    if (goal.vision_video_url) setActiveVideoGoal(goal)
    else setReelsGoalId(goal.id)
  }

  const HUB_STATUS = { vision: 'active', victory: 'completed', phoenix: 'abandoned' }

  const loadHubGoals = useCallback(async (hub) => {
    if (hub === 'dreamscape') return
    setHubLoading((m) => ({ ...m, [hub]: true }))
    setHubError((m) => ({ ...m, [hub]: '' }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {}
      const res = await fetch(`/api/goals/list?mode=feed&status=${HUB_STATUS[hub]}`, { headers })
      const json = await res.json()
      if (!res.ok) {
        setHubError((m) => ({ ...m, [hub]: json.error || 'error' }))
        return
      }
      setHubGoals((g) => ({ ...g, [hub]: json.goals || [] }))
      setHubLoaded((l) => ({ ...l, [hub]: true }))
    } catch {
      setHubError((m) => ({ ...m, [hub]: 'network_error' }))
    } finally {
      setHubLoading((m) => ({ ...m, [hub]: false }))
    }
  }, [])

  function handleHubClick(hub) {
    setActiveHub(hub)
    // Tembel yükleme: sekmeye ilk kez geçildiğinde çek, sonrasında cache'den göster
    if (hub !== 'dreamscape' && !hubLoaded[hub] && !hubLoading[hub]) {
      loadHubGoals(hub)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Kullanıcıyı bir kere burada çözüp DreamCard'lara aşağı geçiriyoruz;
  // her kart kendi başına ayrı auth sorgusu yapmasın (yarış durumu / gecikme).
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUser(session?.user || null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null)
    })
    return () => {
      active = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  const lang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const tVision = getVisionBoardText(lang)

  const loadGlobalDreams = useCallback(async (pageNum = 0, append = false) => {
    setLoading(true)
    try {
      if (!asOfRef.current) {
        asOfRef.current = new Date().toISOString()
      }

      const { data: { session } } = await supabase.auth.getSession()
      const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {}

      const params = new URLSearchParams({ page: String(pageNum), asOf: asOfRef.current })
      if (pageNum > 0 && rankTokenRef.current) {
        params.set('rankToken', rankTokenRef.current)
      }

      const res = await fetch(`/api/explore/feed?${params.toString()}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'explore_feed_error')

      if (json.rankToken) rankTokenRef.current = json.rankToken

      const fetched = Array.isArray(json.dreams) ? json.dreams : []
      if (append) {
        setDreams((prev) => [...prev, ...fetched])
      } else {
        setDreams(fetched)
      }

      setPage(pageNum)
      setHasMore(!!json.hasMore)
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

  const tr = lang === 'tr'
  const TABS = [
    { hub: 'dreamscape', label: tr ? 'Rüyalar' : 'Dreams', icon: Moon },
    { hub: 'vision', label: tr ? 'Vizyon Panosu' : 'Vision Board', icon: Radar },
    { hub: 'victory', label: tr ? 'Zafer Duvarı' : 'Victory Wall', icon: Trophy },
    { hub: 'phoenix', label: tr ? 'Anka Duvarı' : 'Phoenix Wall', icon: Sparkles },
  ]
  const EMPTY = {
    vision: tr ? 'Henüz aktif bir vizyon yok' : 'No active visions yet',
    victory: tr ? 'Henüz kutlanan bir zafer yok' : 'No celebrated victories yet',
    phoenix: tr ? 'Anka Duvarı sessiz' : 'The Phoenix Wall is silent',
  }
  const Spinner = ({ cls = 'border-astral-gold' }) => (
    <div className="flex justify-center py-24"><span className={`h-10 w-10 animate-spin rounded-full border-4 border-white/10 ${cls}`} style={{ borderTopColor: 'currentColor' }} /></div>
  )
  const ErrorBox = ({ onRetry }) => (
    <div className="flex flex-col items-center px-6 py-24 text-center">
      <p className="font-serif text-base text-white">{tr ? 'Keşfet yüklenemedi' : 'Failed to load explore'}</p>
      <button onClick={onRetry} className="mt-4 flex items-center gap-2 rounded-full border border-aether-cyan/40 px-5 py-2 text-sm text-aether-cyan"><RefreshCw size={16} />{tr ? 'Tekrar Dene' : 'Retry'}</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-void-950 text-white">
      <Seo
        title="Keşfet — Paylaşılan Rüyalar ve Vizyonlar"
        description="Lunosfer topluluğunun paylaştığı rüyaları, arketip analizlerini ve vizyon panolarını keşfet. Herkese açık rüya akışında ilham al, benzer sembollerle karşılaşanları gör."
      />

      {/* Android ExploreScreen: ScrollableTabRow (ikon + serif etiket, altın alt çizgi) */}
      <div className="flex overflow-x-auto border-b border-white/[0.08] bg-void-950 pl-4" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(({ hub, label, icon: Icon }) => {
          const active = activeHub === hub
          return (
            <button
              key={hub}
              onClick={() => handleHubClick(hub)}
              className={`relative flex min-w-[90px] shrink-0 flex-col items-center gap-1 px-4 pb-2.5 pt-3 ${active ? 'text-astral-gold' : 'text-slate-400'}`}
            >
              <Icon size={18} fill={hub === 'dreamscape' || hub === 'victory' ? 'currentColor' : 'none'} />
              <span className="whitespace-nowrap font-serif text-[13px] font-bold">{label}</span>
              {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-astral-gold" />}
            </button>
          )
        })}
      </div>

      {activeHub === 'dreamscape' && (
        loading && dreams.length === 0 ? <Spinner cls="text-aether-cyan" /> : dreams.length === 0 ? (
          <p className="px-6 py-24 text-center text-sm text-slate-400">{tr ? 'Henüz keşfedilecek bir şey yok' : 'Nothing to explore yet'}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {dreams.map((dream, index) => (
                <div key={dream.id} ref={index === dreams.length - 1 ? lastElementRef : null}>
                  <ExploreTile dream={dream} onClick={() => setActiveDreamIndex(index)} />
                </div>
              ))}
            </div>
            {loadingMore && <div className="flex justify-center p-4"><span className="h-[22px] w-[22px] animate-spin rounded-full border-2 border-aether-cyan/25 border-t-aether-cyan" /></div>}
          </>
        )
      )}

      {activeHub !== 'dreamscape' && (
        hubLoading[activeHub] ? <Spinner cls="text-astral-gold" /> : hubError[activeHub] ? (
          <ErrorBox onRetry={() => loadHubGoals(activeHub)} />
        ) : hubGoals[activeHub].length === 0 ? (
          <p className="px-6 py-24 text-center text-sm text-slate-400">{EMPTY[activeHub]}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {hubGoals[activeHub].map((goal) => (
              <VisionGridCard key={goal.id} goal={goal} lang={lang} onClick={() => handleOpenGoal(goal)} />
            ))}
          </div>
        )
      )}


      {/* Eskiden yatay ok-tabanlı "Instagram Explore" modalıydı — artık
          rüyalar da vizyonlarla aynı, dikey kaydırmalı (reels tarzı) tam
          ekran beslemeden açılıyor. */}
      {activeDreamIndex !== null && dreams[activeDreamIndex] && (
        <DreamReelsFeed
          dreams={dreams}
          lang={lang}
          currentUserId={user?.id}
          initialDreamId={dreams[activeDreamIndex].id}
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loadingMore}
          onClose={() => setActiveDreamIndex(null)}
        />
      )}
      {activeGoal && (
        <GoalDetailModal
          goal={activeGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveGoal(null)}
          onChanged={(updated) => {
            setHubGoals((g) => {
              const next = { ...g }
              for (const hub of ['vision', 'victory', 'phoenix']) {
                next[hub] = next[hub].map((goal) => (goal.id === updated.id ? { ...goal, ...updated } : goal))
              }
              return next
            })
          }}
          onDeleted={(goalId) => {
            setHubGoals((g) => {
              const next = { ...g }
              for (const hub of ['vision', 'victory', 'phoenix']) {
                next[hub] = next[hub].filter((goal) => goal.id !== goalId)
              }
              return next
            })
          }}
        />
      )}
      {reelsGoalId && (
        <VisionReelsFeed
          goals={hubGoals[activeHub] || []}
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
            setHubGoals((g) => {
              const next = { ...g }
              for (const hub of ['vision', 'victory', 'phoenix']) {
                next[hub] = next[hub].map((goal) => (goal.id === updated.id ? { ...goal, ...updated } : goal))
              }
              return next
            })
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
            setHubGoals((g) => {
              const next = { ...g }
              for (const hub of ['vision', 'victory', 'phoenix']) {
                next[hub] = next[hub].map((goal) => (goal.id === updated.id ? { ...goal, ...updated } : goal))
              }
              return next
            })
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
    </div>
  )
}