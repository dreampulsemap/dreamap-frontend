import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

// Slaytların görünürlüğü tamamen ait olduğu goal'den miras alınır (public/
// friends/private) — bkz. canViewGoal (goals_select_visible RLS ile aynı
// mantık, admin client RLS'i bypass ettiği için burada tekrarlanıyor).

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { goalId } = req.query
    if (!goalId) return res.status(400).json({ error: 'invalid_params' })

    const user = await getAuthedUser(req)
    const { allowed, goal } = await canViewGoal(goalId, user?.id || null)
    if (!goal) return res.status(404).json({ error: 'goal_not_found' })
    if (!allowed) return res.status(403).json({ error: 'not_visible' })

    const { data: slides, error } = await supabaseAdmin
      .from('goal_slides')
      .select('*')
      .eq('goal_id', goalId)
      .order('order_index', { ascending: true })

    if (error) throw error

    return res.status(200).json({ slides: slides || [] })
  } catch (error) {
    console.error('goals/slides/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
