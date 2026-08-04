import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Ana sayfa akışı: rüyalar ve vizyonlar TEK bir kronolojik listede birleşir
// (varsayılan "Tümü" modu), ya da ?type=dreams / ?type=visions ile tek türe
// daraltılabilir (bkz. pages/index.js'teki üst segment kontrolü).
//
// İKİ AYRI İMLEÇ: iki farklı tabloyu birleştirip tek bir sayfalama imleciyle
// yönetmeye çalışmak "açlık" (starvation) sorununa yol açar — ör. bir gün
// içinde 50 rüya ama 2 vizyon paylaşılmışsa, tek bir global imleç vizyonları
// sayfalar boyunca hiç göstermeyebilir. Bunun yerine HER tür kendi
// created_at imlecinden bağımsız sayfalanır (dreamsBefore / visionsBefore),
// her istekte her iki türden de sabit boyutlu bir parti çekilip birleştirilip
// tarihe göre sıralanır. Bu yüzden bir sayfa bazen PER_SOURCE_BATCH*2'den az
// öğe döndürebilir (bir tür tükenmiş olabilir) — infinite-scroll için normal.
const PER_SOURCE_BATCH = 6

async function loadFriendIds(userId) {
  try {
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    const friendIds = (friendships || []).map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
    return [userId, ...friendIds]
  } catch (err) {
    console.error('home-feed loadFriendIds error:', err)
    return [userId]
  }
}

async function fetchDreams({ userId, allowedUserIds, before }) {
  let query = supabaseAdmin
    .from('dreams')
    .select('*')
    .eq('in_feed', true)
    .order('created_at', { ascending: false })
    .limit(PER_SOURCE_BATCH)

  // Aynı görsel kalitesi mantığı Explore ile tutarlı: sadece onarım
  // denemeleri tükenip kesin "broken" işaretlenmiş görselleri gizle —
  // 'needs_persist' (henüz kalıcı depoya taşınmadı ama muhtemelen hâlâ
  // çalışıyor) gizlenmiyor (bkz. explore/feed.js'deki aynı düzeltme notu).
  query = query.neq('image_status', 'broken')

  if (allowedUserIds) query = query.in('user_id', allowedUserIds)
  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((d) => ({ ...d, feed_type: 'dream' }))
}

async function fetchVisions({ userId, allowedUserIds, before }) {
  let query = supabaseAdmin
    .from('goals')
    .select('*, micro_goals(id, title, is_completed, order_index)')
    .order('created_at', { ascending: false })
    .limit(PER_SOURCE_BATCH)

  if (allowedUserIds && allowedUserIds.length > 1) {
    // Giriş yapmış kullanıcı: kendi hedefleri (her görünürlük) + arkadaşların
    // herkese-açık/arkadaşa-özel hedefleri.
    query = query.or(
      `user_id.eq.${userId},and(user_id.in.(${allowedUserIds.filter((id) => id !== userId).join(',')}),visibility.in.(public,friends))`
    )
  } else if (userId) {
    query = query.or(`user_id.eq.${userId},visibility.eq.public`)
  } else {
    query = query.eq('visibility', 'public')
  }

  if (before) query = query.lt('created_at', before)

  const { data, error } = await query
  if (error) throw error
  let visions = (data || []).map((g) => ({ ...g, feed_type: 'vision' }))

  // KÖK NEDEN DÜZELTMESİ: pages/api/goals/list.js'teki aynı toplu-sorgu
  // deseni burada eksikti — bu yüzden ana sayfadaki Reels beslemesinde
  // sahip adı her zaman "Bilinmeyen/Unknown"a düşüyordu VE slide_count
  // hiç set edilmediği için VisionReelsFeed'de tıklama hiçbir zaman
  // slayt oynatıcıyı açmıyordu (koşul hep false'a düşüyordu).
  if (visions.length > 0) {
    const goalIds = visions.map((g) => g.id)
    const ownerIds = [...new Set(visions.map((g) => g.user_id))]
    const [{ data: slideRows }, { data: owners }] = await Promise.all([
      supabaseAdmin.from('goal_slides').select('goal_id').in('goal_id', goalIds),
      supabaseAdmin.from('user_profiles').select('id, username, display_name, avatar_url').in('id', ownerIds),
    ])

    const slideCounts = {}
    for (const row of slideRows || []) slideCounts[row.goal_id] = (slideCounts[row.goal_id] || 0) + 1

    const ownerMap = {}
    for (const o of owners || []) ownerMap[o.id] = o

    visions = visions.map((g) => ({ ...g, slide_count: slideCounts[g.id] || 0, owner: ownerMap[g.user_id] || null }))
  }

  // VisionVideoPlayer/SlidesViewer'daki "Kaydet" butonunun ilk açılışta
  // doğru durumda (dolu/boş bookmark) görünmesi için — has_reacted ile
  // aynı desen (bkz. goals/list.js), sayfa başına en fazla PER_SOURCE_BATCH
  // öğe olduğu için ucuz tek sorgu.
  if (userId && visions.length > 0) {
    const goalIds = visions.map((g) => g.id)
    const { data: saves } = await supabaseAdmin
      .from('goal_saves')
      .select('goal_id')
      .eq('user_id', userId)
      .in('goal_id', goalIds)
    const savedSet = new Set((saves || []).map((s) => s.goal_id))
    visions = visions.map((g) => ({ ...g, has_saved: savedSet.has(g.id) }))
  } else {
    visions = visions.map((g) => ({ ...g, has_saved: false }))
  }

  return visions
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { type = 'all', dreamsBefore, visionsBefore } = req.query
    const authedUser = req.headers.authorization ? await getAuthedUser(req) : null
    const allowedUserIds = authedUser ? await loadFriendIds(authedUser.id) : null

    let dreams = []
    let visions = []

    if (type === 'all' || type === 'dreams') {
      dreams = await fetchDreams({ userId: authedUser?.id, allowedUserIds, before: dreamsBefore })
    }
    if (type === 'all' || type === 'visions') {
      visions = await fetchVisions({ userId: authedUser?.id, allowedUserIds, before: visionsBefore })
    }

    const items = [...dreams, ...visions].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    const nextDreamsBefore = dreams.length === PER_SOURCE_BATCH ? dreams[dreams.length - 1].created_at : null
    const nextVisionsBefore = visions.length === PER_SOURCE_BATCH ? visions[visions.length - 1].created_at : null

    return res.status(200).json({
      items,
      nextDreamsBefore,
      nextVisionsBefore,
      hasMore: !!(nextDreamsBefore || nextVisionsBefore),
    })
  } catch (error) {
    console.error('home-feed error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
