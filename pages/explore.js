import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import DreamCard from '@/components/DreamCard'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import EmptyState from '@/components/EmptyState'
import ErrorState from '@/components/ErrorState'

const BATCH_SIZE = 15;

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

  // Kullanıcı arama (Instagram Explore tarzı)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [followBusyIds, setFollowBusyIds] = useState({})

  // Seçili rüyanın dizi içerisindeki indeksini tutar (Explore Slider için)
  const [activeDreamIndex, setActiveDreamIndex] = useState(null)
  const observerRef = useRef(null)

  // 4 sekmeli hub: Dreamscape (rüyalar) / Vision Board (aktif hedefler) /
  // Victory Wall (gerçekleşenler) / Phoenix Wall (vazgeçilenler)
  const [activeHub, setActiveHub] = useState('dreamscape')
  const [hubGoals, setHubGoals] = useState({ vision: [], victory: [], phoenix: [] })
  const [hubLoading, setHubLoading] = useState({ vision: false, victory: false, phoenix: false })
  const [hubError, setHubError] = useState({ vision: '', victory: '', phoenix: '' })
  const [hubLoaded, setHubLoaded] = useState({ vision: false, victory: false, phoenix: false })
  const [activeGoal, setActiveGoal] = useState(null)

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

  // Aramayı debounce ediyoruz — her tuş vuruşunda değil, kullanıcı yazmayı
  // bıraktıktan ~350ms sonra istek atıyoruz.
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearchError('')
      setSearchLoading(false)
      return
    }
    if (!user?.id) {
      setSearchError(lang === 'tr' ? 'Kullanıcı aramak için giriş yapmalısın.' : 'Log in to search for users.')
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    setSearchError('')
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/friends/search?query=${encodeURIComponent(q)}&userId=${user.id}`)
        const json = await res.json()
        if (!res.ok) {
          setSearchError(json.error || 'error')
          setSearchResults([])
        } else {
          setSearchResults(json.users || [])
        }
      } catch (err) {
        setSearchError(lang === 'tr' ? 'Bağlantı hatası' : 'Network error')
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 350)

    return () => clearTimeout(timeout)
  }, [searchQuery, user, lang])

  const handleFollow = useCallback(async (targetUser) => {
    if (!user?.id || followBusyIds[targetUser.id]) return
    setFollowBusyIds((m) => ({ ...m, [targetUser.id]: true }))
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: targetUser.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setSearchResults((list) =>
          list.map((u) => (u.id === targetUser.id ? { ...u, friendshipStatus: json.status } : u))
        )
      }
    } catch (err) {
      // sessizce yut — kullanıcı tekrar deneyebilir
    } finally {
      setFollowBusyIds((m) => ({ ...m, [targetUser.id]: false }))
    }
  }, [user, followBusyIds])

  const isSearching = searchQuery.trim().length > 0

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
        <div className={`mb-8 text-center sm:text-left transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
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

        {/* ARAMA ÇUBUĞU (INSTAGRAM EXPLORE STYLE) */}
        <div className={`mb-6 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative max-w-md">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'tr' ? 'Kullanıcı ara...' : 'Search users...'}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {!isSearching && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
            {HUBS.map((hub) => {
              const labels = {
                dreamscape: { tr: '🌙 Rüyalar', en: '🌙 Dreamscape' },
                vision: { tr: '🎯 Vizyon Panosu', en: '🎯 Vision Board' },
                victory: { tr: '🏆 Zafer Duvarı', en: '🏆 Victory Wall' },
                phoenix: { tr: '🕊️ Anka Duvarı', en: '🕊️ Phoenix Wall' },
              }
              const activeStyles = {
                dreamscape: 'bg-fuchsia-500 text-white',
                vision: 'bg-cyan-500 text-black',
                victory: 'bg-emerald-500 text-black',
                phoenix: 'bg-slate-400 text-black',
              }
              return (
                <button
                  key={hub}
                  onClick={() => handleHubClick(hub)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                    activeHub === hub ? activeStyles[hub] : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {labels[hub][lang] || labels[hub].en}
                </button>
              )
            })}
          </div>
        )}

        {isSearching ? (
          <div className="max-w-md">
            {searchLoading ? (
              <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            ) : searchError ? (
              <p className="text-rose-400 text-sm py-6 text-center">{searchError}</p>
            ) : searchResults.length === 0 ? (
              <p className="text-slate-500 text-sm py-10 text-center">
                {lang === 'tr' ? `"${searchQuery}" için sonuç bulunamadı.` : `No results for "${searchQuery}".`}
              </p>
            ) : (
              <ul className="space-y-1">
                {searchResults.map((result) => (
                  <li
                    key={result.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <Link href={`/u/${result.id}`} className="w-11 h-11 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-800 flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden relative">
                      {result.avatar_url ? (
                        <Image src={result.avatar_url} alt={result.username} fill sizes="44px" className="object-cover" />
                      ) : (
                        (result.display_name || result.username || '?').charAt(0).toUpperCase()
                      )}
                    </Link>
                    <Link href={`/u/${result.id}`} className="min-w-0 flex-1">
                      <p className="text-white text-sm font-semibold truncate">
                        {result.display_name || result.username}
                      </p>
                      {result.username && (
                        <p className="text-slate-500 text-xs truncate">@{result.username}</p>
                      )}
                    </Link>
                    <button
                      onClick={() => handleFollow(result)}
                      disabled={result.friendshipStatus === 'accepted' || result.friendshipStatus === 'pending' || followBusyIds[result.id]}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                        result.friendshipStatus === 'accepted'
                          ? 'bg-white/5 text-slate-500 cursor-default'
                          : result.friendshipStatus === 'pending'
                          ? 'bg-white/5 text-amber-400 cursor-default'
                          : 'bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50'
                      }`}
                    >
                      {result.friendshipStatus === 'accepted'
                        ? (lang === 'tr' ? 'Takipte' : 'Following')
                        : result.friendshipStatus === 'pending'
                        ? (lang === 'tr' ? 'Bekliyor' : 'Pending')
                        : (lang === 'tr' ? 'Takip Et' : 'Follow')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
        <>
        {activeHub === 'dreamscape' && (
        <>
        {/* 3 KOLONLU GÖRSEL IZGARA (INSTAGRAM STYLE) */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            {mounted && <span className="text-xs tracking-wider uppercase">{lang === 'tr' ? 'Keşfet Yükleniyor...' : 'Loading Explore Grid...'}</span>}
          </div>
        ) : dreams.length === 0 ? (
          <EmptyState icon="🌌" title={lang === 'tr' ? 'Keşfedecek Rüya Yok' : 'Explore is Empty'} />
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
                    <Image
                      src={dream.ai_image_url}
                      alt="Explore Card"
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
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
        </>
        )}

        {(activeHub === 'vision' || activeHub === 'victory' || activeHub === 'phoenix') && (
          <>
            {hubLoading[activeHub] ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            ) : hubError[activeHub] ? (
              <ErrorState lang={lang} onRetry={() => loadHubGoals(activeHub)} />
            ) : hubGoals[activeHub].length === 0 ? (
              <EmptyState
                icon={activeHub === 'vision' ? '🎯' : activeHub === 'victory' ? '🏆' : '🕊️'}
                title={
                  activeHub === 'vision'
                    ? (lang === 'tr' ? 'Henüz aktif bir vizyon yok' : 'No active visions yet')
                    : activeHub === 'victory'
                    ? (lang === 'tr' ? 'Henüz kutlanan bir zafer yok' : 'No victories celebrated yet')
                    : (lang === 'tr' ? 'Anka Duvarı sessiz' : 'The Phoenix Wall is quiet')
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {hubGoals[activeHub].map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    lang={lang}
                    currentUserId={user?.id}
                    onOpenGoal={setActiveGoal}
                  />
                ))}
              </div>
            )}
          </>
        )}
        </>
        )}
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
              currentUserId={user?.id}
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
    </div>
  )
}