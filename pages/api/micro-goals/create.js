import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const MAX_TITLE_LENGTH = 200
const MAX_ITEMS_PER_GOAL = 30

function normalizeText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.length ? trimmed : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, title } = req.body || {}
    const cleanTitle = normalizeText(title)
    if (!goalId || !cleanTitle) return res.status(400).json({ error: 'invalid_params' })
    if (cleanTitle.length > MAX_TITLE_LENGTH) {
      return res.status(413).json({ error: 'title_too_long', max: MAX_TITLE_LENGTH })
    }

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const { count } = await supabaseAdmin
      .from('micro_goals')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goalId)

    if ((count || 0) >= MAX_ITEMS_PER_GOAL) {
      return res.status(400).json({ error: 'too_many_items', max: MAX_ITEMS_PER_GOAL })
    }

    const { data: microGoal, error: insertError } = await supabaseAdmin
      .from('micro_goals')
      .insert({ goal_id: goalId, title: cleanTitle, order_index: count || 0 })
      .select('*')
      .single()

    if (insertError) throw insertError

    return res.status(200).json({ microGoal })
  } catch (error) {
    console.error('micro-goals/create error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
