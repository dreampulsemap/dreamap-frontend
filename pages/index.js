import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
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

  const onlineCount = 12487
  const resonanceMatch = 78

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
          .single()

        const [{ data: dreamsData, error: dreamsError }, { data: prophecyData }] =
          await Promise.all([dreamsQuery, prophecyQuery])

        if (dreamsError) throw dreamsError

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

  async function handleTranslate(dream) {
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

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Hero />

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div
            id="prophecy"
            className="relative overflow-hidden rounded-[2rem] border border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-500/12 via-violet-500/10 to-cyan-500/10 p-6 shadow-[0_0_60px_rgba(168,85,247,0.12)] backdrop-blur-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_24%)]" />

            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-100">
                <span className="h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_16px_rgba(244,114,182,0.9)]" />
                {getTranslation('hero.ctaProphecy', lang) || 'Collective Prophecy'}
              </div>

              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
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

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                {prophecyText}
              </p>

              {prophecyAdvice ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-xs uppercase tracking-[0.18em] text-fuchsia-200/80">
                    {lang === 'tr'
                      ? 'Pratik Yorum'
                      : lang === 'es'
                      ? 'Lectura Práctica'
                      : lang === 'fr'
                      ? 'Lecture Pratique'
                      : lang === 'de'
                      ? 'Praktische Deutung'
                      : lang === 'pt'
                      ? 'Leitura Prática'
                      : lang === 'ru'
                      ? 'Практическое Толкование'
                      : lang === 'ja'
                      ? '実践的な解釈'
                      : 'Practical Reading'}
                  </p>
                  <p className="text-sm leading-7 text-slate-300 sm:text-base">
                    {prophecyAdvice}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] border border-cyan-400/15 bg-white/5 p-6 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
                Live Resonance
              </div>

              <h3 className="text-xl font-semibold text-white sm:text-2xl">
                {lang === 'tr'
                  ? 'Bilinçaltı Rezonansı Yakalandı'
                  : lang === 'es'
                  ? 'Resonancia Subconsciente Detectada'
                  : lang === 'fr'
                  ? 'Résonance de l’Inconscient Détectée'
                  : lang === 'de'
                  ? 'Unterbewusste Resonanz Erfasst'
                  : lang === 'pt'
                  ? 'Ressonância do Subconsciente Detectada'
                  : lang === 'ru'
                  ? 'Резонанс Подсознания Обнаружен'
                  : lang === 'ja'
                  ? '潜在意識の共鳴を検出'
                  : 'Subconscious Resonance Detected'}
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                {lang === 'tr'
                  ? `Şu an küresel rüya ağında senin zihinsel frekansına sahip insanlarla senkronizasyonun: %${resonanceMatch}`
                  : lang === 'es'
                  ? `Tu sincronización con personas de tu misma frecuencia mental en la red global de sueños es: %${resonanceMatch}`
                  : lang === 'fr'
                  ? `Ta synchronisation avec les personnes partageant ta fréquence mentale dans le réseau mondial des rêves est de : %${resonanceMatch}`
                  : lang === 'de'
                  ? `Deine Synchronisation mit Menschen derselben mentalen Frequenz im globalen Traumnetzwerk beträgt: %${resonanceMatch}`
                  : lang === 'pt'
                  ? `Sua sincronização com pessoas da mesma frequência mental na rede global de sonhos é: %${resonanceMatch}`
                  : lang === 'ru'
                  ? `Ваш уровень синхронизации с людьми той же ментальной частоты в глобальной сети снов: %${resonanceMatch}`
                  : lang === 'ja'
                  ? `グローバルな夢ネットワークで、あなたと同じ精神周波数を持つ人々との同期率は %${resonanceMatch} です`
                  : `Your synchronization with people sharing your mental frequency in the global dream network is: %${resonanceMatch}`}
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                  {lang === 'tr'
                    ? 'Canlı Ağ'
                    : lang === 'es'
                    ? 'Red en Vivo'
                    : lang === 'fr'
                    ? 'Réseau en Direct'
                    : lang === 'de'
                    ? 'Live-Netzwerk'
                    : lang === 'pt'
                    ? 'Rede ao Vivo'
                    : lang === 'ru'
                    ? 'Живая Сеть'
                    : lang === 'ja'
                    ? 'ライブネットワーク'
                    : 'Live Network'}
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {onlineCount.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {lang === 'tr'
                    ? 'kişi şu anda rüya görüyor'
                    : lang === 'es'
                    ? 'personas están soñando ahora mismo'
                    : lang === 'fr'
                    ? 'personnes rêvent en ce moment'
                    : lang === 'de'
                    ? 'Menschen träumen gerade'
                    : lang === 'pt'
                    ? 'pessoas estão sonhando agora'
                    : lang === 'ru'
                    ? 'человек сейчас видят сны'
                    : lang === 'ja'
                    ? '人が今この瞬間に夢を見ています'
                    : 'people are dreaming right now'}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`rounded-full px-4 py-2 text-sm transition-all ${
                    activeFilter === 'all'
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-300/30'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr'
                    ? 'Tüm Akış'
                    : lang === 'es'
                    ? 'Todo el Feed'
                    : lang === 'fr'
                    ? 'Tout le Flux'
                    : lang === 'de'
                    ? 'Gesamter Feed'
                    : lang === 'pt'
                    ? 'Feed Completo'
                    : lang === 'ru'
                    ? 'Вся Лента'
                    : lang === 'ja'
                    ? 'すべてのフィード'
                    : 'All Feed'}
                </button>

                <button
                  onClick={() => setActiveFilter('archetypes')}
                  className={`rounded-full px-4 py-2 text-sm transition-all ${
                    activeFilter === 'archetypes'
                      ? 'bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-300/30'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr'
                    ? 'Arketipler'
                    : lang === 'es'
                    ? 'Arquetipos'
                    : lang === 'fr'
                    ? 'Archétypes'
                    : lang === 'de'
                    ? 'Archetypen'
                    : lang === 'pt'
                    ? 'Arquétipos'
                    : lang === 'ru'
                    ? 'Архетипы'
                    : lang === 'ja'
                    ? 'アーキタイプ'
                    : 'Archetypes'}
                </button>

                <button
                  onClick={() => setActiveFilter('intense')}
                  className={`rounded-full px-4 py-2 text-sm transition-all ${
                    activeFilter === 'intense'
                      ? 'bg-amber-500/20 text-amber-100 border border-amber-300/30'
                      : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {lang === 'tr'
                    ? 'Yoğun Duygular'
                    : lang === 'es'
                    ? 'Emociones Intensas'
                    : lang === 'fr'
                    ? 'Émotions Intenses'
                    : lang === 'de'
                    ? 'Intensive Emotionen'
                    : lang === 'pt'
                    ? 'Emoções Intensas'
                    : lang === 'ru'
                    ? 'Сильные Эмоции'
                    : lang === 'ja'
                    ? '強い感情'
                    : 'Intense Emotions'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Dream Feed
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {lang === 'tr'
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
                : 'Live Dream Feed'}
            </h2>
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {filteredDreams.length}{' '}
            {lang === 'tr'
              ? 'kayıt'
              : lang === 'es'
              ? 'entradas'
              : lang === 'fr'
              ? 'entrées'
              : lang === 'de'
              ? 'Einträge'
              : lang === 'pt'
              ? 'registros'
              : lang === 'ru'
              ? 'записей'
              : lang === 'ja'
              ? '件'
              : 'entries'}
          </div>
        </section>

        {loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-slate-300 backdrop-blur-xl">
            {lang === 'tr'
              ? 'Bilinçaltı dalgaları ayıklanıyor...'
              : lang === 'es'
              ? 'Filtrando ondas subconscientes...'
              : lang === 'fr'
              ? 'Filtrage des ondes subconscientes...'
              : lang === 'de'
              ? 'Unterbewusste Wellen werden gefiltert...'
              : lang === 'pt'
              ? 'Filtrando ondas subconscientes...'
              : lang === 'ru'
              ? 'Фильтрация волн подсознания...'
              : lang === 'ja'
              ? '潜在意識の波を抽出中...'
              : 'Filtering subconscious waves...'}
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
            <h3 className="text-2xl font-semibold text-white">
              {lang === 'tr'
                ? 'Bu Frekansta Kimse Yok'
                : lang === 'es'
                ? 'Nadie en Esta Frecuencia'
                : lang === 'fr'
                ? 'Personne sur Cette Fréquence'
                : lang === 'de'
                ? 'Niemand auf Dieser Frequenz'
                : lang === 'pt'
                ? 'Ninguém Nesta Frequência'
                : lang === 'ru'
                ? 'На Этой Частоте Никого Нет'
                : lang === 'ja'
                ? 'この周波数には誰もいません'
                : 'Nobody on This Frequency'}
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              {lang === 'tr'
                ? 'Seçtiğin kriterlere uyan rüya bulunamadı. İlk dalgayı sen başlatmak ister misin?'
                : lang === 'es'
                ? 'No se encontraron sueños que coincidan con tus criterios. ¿Quieres iniciar la primera ola?'
                : lang === 'fr'
                ? 'Aucun rêve ne correspond à tes critères. Veux-tu lancer la première vague ?'
                : lang === 'de'
                ? 'Keine Träume entsprechen deinen Kriterien. Möchtest du die erste Welle starten?'
                : lang === 'pt'
                ? 'Nenhum sonho corresponde aos seus critérios. Quer iniciar a primeira onda?'
                : lang === 'ru'
                ? 'Не найдено снов по вашим критериям. Хотите запустить первую волну?'
                : lang === 'ja'
                ? '条件に合う夢が見つかりませんでした。最初の波をあなたが始めますか？'
                : 'No dreams matched your criteria. Would you like to start the first wave?'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredDreams.map((dream) => {
              const translatedData = translatedDreams[dream.id]

              return (
                <DreamCard
                  key={dream.id}
                  dream={dream}
                  lang={lang}
                  onTranslate={handleTranslate}
                  translating={translatingId === dream.id}
                  translated={!!translatedData?.translated}
                  translatedContent={translatedData?.translatedContent}
                  translatedAnalysis={translatedData?.translatedAnalysis}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}