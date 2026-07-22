import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Hero from '@/components/Hero'
import DreamCard from '@/components/DreamCard'
import DailyCompass from '@/components/DailyCompass'
import GoalCard from '@/components/GoalCard'
import GoalDetailModal from '@/components/GoalDetailModal'
import CreateGoalModal from '@/components/CreateGoalModal'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { ARCHETYPE_LOCALIZATIONS } from '@/lib/archetypeTranslations'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import TextSkeleton from '@/components/TextSkeleton'

const BATCH_SIZE = 10;

// "Derin Duygular" sekmesi eskiden sadece 3 duyguya bakıyordu (Fear/Anxiety/Awe).
// Yoğun/rahatsız edici sayılabilecek duyguların tamamını kapsayacak şekilde genişletildi.
const INTENSE_EMOTIONS = ['Fear', 'Anxiety', 'Anger', 'Sadness', 'Loneliness', 'Shame', 'Disgust', 'Confusion']

export default function HomePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)

  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedArchetype, setSelectedArchetype] = useState(null)

  // ANA SEKME (profile.js'deki ile aynı format): Vizyon Panosu varsayılan,
  // Rüyalar (mevcut filtre çubuklu akış) yan sekme.
  const [homeTab, setHomeTab] = useState('vision') // 'vision' | 'dreams'
  const [goals, setGoals] = useState([])
  const [goalsLoading, setGoalsLoading] = useState(true)
  const [goalsLoaded, setGoalsLoaded] = useState(false)
  const [activeGoal, setActiveGoal] = useState(null)
  const [showCreateGoal, setShowCreateGoal] = useState(false)

  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const lang = currentLang
  const tVision = getVisionBoardText(lang)

  // Kullanıcı Durumunu Kontrol Et (Hero görünürlüğü için)
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      loadGoals(session?.user || null)
    }
    checkUser()
  }, [loadGoals])

  const loadGoals = useCallback(async (currentUser) => {
    setGoalsLoading(true)
    try {
      if (currentUser?.id) {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/goals/list?mode=friends', {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        const json = await res.json()
        if (res.ok) setGoals(json.goals || [])
      } else {
        // Giriş yapmamış kullanıcı: "arkadaşlar" kapsamı anlamsız, herkese
        // açık keşfet feed'ine düş (dream feed'in guest davranışıyla tutarlı).
        const res = await fetch('/api/goals/list?mode=feed')
        const json = await res.json()
        if (res.ok) setGoals(json.goals || [])
      }
    } catch (err) {
      console.error('Goals load error:', err)
    } finally {
      setGoalsLoading(false)
      setGoalsLoaded(true)
    }
  }, [])

  // Akışı Getir
  const loadFeedData = useCallback(async (pageNum = 0, append = false) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const from = pageNum * BATCH_SIZE
      const to = from + BATCH_SIZE - 1

      let query = supabase.from('dreams').select('*').eq('in_feed', true)

      if (currentUser?.id) {
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

        const friendIds = friendships 
          ? friendships.map(f => f.user_id === currentUser.id ? f.friend_id : f.user_id) 
          : []

        const allowedUserIds = [currentUser.id, ...friendIds]
        query = query.in('user_id', allowedUserIds)
      }

      const { data: dreamsData, error: dreamsError } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (dreamsError) throw dreamsError

      const fetched = Array.isArray(dreamsData) ? dreamsData : []
      if (append) {
        setDreams((prev) => [...prev, ...fetched])
      } else {
        setDreams(fetched)
      }

      setPage(pageNum)
      setHasMore(fetched.length >= BATCH_SIZE)
    } catch (err) {
      console.error('Akış yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeedData(0, false)
  }, [loadFeedData])

  const loadMoreDreams = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadFeedData(page + 1, true)
    setLoadingMore(false)
  }, [page, hasMore, loadingMore, loadFeedData])

  const lastElementRef = useCallback(
    (node) => {
      if (loading || loadingMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreDreams()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [loading, loadingMore, hasMore, loadMoreDreams]
  )

  const translateArchetype = useCallback((arch) => {
    const clean = String(arch).trim()
    return ARCHETYPE_LOCALIZATIONS[lang]?.[clean] || clean
  }, [lang])

  // Feed'de o an var olan rüyalardan gerçek arketip listesini (ve sayılarını) çıkarıyoruz.
  // Böylece "Arketipler" sekmesi statik bir "var mı yok mu" kontrolü değil,
  // kullanıcının seçip filtreleyebileceği canlı bir liste haline geliyor.
  const availableArchetypes = useMemo(() => {
    const counts = new Map()
    for (const d of dreams) {
      if (Array.isArray(d?.ai_archetypes)) {
        for (const raw of d.ai_archetypes) {
          const clean = String(raw).trim()
          if (!clean) continue
          counts.set(clean, (counts.get(clean) || 0) + 1)
        }
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))
  }, [dreams])

  const handleFilterClick = (filter) => {
    setActiveFilter(filter)
    if (filter !== 'archetypes') setSelectedArchetype(null)
  }

  const filteredDreams = useMemo(() => {
    const baseDreams = Array.isArray(dreams) ? dreams : []
    const validDreams = baseDreams.filter(d => d && d.id)

    if (activeFilter === 'all') return validDreams

    if (activeFilter === 'archetypes') {
      const withArchetype = validDreams.filter(d => Array.isArray(d.ai_archetypes) && d.ai_archetypes.length > 0)
      if (!selectedArchetype) return withArchetype
      return withArchetype.filter(d => d.ai_archetypes.some(a => String(a).trim() === selectedArchetype))
    }

    if (activeFilter === 'intense') {
      return validDreams.filter(d => {
        if (!d.user_selected_sentiment) return false
        // Alan artık virgülle ayrılmış çoklu duygu tutabiliyor; herhangi biri eşleşirse say
        const sentiments = String(d.user_selected_sentiment).split(',').map(s => s.trim()).filter(Boolean)
        return sentiments.some(s => INTENSE_EMOTIONS.includes(s))
      })
    }

    return validDreams
  }, [dreams, activeFilter, selectedArchetype])

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white pb-20 md:pb-0">
      <div className="starry-bg" />
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />
      <div className="noise-overlay" />

      <main className="mx-auto w-full max-w-2xl px-0 sm:px-4 py-4 sm:py-8">
        
        {/* SADECE GİRİŞ YAPMAYANLARA HERO (KARŞILAMA) GÖSTER */}
        {!user && (
          <div className="px-4 sm:px-0 mb-8">
            <Hero />
          </div>
        )}

        {/* GÜNLÜK PUSULA (Sadece Giriş Yapanlara Göster) */}
        {user && (
          <div className="px-4 sm:px-0 mb-6">
            <DailyCompass lang={lang} />
          </div>
        )}

        {/* ANA SEKME (profile.js'deki ile aynı format) */}
        <div className="flex items-center justify-center gap-8 border-b border-white/10 mb-6">
          <button
            onClick={() => setHomeTab('vision')}
            className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              homeTab === 'vision' ? 'border-fuchsia-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            ✦ {mounted ? (lang === 'tr' ? 'Vizyon Panosu' : 'Vision Board') : <TextSkeleton width="w-20" />}
          </button>
          <button
            onClick={() => setHomeTab('dreams')}
            className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              homeTab === 'dreams' ? 'border-fuchsia-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            🌙 {mounted ? (lang === 'tr' ? 'Rüyalar' : 'Dreams') : <TextSkeleton width="w-14" />}
          </button>
        </div>

        {homeTab === 'vision' ? (
          <div className={`px-4 sm:px-0 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => (user ? setShowCreateGoal(true) : (window.location.href = '/auth'))}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90"
              >
                + {tVision.createGoalBtn}
              </button>
            </div>

            {goalsLoading && !goalsLoaded ? (
              <div className="py-20 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center mt-10">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl mb-4">✦</div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {lang === 'tr' ? 'Henüz bir vizyon yok' : 'No visions yet'}
                </h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
                  {lang === 'tr'
                    ? 'Siz veya arkadaşlarınız henüz bir hedef eklemedi.'
                    : 'Neither you nor your friends have planted a vision yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {goals.map((goal) => (
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
          </div>
        ) : (
        <>
        {/* MİNİMALİST YATAY FİLTRE ÇUBUĞU (INSTAGRAM / TIKTOK STYLE) */}
        <div className={`sticky top-[60px] md:top-[76px] z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 mb-6 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleFilterClick('all')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'all' ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {lang === 'tr' ? 'Ana Akış' : 'Feed'}
            </button>
            <button
              onClick={() => handleFilterClick('archetypes')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'archetypes' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {lang === 'tr' ? 'Arketipler' : 'Archetypes'}
            </button>
            <button
              onClick={() => handleFilterClick('intense')}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                activeFilter === 'intense' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {lang === 'tr' ? 'Derin Duygular' : 'Intense'}
            </button>
          </div>

          {/* ARKETİP ALT-FİLTRESİ: gerçek arketip isimleriyle seçim yapılabiliyor */}
          {activeFilter === 'archetypes' && availableArchetypes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setSelectedArchetype(null)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  !selectedArchetype ? 'bg-cyan-400/90 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                {lang === 'tr' ? 'Tümü' : 'All'}
              </button>
              {availableArchetypes.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => setSelectedArchetype(name)}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                    selectedArchetype === name ? 'bg-cyan-400/90 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  {translateArchetype(name)}
                  <span className="opacity-60 text-[10px]">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RÜYA AKIŞI LİSTESİ */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
            <span className="text-xs uppercase tracking-widest text-slate-400">{lang === 'tr' ? 'Bilinçaltı Yükleniyor...' : 'Loading Subconscious...'}</span>
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="px-4 text-center mt-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-3xl mb-4">🌌</div>
            <h3 className="text-lg font-bold text-white mb-2">{lang === 'tr' ? 'Akışınız Çok Sessiz' : 'Your Feed is Quiet'}</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
              {lang === 'tr'
                ? 'Şu an sizin veya arkadaşlarınızın paylaştığı bir rüya bulunmuyor. Keşfet sekmesinden diğer insanlarla rezonans kurabilirsiniz.'
                : 'There are no dreams from you or your friends right now. Explore the global nexus to find resonance.'}
            </p>
            <Link href="/explore" className="inline-flex items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/30 px-6 py-2.5 text-xs font-bold text-cyan-300 uppercase tracking-widest hover:bg-cyan-500/30">
              {lang === 'tr' ? 'Keşfet\'e Git' : 'Explore Nexus'}
            </Link>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 px-0 sm:px-0">
            {filteredDreams.map((dream, index) => {
              const isLastElement = index === filteredDreams.length - 1
              return (
                <div key={dream.id} ref={isLastElement ? lastElementRef : null} className="relative min-w-0">
                  <DreamCard
                    dream={dream}
                    lang={lang}
                    currentUserId={user?.id}
                    onTranslate={() => {}}
                    translating={false}
                    translated={false}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* YÜKLENİYOR İNDİKATÖRÜ */}
        {loadingMore && (
          <div className="py-8 flex justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
          </div>
        )}
        </>
        )}
      </main>

      {activeGoal && (
        <GoalDetailModal
          goal={activeGoal}
          lang={lang}
          currentUserId={user?.id}
          onClose={() => setActiveGoal(null)}
          onChanged={(updated) => {
            setGoals((list) => list.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)))
          }}
          onDeleted={(goalId) => {
            setGoals((list) => list.filter((g) => g.id !== goalId))
          }}
        />
      )}

      {showCreateGoal && (
        <CreateGoalModal
          lang={lang}
          onClose={() => setShowCreateGoal(false)}
          onCreated={(goal) => setGoals((g) => [goal, ...g])}
        />
      )}
    </div>
  )
}