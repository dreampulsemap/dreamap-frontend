import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { microGoalId } = req.body || {}
    if (!microGoalId) return res.status(400).json({ error: 'microGoalId_required' })

    // Sahiplik kontrolü join üzerinden: micro_goals -> goals.user_id
    const { data: microGoal, error: fetchError } = await supabaseAdmin
      .from('micro_goals')
      .select('id, is_completed, goal_id, goals!inner(user_id)')
      .eq('id', microGoalId)
      .single()

    if (fetchError || !microGoal) return res.status(404).json({ error: 'micro_goal_not_found' })
    if (microGoal.goals.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const nextCompleted = !microGoal.is_completed

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('micro_goals')
      .update({
        is_completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      })
      .eq('id', microGoalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Trigger (recalc_goal_completion) goals.completion_percentage'i zaten
    // güncelledi — güncel değeri döndürmek için hedefi tekrar okuyoruz.
    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('id, completion_percentage')
      .eq('id', microGoal.goal_id)
      .single()

    return res.status(200).json({ microGoal: updated, goal })
  } catch (error) {
    console.error('micro-goals/toggle error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
