import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Kolektif Keşfet (Dreamscape) ızgarası için kişiselleştirilmiş sıralama.
//
// Instagram Explore mantığı: kullanıcının GEÇMİŞTE en çok etkileşime girdiği
// arketiplere (beğeni > yorum > kendi rüyaları) göre bir "ilgi profili"
// çıkarılır, sonra havuzdaki her rüya bu profille ne kadar örtüştüğüne göre
// skorlanır. Tazelik ve popülerlik ikincil düzeltme terimleri olarak eklenir
// — yoksa (a) aynı yüksek skorlu içerik sonsuza dek tepede kalır, (b) hiç
// etkileşim geçmişi olmayan yeni/misafir kullanıcılar için ızgara anlamsız
// bir sıralamaya düşer. Etkileşim verisi yoksa arketip terimi sıfırlanır ve
// sonuç pratikte tazelik+popülerliğe (eski davranışa yakın) geri döner.
//
// Sayfalama iki katmanlı: en yeni RANK_POOL_SIZE rüya bir "havuz" olarak
// çekilip skorlanır ve sayfalara bölünür; bu havuzun ötesi (derin scroll)
// düz kronolojik sıralamaya devam eder — havuz sınırıyla tam olarak
// hizalandığı için ne tekrar ne de atlama olur.

const BATCH_SIZE = 15
const RANK_POOL_SIZE = 240        // Kişiselleştirmenin uygulandığı çekirdek havuz (~16 sayfa)
const ENGAGEMENT_LOOKBACK = 200   // Her sinyal için taranacak en fazla kayıt sayısı

// Nihai skor ağırlıkları — arketip eşleşmesi baskın faktör (istenen davranış),
// tazelik/popülerlik devrilmeyi önleyen ikincil düzeltmeler.
const W_ARCHETYPE = 0.6
const W_RECENCY = 0.28
const W_POPULARITY = 0.12

const LIKE_WEIGHT = 3     // Beğenilen bir rüyanın arketipleri
const COMMENT_WEIGHT = 5  // Yorum yapılan bir rüyanın arketipleri (daha güçlü sinyal)
const OWN_DREAM_WEIGHT = 1 // Kullanıcının kendi rüyalarındaki arketipler (soğuk başlangıç yardımı)

// KESİF KALİTE FİLTRESİ (DÜZELTİLMİŞ): görseli olmayan ya da ONAYLANMIŞ
// biçimde kırık ('broken') rüyalar Explore'da görünmez. 'needs_persist' —
// yani "henüz kalıcı depoya taşınmadı ama URL muhtemelen hâlâ çalışıyor" —
// ARTIK GİZLENMİYOR. İlk sürümde 'needs_persist' de gizleniyordu; migration'daki
// geriye dönük tarama neredeyse TÜM eski rüyaları bu durumla işaretlediği için
// (henüz hiçbiri kalıcı depoya taşınmamıştı) Kesif'in tamamen boşalmasına
// sebep oldu. Artık yalnızca onarım denemeleri TÜKENİP kesin olarak "broken"
// işaretlenmiş rüyalar (bkz. lib/repairDreamImage.js MAX_REPAIR_ATTEMPTS)
// gizleniyor — bu da gerçekten kurtarılamayan görseller demek.
const MIN_IMAGE_DIMENSION = 300 // yalnızca boyutu BİLİNEN (ör. Pixabay) görsellere uygulanır

// includeNoImage=1: kullanıcı Keşfet'te "görselsiz rüyaları da göster"
// seçeneğini açtıysa ai_image_url boş olan rüyaları artık ELEMİYORUZ —
// 'broken' olarak işaretlenmiş (onarım denemeleri tükenmiş) rüyalar yine de
// gizli kalır, çünkü onlar gerçekten kurtarılamayan/bozuk görsellerdir,
// "görselsiz" değildir.
function applyImageQualityFilter(query, includeNoImage) {
  let q = query.neq('image_status', 'broken')
  if (!includeNoImage) {
    q = q.not('ai_image_url', 'is', null)
  }
  return q
}

function passesImageQuality(dream) {
  // width/height bilinmiyorsa (çoğu AI-üretilen eski kayıt) filtreleme
  // yapmıyoruz — yalnızca BİLDİĞİMİZ düşük çözünürlüklü görselleri eleriz.
  if (dream.image_width && dream.image_width < MIN_IMAGE_DIMENSION) return false
  if (dream.image_height && dream.image_height < MIN_IMAGE_DIMENSION) return false
  return true
}

function encodeRankToken(affinity) {
  return Buffer.from(JSON.stringify({ v: 1, aff: affinity })).toString('base64')
}

function decodeRankToken(token) {
  try {
    const parsed = JSON.parse(Buffer.from(String(token), 'base64').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || typeof parsed.aff !== 'object' || parsed.aff === null) {
      return null
    }
    const clean = {}
    for (const [key, val] of Object.entries(parsed.aff)) {
      const num = Number(val)
      if (typeof key === 'string' && key.length > 0 && key.length < 60 && Number.isFinite(num)) {
        clean[key] = num
      }
    }
    return clean
  } catch {
    return null
  }
}

function addArchetypeWeights(affinity, archetypes, weight) {
  if (!Array.isArray(archetypes)) return
  for (const a of archetypes) {
    if (!a) continue
    affinity[a] = (affinity[a] || 0) + weight
  }
}

// Kullanıcının arketip ilgi profilini çıkarır. Her sinyal sorgusu bağımsız
// olarak "başarısız olabilir" kabul edilir (ör. likes/comments tablosunda
// created_at farklı davranıyorsa) — biri patlarsa tüm Explore sayfasını
// çökertmek yerine o sinyali sessizce atlayıp kalanla devam eder.
async function computeArchetypeAffinity(userId) {
  const affinity = {}

  const [likesRes, commentsRes, ownRes] = await Promise.allSettled([
    supabaseAdmin
      .from('likes')
      .select('dream_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(ENGAGEMENT_LOOKBACK),
    supabaseAdmin
      .from('comments')
      .select('dream_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(ENGAGEMENT_LOOKBACK),
    supabaseAdmin
      .from('dreams')
      .select('ai_archetypes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(ENGAGEMENT_LOOKBACK),
  ])

  const likes = likesRes.status === 'fulfilled' && !likesRes.value.error ? likesRes.value.data || [] : []
  const comments = commentsRes.status === 'fulfilled' && !commentsRes.value.error ? commentsRes.value.data || [] : []
  const ownDreams = ownRes.status === 'fulfilled' && !ownRes.value.error ? ownRes.value.data || [] : []

  if (likesRes.status === 'rejected' || likesRes.value?.error) {
    console.error('explore/feed affinity(likes) error:', likesRes.reason || likesRes.value?.error)
  }
  if (commentsRes.status === 'rejected' || commentsRes.value?.error) {
    console.error('explore/feed affinity(comments) error:', commentsRes.reason || commentsRes.value?.error)
  }
  if (ownRes.status === 'rejected' || ownRes.value?.error) {
    console.error('explore/feed affinity(ownDreams) error:', ownRes.reason || ownRes.value?.error)
  }

  for (const dream of ownDreams) {
    addArchetypeWeights(affinity, dream.ai_archetypes, OWN_DREAM_WEIGHT)
  }

  const likedIds = [...new Set(likes.map((l) => l.dream_id).filter(Boolean))]
  const commentedIds = [...new Set(comments.map((c) => c.dream_id).filter(Boolean))]
  const engagedIds = [...new Set([...likedIds, ...commentedIds])]

  if (engagedIds.length > 0) {
    const { data: engagedDreams, error } = await supabaseAdmin
      .from('dreams')
      .select('id, ai_archetypes')
      .in('id', engagedIds)

    if (!error) {
      const archetypesById = new Map((engagedDreams || []).map((d) => [d.id, d.ai_archetypes]))
      for (const id of likedIds) addArchetypeWeights(affinity, archetypesById.get(id), LIKE_WEIGHT)
      for (const id of commentedIds) addArchetypeWeights(affinity, archetypesById.get(id), COMMENT_WEIGHT)
    } else {
      console.error('explore/feed affinity(engagedDreams) error:', error)
    }
  }

  return affinity
}

function scoreDream(dream, affinity, maxAffinity, now) {
  const archetypes = Array.isArray(dream.ai_archetypes) ? dream.ai_archetypes : []

  // En güçlü tek eşleşme baskın, diğer örtüşen arketipler küçük bir bonus.
  let primary = 0
  let secondarySum = 0
  for (const a of archetypes) {
    const val = affinity[a] || 0
    if (val > primary) {
      secondarySum += primary
      primary = val
    } else {
      secondarySum += val
    }
  }
  const archetypeRaw = primary + secondarySum * 0.25
  const archetypeScore = maxAffinity > 0 ? archetypeRaw / maxAffinity : 0

  const ageHours = Math.max(0, (now - new Date(dream.created_at).getTime()) / 3600000)
  const recencyScore = 1 / (1 + ageHours / 48) // ~48 saatte yarıya iner

  const engagementRaw = (dream.likes_count || 0) + 2 * (dream.comments_count || 0)
  const popularityScore = Math.min(1, Math.log10(1 + engagementRaw) / 3) // ~1000 etkileşimde tavan

  return W_ARCHETYPE * archetypeScore + W_RECENCY * recencyScore + W_POPULARITY * popularityScore
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { page = '0', rankToken, asOf, includeNoImage } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 0, 0)
    const from = pageNum * BATCH_SIZE
    const to = from + BATCH_SIZE - 1
    const wantsNoImage = includeNoImage === '1' || includeNoImage === 'true'

    // asOf: istemcinin ilk sayfada sabitlediği "şu an" anı. Sonraki tüm
    // sayfalarda aynı değer gönderilir ki scroll sürerken araya yeni rüya
    // girmesi sayfalar arasında kayma/tekrar yaratmasın.
    const asOfDate = asOf && !Number.isNaN(Date.parse(asOf)) ? asOf : null

    let authedUser = null
    if (req.headers.authorization) {
      authedUser = await getAuthedUser(req)
    }

    // Havuzun ötesi: kişiselleştirme maliyetine gerek yok, düz kronolojik
    // devam havuzla tam sınırda hizalanıyor (havuz zaten en yeni
    // RANK_POOL_SIZE kaydı kapsıyor), o yüzden çakışma/atlama olmaz.
    // ÖNEMLİ: supabaseAdmin RLS'i bypass eder. Orijinal kod anon client
    // kullanıyordu ve gizlilik filtrelemesini (private/friends rüyaları
    // gizleme) RLS policy'sine bırakıyordu — burada admin client'a geçince
    // bunu koda taşımak ZORUNLU, yoksa global ızgara herkesin private/friends
    // rüyalarını sızdırır. dreams tablosunun RLS'i bu konuşmada incelenmedi;
    // public-profile/[userId].js'deki gibi güvenli tarafta kalıp yalnızca
    // 'public' gösteriyoruz. Gerçek RLS kuralların 'friends' rüyaları da
    // Explore'da gösteriyorsa bu satırı ona göre genişletebilirsin.
    if (from >= RANK_POOL_SIZE) {
      let tailQuery = supabaseAdmin
        .from('dreams')
        .select('*')
        .eq('in_feed', true)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(from, to)
      if (asOfDate) tailQuery = tailQuery.lte('created_at', asOfDate)
      tailQuery = applyImageQualityFilter(tailQuery, wantsNoImage)

      const { data, error } = await tailQuery
      if (error) throw error

      const fetched = (data || []).filter(passesImageQuality)
      return res.status(200).json({
        dreams: fetched,
        page: pageNum,
        hasMore: fetched.length === BATCH_SIZE,
        rankToken: rankToken || null,
      })
    }

    let affinity = {}
    if (authedUser) {
      if (pageNum > 0 && rankToken) {
        // İlk sayfada hesaplanan profili tekrar kullan — her scroll adımında
        // likes/comments sorgusu tekrarlamaya gerek yok, havuz zaten ucuz.
        affinity = decodeRankToken(rankToken) || {}
      } else {
        affinity = await computeArchetypeAffinity(authedUser.id)
      }
    }
    const maxAffinity = Object.values(affinity).reduce((m, v) => Math.max(m, v), 0)

    let poolQuery = supabaseAdmin
      .from('dreams')
      .select('*')
      .eq('in_feed', true)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(RANK_POOL_SIZE)
    if (asOfDate) poolQuery = poolQuery.lte('created_at', asOfDate)
    poolQuery = applyImageQualityFilter(poolQuery, wantsNoImage)

    const { data: pool, error: poolError } = await poolQuery
    if (poolError) throw poolError

    const now = Date.now()
    const ranked = (pool || [])
      .filter(passesImageQuality)
      .map((dream) => ({ dream, score: scoreDream(dream, affinity, maxAffinity, now) }))
      .sort((a, b) => b.score - a.score || new Date(b.dream.created_at) - new Date(a.dream.created_at))
      .map((entry) => entry.dream)

    const pageSlice = ranked.slice(from, to + 1)
    const hasMore = to + 1 < ranked.length || ranked.length === RANK_POOL_SIZE

    return res.status(200).json({
      dreams: pageSlice,
      page: pageNum,
      hasMore,
      rankToken: authedUser ? encodeRankToken(affinity) : null,
    })
  } catch (error) {
    console.error('explore/feed error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
