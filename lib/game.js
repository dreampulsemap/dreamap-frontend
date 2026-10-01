// Oyunlaştırma (XP / rütbe / rozet / günlük görev) istemci tarafı —
// Android'deki GameRepository.kt'nin web karşılığı.
//
// Puanlar tamamen sunucuda (DB trigger'ları, bkz. migration 016/017/018)
// veriliyor; istemci yalnızca get_my_progress() okuyor. Tazeleme: giriş,
// sekmeye dönüş ve her başarılı yazma isteğinden sonra (installFetchHook).
//
// "Görülen" XP/rütbe/rozetler kullanıcı bazında localStorage'da: sayfa
// kapalıyken kazanılanlar da (biri beğendi vb.) sonraki açılışta kutlanır.
import { supabase } from '@/lib/supabase'

let progress = null
let events = []
let eventSeq = 0
let pendingTimer = null
let inflight = null
let lastRefreshAt = 0
const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getProgress = () => progress
export const getEvents = () => events

export function consumeEvent(id) {
  events = events.filter((e) => e.id !== id)
  emit()
}

function readSeen(userId) {
  try {
    const raw = localStorage.getItem(`lunosfer_game_${userId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSeen(userId, p, earned) {
  try {
    localStorage.setItem(`lunosfer_game_${userId}`, JSON.stringify({ xp: p.xp, rank: p.rank, badges: earned }))
  } catch {
    // depolama kapalı (gizli pencere vb.) — kutlamalar sadece bu oturumda
  }
}

export const earnedBadgeCodes = (p) => (p?.badges || []).filter((b) => b.earned_at).map((b) => b.code)

function diffAgainstSeen(userId, p) {
  const earned = earnedBadgeCodes(p)
  const seen = readSeen(userId)
  writeSeen(userId, p, earned)
  // Bu tarayıcıda bu hesabın ilk yüklemesi: geçmiş için kutlama patlatma.
  if (!seen) return

  const fresh = []
  if (p.xp > seen.xp) {
    const gained = p.xp - seen.xp
    const single = p.recent?.[0]?.delta === gained ? p.recent[0] : null
    fresh.push({ id: ++eventSeq, type: 'xp', amount: gained, reason: single?.reason || null })
  }
  earned.filter((c) => !(seen.badges || []).includes(c)).forEach((code) => {
    fresh.push({ id: ++eventSeq, type: 'badge', code })
  })
  if (p.rank > seen.rank) fresh.push({ id: ++eventSeq, type: 'rank', rank: p.rank })
  if (fresh.length) events = [...events, ...fresh]
}

export async function refresh() {
  if (inflight) return inflight
  inflight = (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      progress = null
      emit()
      return null
    }
    const { data, error } = await supabase.rpc('get_my_progress')
    if (error || !data) return progress
    // İstek sürerken oturum değiştiyse eski sonucu yazma.
    const { data: { session: now } } = await supabase.auth.getSession()
    if (now?.user?.id !== userId) return null
    progress = data
    lastRefreshAt = Date.now()
    if (!data.is_guest) diffAgainstSeen(userId, data)
    emit()
    return data
  })().finally(() => { inflight = null })
  return inflight
}

/** Art arda gelen yazma işlemlerini tek sorguda toplar. */
export function requestRefresh(delayMs = 800) {
  clearTimeout(pendingTimer)
  pendingTimer = setTimeout(refresh, delayMs)
}

export function refreshIfStale(maxAgeMs = 30000) {
  if (Date.now() - lastRefreshAt > maxAgeMs) requestRefresh(0)
}

export function clearGame() {
  clearTimeout(pendingTimer)
  progress = null
  events = []
  lastRefreshAt = 0
  emit()
}

// XP ile ilgisi olmayan yazma uçları (Android GameRefreshInterceptor ile aynı).
const IGNORED_API = ['/api/translate', '/api/push/subscribe', '/api/diary/mark-seen', '/api/notifications', '/api/summaries/generate']

/**
 * Her başarılı yazma isteğinden sonra ilerlemeyi (debounce'lu) tazeler.
 * Tek yerden: yorum/beğeni/mana/vizyon/günce... her bileşene ayrı ayrı
 * dokunmak yerine. Supabase REST'e doğrudan yazılanlar da (ör. rüya ekleme)
 * yakalanır; /rpc/ hariç — yoksa get_my_progress kendi kendini tetikler.
 */
export function installFetchHook() {
  if (typeof window === 'undefined' || window.__lunosferGameHook) return
  window.__lunosferGameHook = true
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await original(input, init)
    try {
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      if (res.ok && method !== 'GET' && method !== 'HEAD') {
        const url = new URL(typeof input === 'string' ? input : input.url, window.location.href)
        const sameOriginApi = url.origin === window.location.origin && url.pathname.startsWith('/api/') &&
          !IGNORED_API.some((p) => url.pathname.endsWith(p))
        const restWrite = url.pathname.startsWith('/rest/v1/') && !url.pathname.startsWith('/rest/v1/rpc/')
        if (sameOriginApi || restWrite) requestRefresh()
      }
    } catch {
      // izleme asla isteği bozmasın
    }
    return res
  }
}

/**
 * Dış platform paylaşımını XP'ye sayar. Sunucu içerik + kanal + gün başına
 * bir kez ve günde en fazla 5 kez ödüllendirir; hata paylaşımı engellemez.
 * channel: record_share'in izin listesindeki ad (whatsapp, x, telegram, ...).
 */
export async function recordShare(type, id, channel) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.rpc('record_share', { p_type: type, p_id: String(id), p_channel: channel })
    if (!error) requestRefresh()
  } catch {
    // sessiz
  }
}

export async function fetchLeaderboard(period) {
  const { data, error } = await supabase.rpc('get_leaderboard', { p_period: period, p_limit: 20 })
  if (error) throw error
  return data || []
}

/** Görünürlük izin vermiyorsa (gizli profil vb.) null. */
export async function fetchPublicProgress(userId) {
  const { data, error } = await supabase.rpc('get_public_progress', { p_user: userId })
  if (error) return null
  return data || null
}

export async function finishOnboarding(completed) {
  const { data, error } = await supabase.rpc('finish_onboarding', { p_completed: !!completed })
  if (error) throw error
  await refresh()
  return data
}

/** Mevcut rütbe içindeki ilerleme (0..1); en üst rütbede 1. */
export function rankProgress(p) {
  if (!p?.next_rank_xp) return 1
  const span = Math.max(1, p.next_rank_xp - (p.rank_min_xp || 0))
  return Math.min(1, Math.max(0, (p.xp - (p.rank_min_xp || 0)) / span))
}

// ---------------------------------------------------------------------------
// Görünüm: isimler/renkler istemcide, eşikler sunucuda.
// ---------------------------------------------------------------------------

export const RANK_COLORS = ['#94A3B8', '#7DD3FC', '#38BDF8', '#818CF8', '#A855F7', '#E879F9', '#F472B6', '#F59E0B', '#E6C687', '#FFE9A8']
export const rankColor = (rank) => RANK_COLORS[Math.min(9, Math.max(0, rank || 0))]

const TEXT = {
  en: {
    ranks: ['Sleeping Soul', 'Dream Seed', 'Stardust', 'Moon Wanderer', 'Dream Explorer', 'Light Bearer', 'Subconscious Guide', 'Cosmic Oracle', 'Galaxy Keeper', 'Lunosfer Legend'],
    badges: {
      first_dream: ['First Dream', 'Record your first dream'],
      streak_3: ['Three Nights', 'Record dreams 3 days in a row'],
      first_vision: ['Visionary', 'Create your first vision'],
      first_diary: ['Storyteller', 'Share your first diary story'],
      dreams_10: ['Dream Writer', 'Record 10 dreams'],
      streak_7: ['Seven Nights', 'Record dreams 7 days in a row'],
      mana_giver_10: ['Light Giver', 'Send Mana to visions 10 times'],
      friends_5: ['Soul Circle', 'Make 5 friends'],
      comments_25: ['Kindred Voice', "Write 25 comments on others' posts"],
      quest_master: ['Quest Master', 'Complete all daily quests 7 times'],
      ambassador: ['Light Ambassador', 'Invite a friend who joins Lunosfer'],
      likes_received_50: ['Beloved Dreamer', 'Receive 50 likes'],
      dreams_50: ['Dream Archivist', 'Record 50 dreams'],
      streak_30: ['Lunar Cycle', 'Record dreams 30 days in a row'],
    },
    reasons: {
      dream_posted: 'Record a dream', diary_posted: 'Share a diary story', vision_created: 'Create a vision',
      comment_posted: 'Comment on a post', comment_received: 'Receive a comment', like_given: 'Like a post',
      like_received: 'Receive a like', mana_sent: 'Send Mana to a vision', mana_given: 'Receive Mana',
      friend_made: 'Make a friend', referral_inviter: 'Invite a friend who joins', referral_joined: 'Join with an invite',
      compass_checkin: 'Daily Compass', seed_completed: 'Complete a daily seed', onboarding_completed: 'Finish the tour',
      profile_completed: 'Complete your profile', daily_quests_bonus: 'Daily quest chest', badge_earned: 'Badge earned',
      content_shared: 'Sharing a post', other: 'Bonus XP',
    },
    quests: {
      post_dream: 'Record a dream', post_diary: 'Share a diary story', comment_2: 'Comment on 2 different posts',
      like_3: 'Like 3 different posts', mana_1: 'Send Mana to a vision', compass: 'Check your Daily Compass',
    },
    questsTitle: 'Daily Quests',
    chest: (xp) => `Complete all 3 to open the chest: +${xp} XP`,
    chestClaimed: 'Chest opened! New quests tomorrow ✨',
    resets: (h, m) => `Resets in ${h} h ${m} min`,
    questsGuest: 'Create a free account to take on daily quests and earn XP.',
    signup: 'Create free account',
    title: 'My Journey',
    level: (lvl, xp) => `Level ${lvl} · ${xp} XP`,
    toNext: (xp, name) => `${xp} XP to ${name}`,
    maxRank: 'You have reached the highest rank!',
    todayWeek: (t, w) => `Today +${t} XP · This week +${w} XP`,
    howTitle: 'How to earn XP',
    ruleCap: (n) => `max ${n} a day`,
    rulePerMana: 'per Mana received',
    badgesTitle: 'Badges',
    badgesCount: (a, b) => `${a} / ${b} earned`,
    badgeLocked: 'Not earned yet',
    badgeEarned: 'Earned',
    ranksTitle: 'Ranks',
    rankFrom: (xp) => `from ${xp} XP`,
    rankCurrent: 'You are here',
    lbTitle: 'Leaderboard',
    lbWeek: 'This week',
    lbAll: 'All time',
    lbEmpty: 'No one on the board yet — be the first!',
    lbError: "Couldn't load the leaderboard.",
    lbYou: 'You',
    retry: 'Retry',
    recentTitle: 'Recent XP',
    recentEmpty: 'Your XP history will appear here.',
    guestTitle: 'Your journey starts with an account',
    guestBody: 'Guests can look around, but XP, ranks and badges need a free account.',
    rankUpTitle: 'Rank up!',
    rankUpBody: (name) => `New rank: ${name}`,
    rankUpCta: 'Wonderful!',
    badgeTitle: 'New badge!',
    badgeCta: 'Nice!',
    close: 'Close',
  },
  tr: {
    ranks: ['Uyuyan Ruh', 'Rüya Tohumu', 'Yıldız Tozu', 'Ay Gezgini', 'Rüya Kâşifi', 'Işık Taşıyıcı', 'Bilinçaltı Rehberi', 'Kozmik Kâhin', 'Galaksi Bekçisi', 'Lunosfer Efsanesi'],
    badges: {
      first_dream: ['İlk Rüya', 'İlk rüyanı kaydet'],
      streak_3: ['Üç Gece', '3 gün üst üste rüya kaydet'],
      first_vision: ['Vizyoner', 'İlk vizyonunu oluştur'],
      first_diary: ['Hikâye Anlatıcı', 'İlk günce hikâyeni paylaş'],
      dreams_10: ['Rüya Yazarı', '10 rüya kaydet'],
      streak_7: ['Yedi Gece', '7 gün üst üste rüya kaydet'],
      mana_giver_10: ['Işık Veren', 'Vizyonlara 10 kez Mana gönder'],
      friends_5: ['Ruh Çemberi', '5 arkadaş edin'],
      comments_25: ['Candan Ses', 'Başkalarının paylaşımlarına 25 yorum yaz'],
      quest_master: ['Görev Ustası', 'Günlük görevlerin hepsini 7 kez tamamla'],
      ambassador: ['Işık Elçisi', "Lunosfer'e katılan bir arkadaşını davet et"],
      likes_received_50: ['Sevilen Rüyacı', '50 beğeni al'],
      dreams_50: ['Rüya Arşivcisi', '50 rüya kaydet'],
      streak_30: ['Ay Döngüsü', '30 gün üst üste rüya kaydet'],
    },
    reasons: {
      dream_posted: 'Rüya kaydet', diary_posted: 'Günce hikâyesi paylaş', vision_created: 'Vizyon oluştur',
      comment_posted: 'Bir paylaşıma yorum yap', comment_received: 'Yorum al', like_given: 'Bir paylaşımı beğen',
      like_received: 'Beğeni al', mana_sent: 'Bir vizyona Mana gönder', mana_given: 'Mana al',
      friend_made: 'Arkadaş edin', referral_inviter: 'Katılan bir arkadaşını davet et', referral_joined: 'Davetle katıl',
      compass_checkin: 'Günlük Pusula', seed_completed: 'Günün tohumunu tamamla', onboarding_completed: 'Turu tamamla',
      profile_completed: 'Profilini tamamla', daily_quests_bonus: 'Günlük görev sandığı', badge_earned: 'Rozet kazanıldı',
      content_shared: 'İçerik paylaşımı', other: 'Bonus XP',
    },
    quests: {
      post_dream: 'Bir rüya kaydet', post_diary: 'Bir günce hikâyesi paylaş', comment_2: '2 farklı paylaşıma yorum yap',
      like_3: '3 farklı paylaşımı beğen', mana_1: 'Bir vizyona Mana gönder', compass: 'Günlük Pusulana bak',
    },
    questsTitle: 'Günlük Görevler',
    chest: (xp) => `Sandığı açmak için 3 görevi de tamamla: +${xp} XP`,
    chestClaimed: 'Sandık açıldı! Yeni görevler yarın ✨',
    resets: (h, m) => `${h} sa ${m} dk sonra yenilenir`,
    questsGuest: 'Günlük görevleri üstlenip XP kazanmak için ücretsiz hesap oluştur.',
    signup: 'Ücretsiz hesap oluştur',
    title: 'Yolculuğum',
    level: (lvl, xp) => `Seviye ${lvl} · ${xp} XP`,
    toNext: (xp, name) => `${name} rütbesine ${xp} XP kaldı`,
    maxRank: 'En yüksek rütbeye ulaştın!',
    todayWeek: (t, w) => `Bugün +${t} XP · Bu hafta +${w} XP`,
    howTitle: 'Nasıl XP kazanılır?',
    ruleCap: (n) => `günde en fazla ${n}`,
    rulePerMana: 'alınan her Mana için',
    badgesTitle: 'Rozetler',
    badgesCount: (a, b) => `${a} / ${b} kazanıldı`,
    badgeLocked: 'Henüz kazanılmadı',
    badgeEarned: 'Kazanıldı',
    ranksTitle: 'Rütbeler',
    rankFrom: (xp) => `${xp} XP'den itibaren`,
    rankCurrent: 'Buradasın',
    lbTitle: 'Sıralama',
    lbWeek: 'Bu hafta',
    lbAll: 'Tüm zamanlar',
    lbEmpty: 'Tabloda henüz kimse yok — ilk sen ol!',
    lbError: 'Sıralama yüklenemedi.',
    lbYou: 'Sen',
    retry: 'Tekrar dene',
    recentTitle: 'Son XP hareketleri',
    recentEmpty: 'XP geçmişin burada görünecek.',
    guestTitle: 'Yolculuğun bir hesapla başlar',
    guestBody: 'Misafir olarak etrafa bakabilirsin; XP, rütbe ve rozetler için ücretsiz bir hesap gerekir.',
    rankUpTitle: 'Rütbe atladın!',
    rankUpBody: (name) => `Yeni rütben: ${name}`,
    rankUpCta: 'Harika!',
    badgeTitle: 'Yeni rozet!',
    badgeCta: 'Süper!',
    close: 'Kapat',
  },
}

export function gameText(lang) {
  return TEXT[lang === 'tr' ? 'tr' : 'en']
}

export const rankName = (lang, rank) => gameText(lang).ranks[Math.min(9, Math.max(0, rank || 0))]

/** Bilinmeyen (sunucuya sonradan eklenmiş) rozet kodu -> null, gizlenir. */
export const badgeMeta = (lang, code) => {
  const m = gameText(lang).badges[code]
  return m ? { name: m[0], desc: m[1] } : null
}

export const reasonLabel = (lang, reason) => {
  const r = gameText(lang).reasons
  return r[reason] || r.other
}
