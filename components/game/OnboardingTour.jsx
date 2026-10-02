// Tanıtım turu — Android OnboardingScreen.kt + MainScreen'deki tur mantığının
// web karşılığı. Siteye ilk kez giren herkese (girişsiz de) gösterilir; her
// bölümde küçük bir etkileşim var, tamamlanınca "Devam" açılır, "Atla" hep görünür.
//
// Cihaz durumu localStorage'da (Android OnboardingPrefs ile aynı anlam):
//   seen:    bu tarayıcıda tur bir kez gösterildi mi
//   pending: tur girişsiz/misafirken bitirildiyse sonucu; ilk gerçek hesap
//            girişinde finish_onboarding ile sunucuya işlenir (+XP o zaman).
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  ArrowRight, Sparkles, TrendingUp, ListChecks, Award, Droplet, Star, Bell, User, Menu, Home, Compass, Plus,
  Target, MessageCircle, Heart, Gift, PartyPopper,
} from 'lucide-react'
import { RankEmblem, useGameProgress } from '@/components/game/GameUI'
import { finishOnboarding, rankName } from '@/lib/game'
import { supabase } from '@/lib/supabase'

const SEEN_KEY = 'lunosfer_onb_seen'
const PENDING_KEY = 'lunosfer_onb_pending'
export const REPLAY_TOUR_EVENT = 'lunosfer:replay-tour'

// Her bölüm +10 -> 6 bölüm = sunucudaki xp_rules('onboarding_completed') = 60.
const XP_PER_CHAPTER = 10
const CHAPTER_COUNT = 6

// Teknik / yasal sayfalarda tur açılmaz (Play inceleme, OAuth dönüşü, admin).
const EXCLUDED = ['/privacy', '/terms', '/child-safety-standards', '/delete-account', '/auth/callback', '/auth/reset', '/verify', '/gumroad-test']

function store(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // depolama kapalı — tur bu oturumda yine çalışır
  }
}

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const TEXT = {
  tr: {
    skip: 'Atla', next: 'Devam',
    chapters: [
      { title: 'Rüyalar evrenine hoş geldin', body: 'Lunosfer; rüyalarını kaydettiğin, anlamlarını keşfettiğin, hedeflerini vizyona dönüştürdüğün ve benzer ruhlarla buluştuğun bir evren. Hepsini bu kısa, oyun gibi turda öğren.', action: 'Ayı uyandırmak için dokun' },
      { title: 'Menüleri tanı', body: 'Sitenin her köşesi bu menülerden açılır. Aşağıdaki simgelere dokun, her birinin ne işe yaradığını gör.', action: 'Alttaki 5 simgenin hepsine dokun' },
      { title: 'Rüyanı yaz, anlamını keşfet', body: 'Uyandığında rüyanı yaz. Yapay zekâmız sembollerini Jung psikolojisiyle okur; sana özel bir yorum ve görsel üretir.', action: 'Sembolleri görmek için karta dokun', steps: 'Nasıl kaydedilir?\n1. Alttaki ＋ düğmesine (masaüstünde soldaki menüye) dokun → Yeni Rüya Anlat\n2. Rüyanı olabildiğince ayrıntılı yaz\n3. Gönder → yorumun ve görselin hazırlanır' },
      { title: 'Hedeflerini vizyona dönüştür', body: 'Hedeflerin için görsellerle, slaytlarla ve videoyla vizyon panosu oluştur. İnsanlar sana Mana göndererek inanır; sen de her gün yenilenen 20 Mana ile onların vizyonlarına destek olursun.', action: 'Mana göndermek için damlaya dokun', steps: 'Nasıl oluşturulur?\n1. Alttaki ＋ düğmesine (masaüstünde soldaki menüye) dokun → Yeni Vizyon Ekle\n2. Başlığı yaz; istersen açıklama, kapak görseli ve hedef tarih ekle\n3. Yol haritasına adımlar ekle → Vizyonu Başlat' },
      { title: 'Topluluğa katıl', body: 'Dünyanın dört bir yanından rüyaları keşfet; beğen, yorum yap, arkadaş edin, günce hikâyeleri paylaş ve sohbet et.', action: 'Kalbe dokun' },
      { title: 'Oyun başlasın', body: null, action: 'Ödülünü almak için sandığa dokun' },
    ],
    rules: [
      'Her rüya, yorum, beğeni ve destek XP kazandırır',
      "XP biriktir, rütbe atla — Uyuyan Ruh'tan Lunosfer Efsanesi'ne",
      'Günlük görevleri bitir, sandığı aç',
      'Rozet topla, haftalık sıralamada yüksel',
    ],
    dreamSample: '“Elimde eski bir anahtarla, bir kuşla birlikte denizin üstünde uçuyordum…”',
    symbols: [['🌊', 'Su — duyguların'], ['🕊️', 'Kuş — özgürlük arzun'], ['🗝️', 'Anahtar — yeni bir kapı açılıyor']],
    visionSample: 'Vizyonum: Kendi kafemi açmak',
    believers: (n) => `İnananlar: ${n}`,
    postSample: 'Dün gece ışıktan bir orman gördüm.',
    commentSample: 'Ne güzel bir rüya ✨',
    mapPick: 'Bir simgeye dokun',
    map: {
      mana: '💧 Mana: her gün 20 Mana kazanırsın. Başkalarının vizyonlarına göndererek onlara inandığını gösterirsin.',
      aura: '⭐ Aura: derin rüya analizi ve Kahin gibi premium yapay zekâ özelliklerinde kullandığın bakiye.',
      bell: '🔔 Bildirimler: beğeniler, yorumlar, arkadaşlık istekleri ve sana gönderilen Mana.',
      profile: '👤 Profil: rüyaların, güncen, vizyonların, arkadaşların, Yolculuğun ve ayarların.',
      more: '☰ Sol menü (masaüstü): Yolculuğum (XP, rütbe, görevler), Paylaşılan Vizyonlar ve gezinme.',
      home: 'Ana Sayfa: Günün Pusulası, günlük görevler, arkadaşlarının günce hikâyeleri ve akış.',
      explore: 'Keşfet: dünyanın dört bir yanından rüyaları ve vizyonları keşfet, beğen, yorum yap.',
      create: '＋ Oluştur: yeni bir rüya kaydet ya da yeni bir vizyon başlat.',
      vision: 'Vizyon: hedeflerini vizyon panosuna dönüştür, ilerlemeni takip et; Kahin ve Gölge Çalışması da burada.',
      messages: 'Mesajlar: arkadaşlarınla sohbet et; rüya, günce ve vizyon paylaş.',
    },
    navLabels: { home: 'Ana Sayfa', explore: 'Keşfet', create: 'Oluştur', vision: 'Vizyon', messages: 'Mesaj' },
    doneTitle: 'Tur tamamlandı!',
    doneBody: (xp) => `${xp} XP kazandın. İlk görevin: bu gecenin rüyasını kaydet.`,
    doneExisting: (rank) => `Geçmiş aktivitelerin de sayıldı — şu anki rütben: ${rank}`,
    doneReplay: 'Tekrar hoş geldin, gezgin. Yolculuğun devam ediyor!',
    doneGuest: (xp) => `${xp} XP'ni almak ve rütbe atlamaya başlamak için ücretsiz hesap oluştur.`,
    doneCta: 'Maceraya başla',
    signup: 'Ücretsiz hesap oluştur',
    later: 'Şimdilik göz at',
    skipHint: 'Turu istediğin zaman Yolculuğum sayfasından tekrar oynayabilirsin.',
  },
  en: {
    skip: 'Skip', next: 'Continue',
    chapters: [
      { title: 'Welcome to the dream universe', body: 'Lunosfer is where you record your dreams, discover what they mean, turn your goals into visions and meet kindred souls. Learn it all in this short, playful tour.', action: 'Tap the moon to wake it up' },
      { title: 'Find your way around', body: 'Every corner of the site opens from these menus. Tap the icons below to see what each one does.', action: 'Tap all 5 icons in the bottom bar' },
      { title: 'Write your dream, uncover its meaning', body: 'When you wake up, write down your dream. Our AI reads its symbols through Jungian psychology and gives you a personal interpretation and image.', action: 'Tap the card to reveal the symbols', steps: 'How to record one:\n1. Tap the ＋ button at the bottom (the left menu on desktop) → Log a Dream\n2. Write your dream in as much detail as you can\n3. Submit → your interpretation and image are prepared' },
      { title: 'Turn your goals into visions', body: 'Build a vision board for your goals with images, slides and video. People believe in you by sending Mana — and you get 20 fresh Mana every day to support their visions too.', action: 'Tap the drop to send Mana', steps: 'How to create one:\n1. Tap the ＋ button at the bottom (the left menu on desktop) → New Vision\n2. Write a title; add a description, cover image and target date if you like\n3. Add steps to your roadmap → Start Vision' },
      { title: 'Join the community', body: 'Explore dreams from all over the world, like and comment, make friends, share diary stories and chat.', action: 'Tap the heart' },
      { title: 'Let the game begin', body: null, action: 'Tap the chest to claim your reward' },
    ],
    rules: [
      'Every dream, comment, like and act of support earns XP',
      'Collect XP to rank up — from Sleeping Soul to Lunosfer Legend',
      'Finish your daily quests to open the chest',
      'Earn badges and climb the weekly leaderboard',
    ],
    dreamSample: '“I was flying over the sea with a bird, holding an old key…”',
    symbols: [['🌊', 'Water — your emotions'], ['🕊️', 'Bird — longing for freedom'], ['🗝️', 'Key — a new door is opening']],
    visionSample: 'My vision: opening my own café',
    believers: (n) => `Believers: ${n}`,
    postSample: 'Last night I dreamed of a forest made of light.',
    commentSample: 'What a beautiful dream ✨',
    mapPick: 'Tap an icon',
    map: {
      mana: '💧 Mana: you get 20 Mana every day. Send it to other people\'s visions to show you believe in them.',
      aura: '⭐ Aura: your balance for premium AI features like deep dream analysis and the Oracle.',
      bell: '🔔 Notifications: likes, comments, friend requests and the Mana people send you.',
      profile: '👤 Profile: your dreams, diary, visions, friends, Journey and settings.',
      more: '☰ Left menu (desktop): My Journey (XP, ranks, quests), Shared Visions and navigation.',
      home: 'Home: Daily Compass, daily quests, your friends\' diary stories and the feed.',
      explore: 'Explore: discover dreams and visions from around the world, like and comment.',
      create: '＋ Create: record a new dream or start a new vision.',
      vision: 'Vision: turn your goals into vision boards and track progress; the Oracle and Shadow Work live here too.',
      messages: 'Messages: chat with friends and share dreams, diary moments and visions.',
    },
    navLabels: { home: 'Home', explore: 'Explore', create: 'Create', vision: 'Vision', messages: 'Messages' },
    doneTitle: 'Tour complete!',
    doneBody: (xp) => `You earned ${xp} XP. Your first quest: record tonight's dream.`,
    doneExisting: (rank) => `Your past activity counts too — current rank: ${rank}`,
    doneReplay: 'Welcome back, traveler. Your journey continues!',
    doneGuest: (xp) => `Create a free account to claim your ${xp} XP and start ranking up.`,
    doneCta: 'Start the adventure',
    signup: 'Create free account',
    later: 'Just look around',
    skipHint: 'You can replay the tour anytime from My Journey.',
  },
}

function Burst({ show, color = '#E6C687', size = 220 }) {
  if (!show) return null
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-30"
      style={{ width: size, height: size, background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, animationIterationCount: 2 }}
    />
  )
}

function MoonScene({ done, onDone, t }) {
  return (
    <button onClick={onDone} disabled={done} aria-label={t.chapters[0].action} className={`relative rounded-full ${done ? '' : 'animate-pulse'}`}>
      <Burst show={done} size={260} />
      <span className="relative block transition-all duration-1000"><RankEmblem rank={8} size={170} lit={done ? 1 : 0.12} /></span>
    </button>
  )
}

const MAP_TOP = [['mana', Droplet], ['aura', Star], ['bell', Bell], ['profile', User], ['more', Menu]]
const MAP_BOTTOM = [['home', Home], ['explore', Compass], ['create', Plus], ['vision', Target], ['messages', MessageCircle]]

function MapScene({ done, onDone, t }) {
  const [selected, setSelected] = useState(null)
  const [tapped, setTapped] = useState([])
  function pick(key, bottom) {
    setSelected(key)
    if (!bottom) return
    const next = tapped.includes(key) ? tapped : [...tapped, key]
    setTapped(next)
    if (!done && next.length === MAP_BOTTOM.length) onDone()
  }
  const iconCls = (key, lit) => `flex h-11 w-11 items-center justify-center rounded-full border transition ${
    selected === key ? 'border-astral-gold bg-astral-gold/20 text-astral-gold' : lit ? 'border-emerald-400/50 text-emerald-300' : 'border-white/10 text-slate-300 hover:bg-white/5'
  }`
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-void-900/80 p-3">
      <div className="flex justify-between">
        {MAP_TOP.map(([key, Icon]) => (
          <button key={key} onClick={() => pick(key, false)} className={iconCls(key, false)} aria-label={key}><Icon size={18} /></button>
        ))}
      </div>
      <p className="my-3 min-h-[60px] rounded-xl bg-black/30 p-2.5 text-center text-[13px] leading-snug text-slate-200">
        {selected ? t.map[selected] : t.mapPick}
      </p>
      <div className="flex justify-between">
        {MAP_BOTTOM.map(([key, Icon]) => (
          <button key={key} onClick={() => pick(key, true)} className="flex flex-col items-center gap-1" aria-label={t.navLabels[key]}>
            <span className={iconCls(key, tapped.includes(key))}><Icon size={18} /></span>
            <span className="text-[10px] text-slate-400">{t.navLabels[key]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function DreamCardScene({ done, onDone, t }) {
  return (
    <button onClick={onDone} disabled={done} className={`relative w-full max-w-sm rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-void-900 p-4 text-left transition ${done ? '' : 'hover:scale-[1.02] animate-pulse'}`}>
      <p className="text-sm italic text-slate-100">{t.dreamSample}</p>
      {done && (
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {t.symbols.map(([emoji, text]) => (
            <p key={text} className="text-[13px] text-astral-gold">{emoji} {text}</p>
          ))}
        </div>
      )}
    </button>
  )
}

function ManaScene({ done, onDone, t }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-void-900/80 p-4 text-center">
      <p className="font-bold text-white">{t.visionSample}</p>
      <p className="mt-1 text-sm text-cyan-300">{t.believers(done ? 13 : 12)}</p>
      <button onClick={onDone} disabled={done} aria-label={t.chapters[3].action} className={`relative mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/15 ${done ? '' : 'animate-bounce'}`}>
        <Burst show={done} color="#22D3EE" size={150} />
        <Droplet size={40} className={done ? 'fill-cyan-300 text-cyan-300' : 'text-cyan-300'} />
      </button>
    </div>
  )
}

function HeartScene({ done, onDone, t }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-void-900/80 p-4">
      <p className="text-[15px] text-white/90">{t.postSample}</p>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onDone} disabled={done} aria-label={t.chapters[4].action} className={`relative rounded-full p-2 ${done ? '' : 'animate-pulse bg-white/5'}`}>
          <Burst show={done} color="#F472B6" size={110} />
          <Heart size={28} className={done ? 'fill-pink-400 text-pink-400' : 'text-slate-300'} />
        </button>
        <span className="text-sm text-slate-400">{done ? 42 : 41}</span>
      </div>
      {done && <p className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-[13px] text-white">{t.commentSample}</p>}
    </div>
  )
}

function ChestScene({ done, onDone, t }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-1.5">
        <RankEmblem rank={0} size={40} /><ArrowRight size={14} className="text-slate-400" />
        <RankEmblem rank={4} size={52} /><ArrowRight size={14} className="text-slate-400" />
        <RankEmblem rank={9} size={66} />
      </div>
      <button onClick={onDone} disabled={done} aria-label={t.chapters[5].action} className={`relative flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-astral-gold bg-gradient-to-br from-amber-500/35 to-void-900 ${done ? '' : 'animate-bounce'}`}>
        <Burst show={done} color="#F59E0B" size={170} />
        {done ? <PartyPopper size={48} className="text-astral-gold" /> : <Gift size={48} className="text-astral-gold" />}
      </button>
    </div>
  )
}

const SCENES = [MoonScene, MapScene, DreamCardScene, ManaScene, HeartScene, ChestScene]
const RULE_ICONS = [Sparkles, TrendingUp, ListChecks, Award]

/** mode: 'account' | 'replay' | 'visitor' */
function TourOverlay({ mode, lang, rank, xp, onFinish }) {
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']
  const [chapter, setChapter] = useState(0)
  const [doneMask, setDoneMask] = useState(0)
  const [finished, setFinished] = useState(false)
  const showXp = mode !== 'replay'
  const isDone = (i) => (doneMask & (1 << i)) !== 0
  const earnedSoFar = [...Array(CHAPTER_COUNT).keys()].filter(isDone).length * XP_PER_CHAPTER

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onFinish(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [onFinish])

  const c = t.chapters[chapter]
  const Scene = SCENES[chapter]

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-void-950" role="dialog" aria-modal="true" aria-label={c.title}>
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(1px 1px at 20% 30%, #fff8, transparent), radial-gradient(1px 1px at 70% 20%, #fff6, transparent), radial-gradient(1.5px 1.5px at 40% 80%, #fff5, transparent), radial-gradient(1px 1px at 85% 65%, #fff7, transparent), radial-gradient(1px 1px at 10% 70%, #fff5, transparent)' }} />
      <div className="relative mx-auto flex min-h-full max-w-xl flex-col px-5 pb-6 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[...Array(CHAPTER_COUNT).keys()].map((i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${isDone(i) ? 'bg-astral-gold' : i === (finished ? CHAPTER_COUNT : chapter) ? 'bg-white/50' : 'bg-white/15'}`} />
            ))}
          </div>
          {showXp && <span className="rounded-full border border-astral-gold/40 bg-astral-gold/10 px-2.5 py-0.5 text-xs font-bold text-astral-gold">{earnedSoFar} XP</span>}
          {!finished && <button onClick={() => onFinish(false)} className="px-2 py-1 text-sm text-slate-400 hover:text-white">{t.skip}</button>}
        </div>

        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-5"><Burst show size={240} /><RankEmblem rank={rank} size={140} /></div>
            <h2 className="font-serif text-3xl font-bold text-astral-gold">{t.doneTitle}</h2>
            <p className="mt-3 text-base text-white/90">
              {mode === 'account' ? t.doneBody(CHAPTER_COUNT * XP_PER_CHAPTER) : mode === 'replay' ? t.doneReplay : t.doneGuest(CHAPTER_COUNT * XP_PER_CHAPTER)}
            </p>
            {mode === 'account' && xp > 0 && <p className="mt-2 text-sm text-cyan-300">{t.doneExisting(rankName(lang, rank))}</p>}
            <button onClick={() => onFinish(true)} className="mt-7 h-12 w-full rounded-2xl bg-astral-gold text-base font-bold text-void-950">
              {mode === 'visitor' ? t.signup : t.doneCta}
            </button>
            {mode === 'visitor' && (
              <button onClick={() => onFinish(true, { stay: true })} className="mt-3 text-sm text-slate-400 hover:text-white">{t.later}</button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4 text-center">
              <div>
                <h2 className="font-serif text-2xl font-bold text-astral-gold">{c.title}</h2>
                {c.body ? (
                  <p className="mt-2 text-[15px] leading-relaxed text-white/85">{c.body}</p>
                ) : (
                  <ul className="mt-3 space-y-1.5 text-left">
                    {t.rules.map((line, i) => {
                      const Icon = RULE_ICONS[i]
                      return <li key={line} className="flex items-start gap-2 text-sm text-white/85"><Icon size={16} className="mt-0.5 shrink-0 text-astral-gold" />{line}</li>
                    })}
                  </ul>
                )}
                {c.steps && (
                  <p className="mt-3 whitespace-pre-line rounded-2xl border border-astral-gold/25 bg-void-900 px-3.5 py-2.5 text-left text-sm font-semibold leading-relaxed text-astral-gold/95">{c.steps}</p>
                )}
              </div>
              <Scene key={chapter} done={isDone(chapter)} onDone={() => setDoneMask((m) => m | (1 << chapter))} t={t} />
            </div>
            <div className="flex min-h-[36px] items-center justify-center">
              {isDone(chapter) ? (
                showXp && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3.5 py-1.5 text-sm font-bold text-emerald-400"><Sparkles size={15} /> +{XP_PER_CHAPTER} XP</span>
              ) : (
                <span className="animate-pulse text-sm font-semibold text-cyan-300">✦ {c.action} ✦</span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {chapter > 0 && (
                <button onClick={() => setChapter((x) => x - 1)} className="h-12 rounded-2xl border border-white/15 px-4 text-sm text-slate-300">←</button>
              )}
              <button
                onClick={() => (chapter < CHAPTER_COUNT - 1 ? setChapter((x) => x + 1) : setFinished(true))}
                disabled={!isDone(chapter)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-astral-gold text-base font-bold text-void-950 disabled:bg-white/10 disabled:text-slate-500"
              >
                {t.next} <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** _app.js'te bir kez çizilir: ne zaman turun açılacağına karar verir. */
export default function OnboardingHost({ lang }) {
  const router = useRouter()
  const p = useGameProgress()
  const [mounted, setMounted] = useState(false)
  const [auto, setAuto] = useState(false)
  const [replay, setReplay] = useState(false)
  const [toast, setToast] = useState('')
  const [hasSession, setHasSession] = useState(null) // null = henüz bilinmiyor

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setHasSession(!!session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setHasSession(!!session))
    if (!read(SEEN_KEY)) setAuto(true)
    const onReplay = () => setReplay(true)
    window.addEventListener(REPLAY_TOUR_EVENT, onReplay)
    return () => { window.removeEventListener(REPLAY_TOUR_EVENT, onReplay); subscription?.unsubscribe() }
  }, [])

  // Giriş yapan hesap turu hiç görmemişse: bekleyen sonucu işle, yoksa turu aç
  // (bu tarayıcıda tur başka hesapla/girişsiz görülmüş olabilir).
  useEffect(() => {
    if (!p || p.is_guest) return
    // Hesap turu zaten (ör. Android'de) bitirmiş/atlamış: bu tarayıcıda zorla açma.
    if (p.onboarding_status !== 'none') {
      store(SEEN_KEY, '1')
      store(PENDING_KEY, null)
      setAuto(false)
      return
    }
    const pending = read(PENDING_KEY)
    if (pending) {
      finishOnboarding(pending === 'completed').then(() => store(PENDING_KEY, null)).catch(() => {})
    } else if (read(SEEN_KEY)) {
      setAuto(true)
    }
  }, [p?.onboarding_status, p?.is_guest]) // eslint-disable-line react-hooks/exhaustive-deps

  // Oturum varsa ilerleme yüklenene kadar bekle (yanlış modda/gereksiz açılmasın).
  const waiting = hasSession === null || (hasSession && !p)
  if (!mounted || !(auto || replay) || (auto && !replay && waiting)) {
    return toast ? <div className="fixed bottom-24 left-1/2 z-[95] -translate-x-1/2 rounded-full border border-white/10 bg-void-900 px-4 py-2 text-xs text-slate-200 shadow-lg lg:bottom-8">{toast}</div> : null
  }
  if (router.pathname.startsWith('/admin')) return null
  if (auto && !replay && EXCLUDED.some((path) => router.pathname.startsWith(path))) return null

  const loggedIn = !!p && !p.is_guest
  const mode = !loggedIn ? 'visitor' : (replay && p.onboarding_status !== 'none') ? 'replay' : 'account'
  const t = TEXT[lang === 'tr' ? 'tr' : 'en']

  function onFinish(completed, opts = {}) {
    setAuto(false)
    setReplay(false)
    store(SEEN_KEY, '1')
    // Bir kez "tamamlandı" kaydedildiyse sonraki "atla" onu ezmesin (ödül kaybolmasın).
    if (read(PENDING_KEY) !== 'completed') store(PENDING_KEY, completed ? 'completed' : 'skipped')
    if (!completed) {
      setToast(t.skipHint)
      setTimeout(() => setToast(''), 4500)
    }
    if (loggedIn) {
      if (p.onboarding_status === 'none') {
        const result = read(PENDING_KEY)
        finishOnboarding(result === 'completed').then(() => store(PENDING_KEY, null)).catch(() => {})
      } else {
        store(PENDING_KEY, null)
      }
    } else if (completed && !opts.stay) {
      router.push('/auth')
    }
  }

  return <TourOverlay mode={mode} lang={lang} rank={p?.rank || 0} xp={p?.xp || 0} onFinish={onFinish} />
}
