import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Hero from '@/components/Hero'
import DreamCard from '@/components/DreamCard'
import DailyCompass from '@/components/DailyCompass'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'

const BATCH_SIZE = 10;

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

  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n.language || 'en').split('-')[0] : 'en'
  const lang = currentLang

  // Kullanıcı Durumunu Kontrol Et (Hero görünürlüğü için)
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkUser()
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

  const filteredDreams = useMemo(() => {
    const baseDreams = Array.isArray(dreams) ? dreams : []
    const validDreams = baseDreams.filter(d => d && d.id)

    if (activeFilter === 'all') return validDreams
    if (activeFilter === 'archetypes') {
      return validDreams.filter(d => Array.isArray(d.ai_archetypes) && d.ai_archetypes.length > 0)
    }
    if (activeFilter === 'intense') {
      return validDreams.filter(d => d.user_selected_sentiment && ['Fear', 'Anxiety', 'Awe'].includes(d.user_selected_sentiment))
    }
    return validDreams
  }, [dreams, activeFilter])

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

        {/* MİNİMALİST YATAY FİLTRE ÇUBUĞU (INSTAGRAM / TIKTOK STYLE) */}
        <div className="sticky top-[60px] md:top-[76px] z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 mb-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === 'all' ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {lang === 'tr' ? 'Ana Akış' : 'Feed'}
          </button>
          <button
            onClick={() => setActiveFilter('archetypes')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === 'archetypes' ? 'bg-cyan-500 text-black' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {lang === 'tr' ? 'Arketipler' : 'Archetypes'}
          </button>
          <button
            onClick={() => setActiveFilter('intense')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              activeFilter === 'intense' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {lang === 'tr' ? 'Derin Duygular' : 'Intense'}
          </button>
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
      </main>
    </div>
  )
}