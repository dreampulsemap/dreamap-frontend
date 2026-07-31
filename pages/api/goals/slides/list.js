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

    // Reels tarzı üst bilgi çubuğu için hedef sahibinin profili — SlidesViewer
    // ayrıca bir istek atmasın diye burada birlikte dönüyoruz.
    const { data: owner } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', goal.user_id)
      .maybeSingle()

    let savedSlideIds = []
    if (user && slides?.length) {
      const { data: saves } = await supabaseAdmin
        .from('goal_slide_saves')
        .select('goal_slide_id')
        .eq('user_id', user.id)
        .in('goal_slide_id', slides.map((s) => s.id))
      savedSlideIds = (saves || []).map((s) => s.goal_slide_id)
    }

    const enrichedSlides = (slides || []).map((s) => ({ ...s, has_saved: savedSlideIds.includes(s.id) }))

    return res.status(200).json({ slides: enrichedSlides, owner })
  } catch (error) {
    console.error('goals/slides/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}

