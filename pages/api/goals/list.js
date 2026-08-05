import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const BATCH_SIZE = 15
const VALID_STATUS = ['active', 'completed', 'abandoned']

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { mode = 'feed', status, userId, page = '0' } = req.query
    const pageNum = Math.max(parseInt(page, 10) || 0, 0)
    const from = pageNum * BATCH_SIZE
    const to = from + BATCH_SIZE - 1

    // 'own' modu giriş ZORUNLU kılar; diğer modlarda giriş OPSİYONEL —
    // ama giriş yapılmışsa "bu hedefe zaten mana verdim mi" bilgisini de
    // ekleyebilmek için token varsa yine de çözmeye çalışıyoruz.
    let authedUser = null
    if (mode === 'own') {
      authedUser = await getAuthedUser(req)
      if (!authedUser) return res.status(401).json({ error: 'unauthorized' })
    } else if (req.headers.authorization) {
      authedUser = await getAuthedUser(req)
    }

    let query = supabaseAdmin
      .from('goals')
      .select('*, micro_goals(id, title, is_completed, order_index)')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (mode === 'own') {
      // Kendi hedeflerin (Profil > Vision Board sekmesi)
      query = query.eq('user_id', authedUser.id)
    } else if (mode === 'user' && userId) {
      // Başka bir kullanıcının hedefleri (profil ziyareti): herkese açık olanlar
      // + görüntüleyen kişi kabul edilmiş arkadaşsa 'friends' görünürlüğündekiler de
      let visibleStatuses = ['public']
      if (authedUser && authedUser.id !== userId) {
        // DÜZELTME: .maybeSingle() burada karşılıklı takipleşme durumunda
        // (iki yön de 'accepted') 2 satır dönüp hata fırlatıyordu; hata
        // yakalanmadığı için 'friends' görünürlüğü sessizce hiç eklenmiyordu
        // — yani en yaygın senaryoda (iki herkese-açık profil birbirini
        // takip ettiğinde) arkadaşa-özel hedefler görünmez oluyordu.
        const { data: friendships } = await supabaseAdmin
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${authedUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${authedUser.id})`)
          .eq('status', 'accepted')
          .limit(1)
        if (friendships && friendships.length > 0) visibleStatuses.push('friends')
      } else if (authedUser && authedUser.id === userId) {
        // Kendi profilini "user" modunda görüntülüyorsan hepsini göster
        visibleStatuses = ['public', 'friends', 'private']
      }
      query = query.eq('user_id', userId).in('visibility', visibleStatuses)
    } else {
      // Genel keşfet akışı: yalnızca herkese açık hedefler
      query = query.eq('visibility', 'public')
    }

    if (VALID_STATUS.includes(status)) {
      query = query.eq('status', status)
    }

    // VisionVideoPlayer'ın kaydırarak sıradaki vizyona geçme kuyruğu için:
    // yalnızca vision_video_url dolu olan hedefler. Var olan hiçbir çağrıyı
    // etkilemiyor — parametre verilmediğinde davranış aynen eskisi gibi.
    if (req.query.hasVideo === '1' || req.query.hasVideo === 'true') {
      query = query.not('vision_video_url', 'is', null)
    }

    const { data, error } = await query
    if (error) throw error

    let goals = data || []

    // Giriş yapmış kullanıcı için: bu sayfadaki hedeflerden hangilerine
    // zaten mana verdiğini tek sorguda çekip her hedefe işliyoruz.
    if (authedUser && goals.length > 0) {
      const goalIds = goals.map((g) => g.id)
      const { data: reactions } = await supabaseAdmin
        .from('goal_reactions')
        .select('goal_id')
        .eq('sender_id', authedUser.id)
        .in('goal_id', goalIds)

      const reactedSet = new Set((reactions || []).map((r) => r.goal_id))
      goals = goals.map((g) => ({ ...g, has_reacted: reactedSet.has(g.id) }))
    } else {
      goals = goals.map((g) => ({ ...g, has_reacted: false }))
    }

    // "Kaydet" butonunun ilk açılışta doğru durumda görünmesi için —
    // has_reacted ile birebir aynı desen.
    if (authedUser && goals.length > 0) {
      const goalIds = goals.map((g) => g.id)
      const { data: saves } = await supabaseAdmin
        .from('goal_saves')
        .select('goal_id')
        .eq('user_id', authedUser.id)
        .in('goal_id', goalIds)

      const savedSet = new Set((saves || []).map((s) => s.goal_id))
      goals = goals.map((g) => ({ ...g, has_saved: savedSet.has(g.id) }))
    } else {
      goals = goals.map((g) => ({ ...g, has_saved: false }))
    }

    // Explore'da "Vizyon Slaytları" rozeti için: bu sayfadaki hedeflerden
    // hangilerinin en az bir slaytı var, tek sorguda çekip sayıyoruz
    // (has_reacted ile aynı desen — count(*) group by yerine ham satırları
    // çekip JS'te sayıyoruz, sayfa başına en fazla 15 hedef olduğu için ucuz).
    if (goals.length > 0) {
      const goalIds = goals.map((g) => g.id)
      const { data: slideRows } = await supabaseAdmin
        .from('goal_slides')
        .select('goal_id')
        .in('goal_id', goalIds)

      const slideCounts = {}
      for (const row of slideRows || []) {
        slideCounts[row.goal_id] = (slideCounts[row.goal_id] || 0) + 1
      }
      goals = goals.map((g) => ({ ...g, slide_count: slideCounts[g.id] || 0 }))
    }

    // Reels görünümünde sahibin profil çipini (avatar + isim) göstermek için
    // — aynı toplu-sorgu deseni, sayfa başına en fazla 15 hedef olduğu için ucuz.
    if (goals.length > 0) {
      const ownerIds = [...new Set(goals.map((g) => g.user_id))]
      const { data: owners } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ownerIds)

      const ownerMap = {}
      for (const o of owners || []) ownerMap[o.id] = o
      goals = goals.map((g) => ({ ...g, owner: ownerMap[g.user_id] || null }))
    }

    return res.status(200).json({
      goals,
      page: pageNum,
      hasMore: (data || []).length === BATCH_SIZE,
    })
  } catch (error) {
    console.error('goals/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
