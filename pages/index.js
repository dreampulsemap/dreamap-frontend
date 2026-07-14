import { useEffect, useMemo, useState } from 'react'
import Hero from '../components/Hero'
import DreamCard from '../components/DreamCard'
import { supabase } from '../lib/supabase'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '../lib/translations'

export default function HomePage() {
  const { i18n } = useTranslation()
  const lang = i18n.language || 'en'

  const [dreams, setDreams] = useState([])
  const [dailyProphecy, setDailyProphecy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [translatingId, setTranslatingId] = useState(null)
  const [translatedDreams, setTranslatedDreams] = useState({})
  const [activeFilter, setActiveFilter] = useState('all')
  const [onlineCount, setOnlineCount] = useState(12487)
  const [resonanceMatch, setResonanceMatch] = useState(78)

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true)

      try {
        const today = new Date().toISOString().split('T')[0]

        const dreamsQuery = supabase
          .from('dreams')
          .select('*')
          .eq('in_feed', true)
          .order('created_at', { ascending: false })

        const prophecyQuery = supabase
          .from('daily_prophecy')
          .select('*')
          .eq('prophecy_date', today)
          .maybeSingle()

        const [
          { data: dreamsData, error: dreamsError },
          { data: prophecyData, error: prophecyError },
        ] = await Promise.all([dreamsQuery, prophecyQuery])

        if (dreamsError) throw dreamsError
        if (prophecyError) console.error('Prophecy yüklenemedi:', prophecyError)

        setDreams(dreamsData || [])
        setDailyProphecy(prophecyData || null)
      } catch (error) {
        console.error('Ana sayfa yüklenemedi:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHomeData()
  }, [])

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
        [dream.id]: {
          ...prev[dream.id],
          translated: false,
        },
      }))
      return
    }

    try {
      setTranslatingId(dream.id)

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dreamText: dream.content,
          analysisText:
            dream[`ai_summary_${lang}`] ||
            dream.ai_summary ||
            dream.ai_summary_en ||
            '',
          targetLang: lang,
          dreamId: dream.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Çeviri başarısız oldu.')
      }

      setTranslatedDreams((prev) => ({
        ...prev,
        [dream.id]: {
          translated: true,
          translatedContent: data.translated,
          translatedAnalysis: data.analysisTranslated,
        },
      }))
    } catch (error) {
      console.error('Çeviri hatası:', error)
      alert(error.message)
    } finally {
      setTranslatingId(null)
    }
  }

  const filteredDreams = useMemo(() => {
    if (activeFilter === 'all') return dreams

    if (activeFilter === 'friends') {
      return dreams.filter((dream) => dream.visibility === 'friends')
    }

    if (activeFilter === 'archetypes') {
      return dreams.filter(
        (dream) => Array.isArray(dream.ai_archetypes) && dream.ai_archetypes.length > 0
      )
    }

    if (activeFilter === 'intense') {
      return dreams.filter(
        (dream) =>
          dream.user_selected_sentiment &&
          ['Fear', 'Anxiety', 'Awe', 'Surprise'].includes(dream.user_selected_sentiment)
      )
    }

    return dreams
  }, [dreams, activeFilter])

  const prophecyText =
    dailyProphecy?.[`content_${lang}`] ||
    dailyProphecy?.content_tr ||
    dailyProphecy?.content_en ||
    'The collective field is still gathering symbols for today.'

  const prophecyAdvice =
    dailyProphecy?.[`advice_${lang}`] ||
    dailyProphecy?.advice_tr ||
    dailyProphecy?.advice_en ||
    ''

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

        <section className="mb-6 grid grid-cols-1 gap-4 lg:mb-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:gap-5">
          <div
            id="prophecy"
            className="glass-card relative overflow-hidden rounded-[24px] p-4 sm:rounded-[26px] sm:p-5 lg:p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.1),transparent_24%)]" />

            <div className="relative min-w-0">
              <div className="purple-badge mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-fuchsia-300/16 bg-fuchsia-500/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100/85">
                <span className="signal-dot purple" />
                {getTranslation('hero.ctaProphecy', lang) || 'Collective Prophecy'}
              </div>

              <h2 className="text-xl font-semibold leading-tight text-white sm:text-2xl lg:text-3xl">
                {lang === 'tr'
                  ? 'Bugünün Kolektif Kehaneti'
                  : lang === 'es'
                  ? 'Profecía Colectiva de Hoy'
                  : lang === 'fr'
                  ? 'Prophétie Collective du Jour'
                  : lang === 'de'
                  ? 'Die Kollektive Prophezeiung von Heute'
                  : lang === 'pt'
                  ? 'Profecia Coletiva de Hoje'
                  : lang === 'ru'
                  ? 'Коллективное Пророчество Сегодня'
                  : lang === 'ja'
                  ? '今日の集合的予言'
                  : 'Today’s Collective Prophecy'}
              </h2>

              <p className="mt-3 text-[15px] leading-7 text-slate-200 sm:text-base sm:leading-8 lg:max-w-2xl lg:text-lg">
                {prophecyText}
              </p>

              {prophecyAdvice ? (
                <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-fuchsia-200/80">
                    {lang === 'tr'
                      ? 'Pratik Yorum'
                      : 'Practical Reading'}
                  </p>
                  <p className="text-sm leading-7 text-slate-300 sm:text-base">
                    {prophecyAdvice}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="glass-card rounded-[24px] p-4 sm:rounded-[26px] sm:p-5 lg:p-6">
              <div className="cyber-badge mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-400/8 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-100/85">
                <span className="signal-dot cyan" />
                Live Resonance
              </div>

              <h3 className="text-lg font-semibold leading-tight text-white sm:text-xl lg:text-2xl">
                {lang === 'tr'
                  ? 'Bilinçaltı Rezonansı Yakalandı'
                  : 'Subconscious Resonance Detected'}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                {lang === 'tr'
                  ? `Şu an küresel rüya ağında senin zihinsel frekansına sahip insanlarla senkronizasyonun: %${resonanceMatch}`
                  : `Your synchronization with people sharing your mental frequency in the global dream network is: %${resonanceMatch}`}
              </p>

              <div className="mt-4 rounded-[20px] border border-emerald-400/12 bg-emerald-500/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
                  {lang === 'tr'
                    ? 'Canlı Ağ'
                    : 'Live Network'}
                </p>

                <p className="tabular-nums mt-2 break-words text-2xl font-semibold text-white sm:text-3xl">
                  {Math.max(onlineCount, 1).toLocaleString()}
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {lang === 'tr'
                    ? 'kişi şu anda rüya görüyor'
                    : 'people are dreaming right now'}
                </p>
              </div>
            </div>

            <div className="glass-card rounded-[24px] p-4 sm:rounded-[26px] sm:p-5">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Discovery Filters
                </p>
                <span className="text-xs text-slate-500">
                  {lang === 'tr' ? 'Akışı ayarla' : 'Tune the feed'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`energy-button min-h-[44px] rounded-full border px-4 py-2 text-sm transition-all ${
                    activeFilter === 'all'
                      ? 'border-cyan-300/30 bg-cyan-500/16 text-cyan-100 shadow-[0_0_22px_rgba(6,182,212,0.12)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr' ? 'Tüm Akış' : 'All Feed'}
                </button>

                <button
                  onClick={() => setActiveFilter('archetypes')}
                  className={`energy-button min-h-[44px] rounded-full border px-4 py-2 text-sm transition-all ${
                    activeFilter === 'archetypes'
                      ? 'border-fuchsia-300/30 bg-fuchsia-500/16 text-fuchsia-100 shadow-[0_0_22px_rgba(139,92,246,0.12)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr' ? 'Arketipler' : 'Archetypes'}
                </button>

                <button
                  onClick={() => setActiveFilter('intense')}
                  className={`energy-button min-h-[44px] rounded-full border px-4 py-2 text-sm transition-all ${
                    activeFilter === 'intense'
                      ? 'border-orange-300/30 bg-orange-500/16 text-orange-100 shadow-[0_0_22px_rgba(249,115,22,0.14)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr' ? 'Yoğun Duygular' : 'Intense Emotions'}
                </button>

                <button
                  onClick={() => setActiveFilter('friends')}
                  className={`energy-button min-h-[44px] rounded-full border px-4 py-2 text-sm transition-all ${
                    activeFilter === 'friends'
                      ? 'border-emerald-300/30 bg-emerald-500/16 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.14)]'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr' ? 'Arkadaş Çemberi' : 'Friends Circle'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Dream Feed
            </p>

            <h2 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl lg:text-3xl">
              {sectionTitle}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              {lang === 'tr'
                ? 'Nadir sinyaller, yoğun duygular ve kolektif arketipler arasında akışta kal.'
                : 'Move through rare signals, intense emotions and collective archetypes.'}
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 sm:self-auto">
            <span className="signal-dot cyan" />
            <span className="tabular-nums">{filteredDreams.length}</span>
            <span>
              {lang === 'tr' ? 'kayıt' : 'entries'}
            </span>
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
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/16 bg-violet-500/10 text-2xl text-violet-100">
              ✦
            </div>

            <h3 className="text-xl font-semibold text-white sm:text-2xl">
              {lang === 'tr' ? 'Bu Frekansta Kimse Yok' : 'Nobody on This Frequency'}
            </h3>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {lang === 'tr'
                ? 'Seçtiğin kriterlere uyan rüya bulunamadı. İlk dalgayı sen başlatmak ister misin?'
                : 'No dreams matched your criteria. Would you like to start the first wave?'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {filteredDreams.map((dream, index) => {
              const translatedData = translatedDreams[dream.id]
              const isRareSlot = index > 0 && index % 5 === 0

              return (
                <div key={dream.id} className="relative min-w-0">
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
      </main>
    </div>
  )
}