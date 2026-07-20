import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'goalId_required' })

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .single()

    if (fetchError || !existing) return res.status(404).json({ error: 'goal_not_found' })
    if (existing.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    // micro_goals / daily_seeds / goal_reactions / goal_comments FK'lerinde
    // "on delete cascade" tanımlı — tek silme yeterli.
    const { error: deleteError } = await supabaseAdmin.from('goals').delete().eq('id', goalId)
    if (deleteError) throw deleteError

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('goals/delete error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
