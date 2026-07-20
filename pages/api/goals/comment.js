import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

const MAX_COMMENT_LENGTH = 1000

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { goalId } = req.query
      if (!goalId) return res.status(400).json({ error: 'goalId_required' })

      // Bu route service-role client kullanıyor (RLS bypass edilir) — bu yüzden
      // görünürlük kontrolünü burada elle yapmak zorundayız, aksi halde
      // private/friends-only bir hedefin yorumları herkese açık sızardı.
      const viewer = await getAuthedUser(req)
      const { allowed, goal } = await canViewGoal(goalId, viewer?.id)
      if (!goal) return res.status(404).json({ error: 'goal_not_found' })
      if (!allowed) return res.status(403).json({ error: 'not_visible' })

      const { data, error } = await supabaseAdmin
        .from('goal_comments')
        .select('*, user_profiles(id, username, display_name, avatar_url)')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return res.status(200).json({ comments: data || [] })
    }

    if (req.method === 'POST') {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { goalId, content } = req.body || {}
      const cleanContent = typeof content === 'string' ? content.trim() : ''
      if (!goalId || !cleanContent) return res.status(400).json({ error: 'invalid_params' })
      if (cleanContent.length > MAX_COMMENT_LENGTH) {
        return res.status(413).json({ error: 'comment_too_long', max: MAX_COMMENT_LENGTH })
      }

      const { allowed, goal } = await canViewGoal(goalId, user.id)
      if (!goal) return res.status(404).json({ error: 'goal_not_found' })
      if (!allowed) return res.status(403).json({ error: 'not_visible' })

      const { data, error } = await supabaseAdmin
        .from('goal_comments')
        .insert({ user_id: user.id, goal_id: goalId, content: cleanContent })
        .select('*, user_profiles(id, username, display_name, avatar_url)')
        .single()

      if (error) throw error
      // Trigger (handle_goal_comment_change) goals.comments_count'u zaten güncelledi
      return res.status(200).json({ comment: data })
    }

    if (req.method === 'DELETE') {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { commentId } = req.body || {}
      if (!commentId) return res.status(400).json({ error: 'commentId_required' })

      const { error } = await supabaseAdmin
        .from('goal_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id) // yalnızca kendi yorumunu silebilir

      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (error) {
    console.error('goals/comment error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
