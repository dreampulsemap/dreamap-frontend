import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const MAX_STORY_LENGTH = 2000

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

    const { goalId, status, story } = req.body || {}

    if (!goalId || !['completed', 'abandoned'].includes(status)) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const cleanStory = normalizeText(story)
    if (cleanStory && cleanStory.length > MAX_STORY_LENGTH) {
      return res.status(413).json({ error: 'story_too_long', max: MAX_STORY_LENGTH })
    }

    // Sahiplik kontrolü — RLS zaten engeller ama net bir hata mesajı için önce kontrol ediyoruz
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, status')
      .eq('id', goalId)
      .single()

    if (fetchError || !existing) return res.status(404).json({ error: 'goal_not_found' })
    if (existing.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })
    if (existing.status !== 'active') {
      return res.status(400).json({ error: 'goal_already_resolved', current_status: existing.status })
    }

    const updates = { status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.victory_story = cleanStory
    } else {
      updates.abandoned_at = new Date().toISOString()
      updates.abandon_reason = cleanStory
    }

    const { data: goal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update(updates)
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ goal })
  } catch (error) {
    console.error('goals/update-status error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
