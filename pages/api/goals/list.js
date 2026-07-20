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
        const { data: friendship } = await supabaseAdmin
          .from('friendships')
          .select('status')
          .or(`and(user_id.eq.${authedUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${authedUser.id})`)
          .eq('status', 'accepted')
          .maybeSingle()
        if (friendship) visibleStatuses.push('friends')
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
