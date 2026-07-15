import Link from 'next/link'
import MiniGlobe from '@/components/MiniGlobe'
import { useTranslation } from 'react-i18next'
import { getTranslation } from '@/lib/translations'
import { useState, useEffect } from 'react'

const HERO_UI = {
  tr: {
    badge: 'Rüya Nabız Ağı',
    titleFallback: 'Dünyanın bilinçaltına hoş geldin.',
    subtitleFallback: 'Kolektif rüya zekâsı',
    descriptionFallback:
      'Lunosfer; rüya sinyallerini, arketipleri ve duygusal örüntüleri gerçek zamanlı keşfedebileceğin canlı bir bilinçaltı ağına dönüştürür.',
    microLine: 'Arketiplerini keşfet, kolektif öngörülere katıl.',
    ctaMap: 'Dünyanın Bilinçaltına Bağlan',
    ctaAddDream: 'Rüyamı Haritaya İşle',
    ctaProphecy: 'Kolektif Kehanet',
    metric1Label: 'Canlı Alan',
    metric1Value: '24/7',
    metric1Sub: 'her zaman uyanık',
    metric2Label: 'Arketipler',
    metric2Value: '∞',
    metric2Sub: 'evrilen kimlikler',
    metric3Label: 'Rezonans',
    metric3Value: 'Canlı',
    metric3Sub: 'kolektif nabız',
    signalLabel: 'Lunosfer Sinyali',
    signalSub: 'Bilinçaltı alanın gerçek zamanlı önizlemesi',
    online: 'Çevrimiçi',
    glowLabel: 'Parlamalar',
    glowValue: 'Nadir',
    nodesLabel: 'Düğümler',
    nodesValue: 'Canlı',
    heatLabel: 'Isı',
    heatValue: 'Yükseliyor',
  },
  en: {
    badge: 'Dream Pulse Network',
    titleFallback: 'Welcome to the world’s subconscious.',
    subtitleFallback: 'Collective dream intelligence',
    descriptionFallback:
      'Lunosfer turns dream signals, archetypes and emotional patterns into a living subconscious network you can explore in real time.',
    microLine: 'Explore archetypes and join collective insight.',
    ctaMap: 'Connect to the World’s Subconscious',
    ctaAddDream: 'Add My Dream to the Map',
    ctaProphecy: 'Collective Prophecy',
    metric1Label: 'Live Field',
    metric1Value: '24/7',
    metric1Sub: 'always awake',
    metric2Label: 'Archetypes',
    metric2Value: '∞',
    metric2Sub: 'evolving identities',
    metric3Label: 'Resonance',
    metric3Value: 'Live',
    metric3Sub: 'collective pulse',
    signalLabel: 'Lunosfer Signal',
    signalSub: 'Real-time subconscious field preview',
    online: 'Online',
    glowLabel: 'Glows',
    glowValue: 'Rare',
    nodesLabel: 'Nodes',
    nodesValue: 'Live',
    heatLabel: 'Heat',
    heatValue: 'Rising',
  },
  es: {
    badge: 'Red del Pulso Onírico',
    titleFallback: 'Bienvenido al subconsciente del mundo.',
    subtitleFallback: 'Inteligencia onírica colectiva',
    descriptionFallback:
      'Lunosfer convierte señales oníricas, arquetipos y patrones emocionales en una red viva del subconsciente que puedes explorar en tiempo real.',
    microLine: 'Explora arquetipos y únete a la intuición colectiva.',
    ctaMap: 'Conéctate al Subconsciente del Mundo',
    ctaAddDream: 'Añadir mi Sueño al Mapa',
    ctaProphecy: 'Profecía Colectiva',
    metric1Label: 'Campo Vivo',
    metric1Value: '24/7',
    metric1Sub: 'siempre despierto',
    metric2Label: 'Arquetipos',
    metric2Value: '∞',
    metric2Sub: 'identidades en evolução',
    metric3Label: 'Resonancia',
    metric3Value: 'En vivo',
    metric3Sub: 'pulso colectivo',
    signalLabel: 'Señal de Lunosfer',
    signalSub: 'Vista previa en tiempo real del campo subconsciente',
    online: 'En línea',
    glowLabel: 'Destellos',
    glowValue: 'Raro',
    nodesLabel: 'Nodos',
    nodesValue: 'Activos',
    heatLabel: 'Calor',
    heatValue: 'En aumento',
  },
  fr: {
    badge: 'Réseau du Pouls Onirique',
    titleFallback: 'Bienvenue dans le subconscient du monde.',
    subtitleFallback: 'Intelligence onirique collective',
    descriptionFallback:
      'Lunosfer transforme les signaux de rêve, les archétypes et les motifs émotionnels en un réseau vivant du subconscient à explorer en temps réel.',
    microLine: 'Explore les archétypes et rejoins l’intuition collective.',
    ctaMap: 'Se Connecter au Subconscient du Monde',
    ctaAddDream: 'Ajouter Mon Rêve à la Carte',
    ctaProphecy: 'Prophétie Collective',
    metric1Label: 'Champ Vivant',
    metric1Value: '24/7',
    metric1Sub: 'toujours éveillé',
    metric2Label: 'Archétypes',
    metric2Value: '∞',
    metric2Sub: 'identités en évolution',
    metric3Label: 'Résonance',
    metric3Value: 'Active',
    metric3Sub: 'pulsation collective',
    signalLabel: 'Signal Lunosfer',
    signalSub: 'Aperçu en temps réel du champ subconscient',
    online: 'En ligne',
    glowLabel: 'Lueurs',
    glowValue: 'Rare',
    nodesLabel: 'Nœuds',
    nodesValue: 'Actifs',
    heatLabel: 'Chaleur',
    heatValue: 'Montante',
  },
  de: {
    badge: 'Traumpuls-Netzwerk',
    titleFallback: 'Willkommen im Unterbewusstsein der Welt.',
    subtitleFallback: 'Kollektive Traumintelligenz',
    descriptionFallback:
      'Lunosfer verwandelt Traumsignale, Archetypen und emotionale Muster in ein lebendiges Unterbewusstseins-Netzwerk, das du in Echtzeit erkunden kannst.',
    microLine: 'Entdecke Archetypen und verbinde dich mit kollektiver Einsicht.',
    ctaMap: 'Mit dem Unterbewusstsein der Welt Verbinden',
    ctaAddDream: 'Meinen Traum zur Karte Hinzufügen',
    ctaProphecy: 'Kollektive Prophezeiung',
    metric1Label: 'Live-Feld',
    metric1Value: '24/7',
    metric1Sub: 'immer wach',
    metric2Label: 'Archetypen',
    metric2Value: '∞',
    metric2Sub: 'sich entwickelnde Identitäten',
    metric3Label: 'Resonanz',
    metric3Value: 'Aktiv',
    metric3Sub: 'kollektiver Puls',
    signalLabel: 'Lunosfer-Signal',
    signalSub: 'Echtzeit-Vorschau des Unterbewusstseinsfeldes',
    online: 'Online',
    glowLabel: 'Leuchten',
    glowValue: 'Selten',
    nodesLabel: 'Knoten',
    nodesValue: 'Aktiv',
    heatLabel: 'Hitze',
    heatValue: 'Steigend',
  },
  pt: {
    badge: 'Rede do Pulso dos Sonhos',
    titleFallback: 'Bem-vindo ao subconsciente do mundo.',
    subtitleFallback: 'Inteligência onírica coletiva',
    descriptionFallback:
      'Lunosfer transforma sinais de sonhos, arquétipos e padrões emocionais em uma rede viva do subconsciente que você pode explorar em tempo real.',
    microLine: 'Explore arquétipos e participe da percepção coletiva.',
    ctaMap: 'Conectar ao Subconsciente do Mundo',
    ctaAddDream: 'Adicionar Meu Sonho ao Mapa',
    ctaProphecy: 'Profecia Coletiva',
    metric1Label: 'Campo Vivo',
    metric1Value: '24/7',
    metric1Sub: 'sempre desperto',
    metric2Label: 'Arquétipos',
    metric2Value: '∞',
    metric2Sub: 'identidades em evolução',
    metric3Label: 'Ressonância',
    metric3Value: 'Ao vivo',
    metric3Sub: 'pulso coletivo',
    signalLabel: 'Sinal Lunosfer',
    signalSub: 'Prévia em tempo real do campo subconsciente',
    online: 'Online',
    glowLabel: 'Brilhos',
    glowValue: 'Raro',
    nodesLabel: 'Nós',
    nodesValue: 'Ativos',
    heatLabel: 'Calor',
    heatValue: 'Em ascensão',
  },
  ru: {
    badge: 'Сеть Пульса Сновидений',
    titleFallback: 'Добро пожаловать в подсознание мира.',
    subtitleFallback: 'Коллективный интеллект сновидений',
    descriptionFallback:
      'Lunosfer превращает сигналы снов, архетипы и эмоциональные паттерны в живую сеть подсознания, которую можно исследовать в реальном времени.',
    microLine: 'Исследуйте архетипы и подключайтесь к коллективному прозрению.',
    ctaMap: 'Подключиться к Подсознанию Мира',
    ctaAddDream: 'Добавить Мой Сон на Карту',
    ctaProphecy: 'Коллективное Пророчество',
    metric1Label: 'Живое Поле',
    metric1Value: '24/7',
    metric1Sub: 'всегда на страже',
    metric2Label: 'Архетипы',
    metric2Value: '∞',
    metric2Sub: 'меняющиеся идентичности',
    metric3Label: 'Резонанс',
    metric3Value: 'Активен',
    metric3Sub: 'коллективный пульс',
    signalLabel: 'Сигнал Lunosfer',
    signalSub: 'Предпросмотр поля подсознания в реальном времени',
    online: 'Онлайн',
    glowLabel: 'Сияния',
    glowValue: 'Редкие',
    nodesLabel: 'Узлы',
    nodesValue: 'Активны',
    heatLabel: 'Жар',
    heatValue: 'Растёт',
  },
  ja: {
    badge: '夢のパルスネットワーク',
    titleFallback: '世界の潜在意識へようこそ。',
    subtitleFallback: '集合的な夢 of 知性',
    descriptionFallback:
      'Lunosfer は夢 of シグナル、アーキタイプ、感情パターンを、リアルタイムで探索できる生きた潜在意識ネットワークへ変換します。',
    microLine: 'アーキタイプを探索し、集合的な洞察につながろう。',
    ctaMap: '世界の潜在意識に接続する',
    ctaAddDream: '自分の夢をマップに追加する',
    ctaProphecy: '集合的予言',
    metric1Label: 'ライブフィールド',
    metric1Value: '24/7',
    metric1Sub: '常に覚醒している',
    metric2Label: 'アーキタイプ',
    metric2Value: '∞',
    metric2Sub: '進化し続けるアイデンティティ',
    metric3Label: 'レゾナンス',
    metric3Value: 'ライブ',
    metric3Sub: '集合的な鼓動',
    signalLabel: 'Lunosfer シグナル',
    signalSub: '潜在意識フィールドのリアルタイムプレビュー',
    online: 'オンライン',
    glowLabel: 'グロウ',
    glowValue: 'レア',
    nodesLabel: 'ノード',
    nodesValue: 'ライブ',
    heatLabel: 'ヒート',
    heatValue: '上昇中',
  },
}

export default function Hero() {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // i18n?. optional chaining ile çökme tamamen engellenmiştir
  const currentLang = mounted ? (i18n?.language || 'en').split('-')[0] : 'en'
  const lang = HERO_UI[currentLang] ? currentLang : 'en'
  const ui = HERO_UI[lang]

  const rawTitle = getTranslation('hero.title', lang)
  const rawSubtitle = getTranslation('hero.subtitle', lang)
  const rawDescription = getTranslation('hero.description', lang)
  const rawCtaMap = getTranslation('hero.ctaMap', lang)
  const rawCtaAddDream = getTranslation('hero.ctaAddDream', lang)
  const rawCtaProphecy = getTranslation('hero.ctaProphecy', lang)

  const title = rawTitle && rawTitle !== 'hero.title' ? rawTitle : ui.titleFallback
  const subtitle = rawSubtitle && rawSubtitle !== 'hero.subtitle' ? rawSubtitle : ui.subtitleFallback
  const description = rawDescription && rawDescription !== 'hero.description' ? rawDescription : ui.descriptionFallback
  const ctaMap = rawCtaMap && rawCtaMap !== 'hero.ctaMap' ? rawCtaMap : ui.ctaMap
  const ctaAddDream = rawCtaAddDream && rawCtaAddDream !== 'hero.ctaAddDream' ? rawCtaAddDream : ui.ctaAddDream
  const ctaProphecy = rawCtaProphecy && rawCtaProphecy !== 'hero.ctaProphecy' ? rawCtaProphecy : ui.ctaProphecy

  return (
    <section className="relative mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(3,7,18,0.96))] px-4 py-5 shadow-[0_0_100px_rgba(15,23,42,0.52)] backdrop-blur-2xl sm:mb-8 sm:rounded-[32px] sm:px-5 sm:py-6 lg:mb-10 lg:px-8 lg:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_30%),radial-gradient(circle_at_bottom_center,rgba(249,115,22,0.08),transparent_22%)]" />
      <div className="absolute -left-10 top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl sm:h-36 sm:w-36" />
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl sm:h-48 sm:w-48" />

      <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-400/8 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-100/85 sm:mb-5 sm:px-4">
            <span className="signal-dot cyan" />
            {ui.badge}
          </div>

          <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
            LUNOSFER
          </div>

          <h1 className="max-w-3xl text-[2rem] font-semibold leading-[0.96] text-white sm:text-[2.6rem] lg:text-6xl">
            <span className="bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100/75 sm:mt-4 sm:text-xs">
            {subtitle}
          </p>

          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-300 sm:mt-5 sm:text-base sm:leading-8 lg:max-w-xl lg:text-lg">
            {description}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
            {ui.microLine}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 xl:flex xl:flex-wrap">
            <Link
              href="/globe"
              className="energy-button inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-cyan-300/25 bg-gradient-to-r from-cyan-500/20 to-violet-500/16 px-5 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_34px_rgba(34,211,238,0.12)] transition hover:scale-[1.01] hover:border-cyan-200/45 hover:from-cyan-500/28 hover:to-violet-500/22 sm:px-6"
            >
              🌐 {ctaMap}
            </Link>

            <Link
              href="/add-dream"
              className="energy-button inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-violet-300/20 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] hover:border-violet-300/38 hover:bg-violet-500/16 sm:px-6"
            >
              ✨ {ctaAddDream}
            </Link>

            <a
              href="#prophecy"
              className="energy-button inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:scale-[1.01] hover:border-white/20 hover:bg-white/10 hover:text-white sm:col-span-2 xl:w-auto"
            >
              🔮 {ctaProphecy}
            </a>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-3">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {ui.metric1Label}
              </p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                {ui.metric1Value}
              </p>
              <p className="mt-1 text-sm text-slate-400">{ui.metric1Sub}</p>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {ui.metric2Label}
              </p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                {ui.metric2Value}
              </p>
              <p className="mt-1 text-sm text-slate-400">{ui.metric2Sub}</p>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                {ui.metric3Label}
              </p>
              <p className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                {ui.metric3Value}
              </p>
              <p className="mt-1 text-sm text-slate-400">{ui.metric3Sub}</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 justify-center lg:justify-end">
          <div className="relative w-full max-w-[420px] sm:max-w-[460px]">
            <div className="absolute inset-0 scale-95 rounded-[1.8rem] bg-gradient-to-br from-cyan-400/10 via-transparent to-violet-500/12 blur-3xl" />

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_60px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-4 lg:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    {ui.signalLabel}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {ui.signalSub}
                  </p>
                </div>

                <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="signal-dot emerald" />
                  {ui.online}
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30">
                <div className="min-h-[280px] py-3 sm:min-h-[340px] sm:py-4 lg:min-h-[380px]">
                  <MiniGlobe />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {ui.glowLabel}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                    {ui.glowValue}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {ui.nodesLabel}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                    {ui.nodesValue}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {ui.heatLabel}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                    {ui.heatValue}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}