import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Hero from '@/components/Hero'
import DreamCard from '@/components/DreamCard'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'

const BATCH_SIZE = 10; // Her seferinde yüklenecek maksimum rüya sayısı

export default function HomePage() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  // Akış ve Sayfalama Durumları
  const [dreams, setDreams] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [dailyProphecy, setDailyProphecy] = useState(null)
  const [translatingId, setTranslatingId] = useState(null)
  const [translatedDreams, setTranslatedDreams] = useState({})
  const [activeFilter, setActiveFilter] = useState('all')
  const [onlineCount, setOnlineCount] = useState(12487)
  const [resonanceMatch, setResonanceMatch] = useState(78)

  // Sonsuz Kaydırma için Sensör Ref'i
  const observerRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'
  const lang = currentLang

  // Arkadaşların ve kendisinin rüyalarını getiren asenkron akış
  const loadFeedData = useCallback(async (pageNum = 0, append = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const from = pageNum * BATCH_SIZE
      const to = from + BATCH_SIZE - 1

      let query = supabase.from('dreams').select('*').eq('in_feed', true)

      if (user?.id) {
        // 1. Kabul edilmiş arkadaşlık ilişkilerini sorgula
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .eq('status', 'accepted')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

        const friendIds = friendships 
          ? friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id) 
          : []

        // Sadece kullanıcının kendisinin ve arkadaşlarının rüyalarını akışa dahil et (Instagram Feed)
        const allowedUserIds = [user.id, ...friendIds]
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
      if (fetched.length < BATCH_SIZE) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }
    } catch (err) {
      console.error('Akış yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      try {
        const prophecyQuery = supabase
          .from('daily_prophecy')
          .select('*')
          .eq('prophecy_date', today)
          .maybeSingle()

        // ÇÖKMEYEN DEfANSİF PROMISE BİRLEŞTİRİCİ (Güvenli Array Destructuring)
        const results = await Promise.all([
          loadFeedData(0, false),
          prophecyQuery
        ])

        const prophecyData = results[1]?.data || null
        setDailyProphecy(prophecyData)
      } catch (err) {
        console.error('Init hatası:', err)
      }
    }
    init()
  }, [loadFeedData])

  const loadMoreDreams = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadFeedData(page + 1, true)
    setLoadingMore(false)
  }, [page, hasMore, loadingMore, loadFeedData])

  // Görünmez Sensörü İzleyen Intersection Observer (Sonsuz Kaydırma Tetikleyicisi)
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

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => Math.max(1, prev + Math.floor(Math.random() * 11 - 5)))
      setResonanceMatch(Math.floor(Math.random() * 20) + 76)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  async function handleTranslate(dream) {
    if (translatedDreams[dream.id]?.translated) {
      setTranslatedDreams((prev) => ({
        ...prev,
        [dream.id]: { ...prev[dream.id], translated: false },
      }))
      return
    }

    try {
      setTranslatingId(dream.id)

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamText: dream.content,
          analysisText: dream[`ai_summary_${lang}`] || dream.ai_summary || '',
          targetLang: lang,
          dreamId: dream.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Çeviri başarısız.')

      setTranslatedDreams((prev) => ({
        ...prev,
        [dream.id]: {
          translated: true,
          translatedContent: data.translated,
          translatedAnalysis: data.analysisTranslated,
        },
      }))
    } catch (error) {
      alert(error.message)
    } finally {
      setTranslatingId(null)
    }
  }

  const filteredDreams = useMemo(() => {
    const baseDreams = Array.isArray(dreams) ? dreams : []
    // Bozuk veya ID'si olmayan rüya satırlarının sayfayı çökertmesini önleyen koruyucu filtre
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

  // ONARILAN KEHANET METİN TANIMLAMALARI (Hydration Safe & useMemo)
  const prophecyText = useMemo(() => {
    return (
      dailyProphecy?.[`content_${lang}`] ||
      dailyProphecy?.content_tr ||
      dailyProphecy?.content_en ||
      'The collective field is still gathering symbols for today.'
    )
  }, [dailyProphecy, lang])

  const prophecyAdvice = useMemo(() => {
    return (
      dailyProphecy?.[`advice_${lang}`] ||
      dailyProphecy?.advice_tr ||
      dailyProphecy?.advice_en ||
      ''
    )
  }, [dailyProphecy, lang])

  const sectionTitle =
    lang === 'tr'
      ? 'Canlı Rüya Akışı'
      : lang === 'es'
      ? 'Feed de Sueños en Vivo'
      : lang === 'fr'
      ? 'Flux de Rêves en Direct'
      : lang === 'de'
      ? 'Live-Traumfeed'
      : lang === 'pt'
      ? 'Feed de Sonhos ao Vivo'
      : lang === 'ru'
      ? 'Лента Снов в Реальном Времени'
      : lang === 'ja'
      ? 'ライブ夢フィード'
      : 'Live Dream Feed'

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <div className="starry-bg" />
      <div className="floating-orb orb-1" />
      <div className="floating-orb orb-2" />
      <div className="floating-orb orb-3" />
      <div className="cosmic-grid" />
      <div className="noise-overlay" />

      <main className="feed-shell mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-4 sm:py-5 md:px-5 lg:px-6 lg:py-6">
        <Hero />

        {/* SOSYAL SOHBET DAVET BANNERI */}
        <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-violet-950/20 p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">🔮 {lang === 'tr' ? 'Keşfet Adımına Göz Atın' : 'Explore Global Dreams'}</h4>
            <p className="text-xs text-slate-400 mt-1">{lang === 'tr' ? 'Tüm dünyadan kozmik rüya illüstrasyonlarını ve mistik analizleri görmek için Keşfet sekmesine geçin!' : 'Browse the global stream of beautiful dream illustrations and mystical readings!'}</p>
          </div>
          <Link href="/explore" className="shrink-0 rounded-xl bg-cyan-500/15 border border-cyan-400/30 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-all">
            ✨ {lang === 'tr' ? 'Keşfet\'e Git' : 'Explore'}
          </Link>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:mb-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-5">
          <div id="prophecy" className="glass-card relative overflow-hidden rounded-[24px] p-4 sm:rounded-[26px] sm:p-5 lg:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_28%)]" />
            <div className="relative min-w-0">
              <div className="purple-badge mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-fuchsia-300/16 bg-fuchsia-500/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/85">
                <span className="signal-dot purple" />
                {getTranslation('hero.ctaProphecy', lang)}
              </div>
              <h2 className="text-xl font-semibold leading-tight text-white sm:text-2xl lg:text-3xl">
                {lang === 'tr' ? 'Bugünün Kolektif Kehaneti' : 'Today’s Collective Prophecy'}
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-200 sm:text-base sm:leading-8 lg:max-w-2xl lg:text-lg">{prophecyText}</p>
              {prophecyAdvice && (
                <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-fuchsia-200/80">{lang === 'tr' ? 'Pratik Yorum' : 'Practical Reading'}</p>
                  <p className="text-sm leading-7 text-slate-300 sm:text-base">{prophecyAdvice}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="glass-card rounded-[24px] p-4 sm:rounded-[26px] sm:p-5 lg:p-6">
              <div className="cyber-badge mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-400/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100/85">
                <span className="signal-dot cyan" />
                Live Resonance
              </div>
              <h3 className="text-lg font-semibold leading-tight text-white sm:text-xl lg:text-2xl">
                {lang === 'tr' ? 'Çember Rezonansı Yakalandı' : 'Resonance Detected'}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                {lang === 'tr'
                  ? `Şu an arkadaş çemberinizdeki rüya senkronizasyonu: %${resonanceMatch}`
                  : `Your synchronization with people sharing your mental frequency: %${resonanceMatch}`}
              </p>
              <div className="mt-4 rounded-[20px] border border-emerald-400/12 bg-emerald-500/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">{lang === 'tr' ? 'Aktif Çember' : 'Live Circle'}</p>
                <p className="tabular-nums mt-2 break-words text-2xl font-semibold text-white sm:text-3xl">{Math.max(onlineCount, 1).toLocaleString()}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">{lang === 'tr' ? 'bağlantılı bilinç rüya görüyor' : 'connected minds dreaming'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* AKIŞ LİSTELEME */}
        <section className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dream Circle Feed</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl lg:text-3xl">
              {lang === 'tr' ? 'Arkadaş Çemberi Akışı' : 'Friend Circle Feed'}
            </h2>
          </div>
        </section>

        <div className="mystic-divider mb-5 sm:mb-6" />

        {loading ? (
          <div className="glass-card rounded-[24px] p-8 text-center text-slate-300 sm:p-10">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
            {lang === 'tr' ? 'Bilinçaltı dalgaları ayıklanıyor...' : 'Filtering subconscious waves...'}
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="glass-card rounded-[24px] p-8 text-center sm:p-10">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/16 bg-violet-500/10 text-2xl text-violet-100">✦</div>
            <h3 className="text-xl font-semibold text-white sm:text-2xl">{lang === 'tr' ? 'Arkadaş Akışınız Boş' : 'Your Circle Feed is Empty'}</h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {lang === 'tr'
                ? 'Çemberinizdeki rüya sayısı yetersiz. Arkadaşlarınızı ekleyebilir veya küresel rüyaları keşfetmek için Keşfet adımına göz atabilirsiniz!'
                : 'No dreams found in your network yet. Invite friends or explore the global feed!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {filteredDreams.map((dream, index) => {
              const translatedData = translatedDreams[dream.id]
              const isRareSlot = index > 0 && index % 5 === 0
              const isLastElement = index === filteredDreams.length - 1

              return (
                <div key={dream.id} ref={isLastElement ? lastElementRef : null} className="relative min-w-0">
                  {isRareSlot && (
                    <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-orange-100">
                      <span className="signal-dot heat" />
                      {lang === 'tr' ? 'Nadir Bilinçaltı Sinyali' : 'Rare Subconscious Signal'}
                    </div>
                  )}

                  <DreamCard
                    dream={dream}
                    lang={lang}
                    onTranslate={handleTranslate}
                    translating={translatingId === dream.id}
                    translated={!!translatedData?.translated}
                    translatedContent={translatedData?.translatedContent}
                    translatedAnalysis={translatedData?.translatedAnalysis}
                  />
                </div>
              )
            })}
          </div>
        )}

        {loadingMore && (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
            <span className="text-xs uppercase tracking-widest">{lang === 'tr' ? 'Daha Fazla Rüya Getiriliyor...' : 'Loading More...'}</span>
          </div>
        )}
      </main>
    </div>
  )
}