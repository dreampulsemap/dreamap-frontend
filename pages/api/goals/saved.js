import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const PAGE_SIZE = 24

// Profildeki "Kaydedilenler" sekmesinin veri kaynağı — yalnızca kendi
// hesabın, Instagram'daki gibi başkasının kaydettikleri görünmez (bu yüzden
// bu uç her zaman auth zorunlu, userId parametresi almıyor).
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const page = Math.max(0, parseInt(req.query.page, 10) || 0)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data: saves, error: savesError, count } = await supabaseAdmin
      .from('goal_saves')
      .select('goal_id, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (savesError) throw savesError

    const goalIds = (saves || []).map((s) => s.goal_id)
    if (goalIds.length === 0) {
      return res.status(200).json({ goals: [], page, hasMore: false, total: count || 0 })
    }

    const { data: goals, error: goalsError } = await supabaseAdmin
      .from('goals')
      .select('*')
      .in('id', goalIds)
    if (goalsError) throw goalsError

    const ownerIds = [...new Set((goals || []).map((g) => g.user_id).filter(Boolean))]
    let ownerById = {}
    if (ownerIds.length > 0) {
      const { data: owners } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ownerIds)
      ownerById = Object.fromEntries((owners || []).map((o) => [o.id, o]))
    }

    let reactedSet = new Set()
    const { data: reactions } = await supabaseAdmin
      .from('goal_reactions')
      .select('goal_id')
      .eq('user_id', user.id)
      .in('goal_id', goalIds)
    reactedSet = new Set((reactions || []).map((r) => r.goal_id))

    // Kayıt sırasını koru (en son kaydedilen önce) — goals sorgusu id
    // sırasına göre değil, goal_saves'ten gelen sıraya göre diziliyor.
    const goalById = Object.fromEntries((goals || []).map((g) => [g.id, g]))
    const enriched = goalIds
      .map((id) => goalById[id])
      .filter(Boolean)
      .map((g) => ({
        ...g,
        owner: ownerById[g.user_id] || null,
        has_reacted: reactedSet.has(g.id),
        has_saved: true,
      }))

    return res.status(200).json({
      goals: enriched,
      page,
      hasMore: to + 1 < (count || 0),
      total: count || 0,
    })
  } catch (error) {
    console.error('goals/saved error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
