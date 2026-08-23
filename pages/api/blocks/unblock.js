// pages/api/blocks/unblock.js
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { blockedUserId } = req.body || {}
  if (!blockedUserId) return res.status(400).json({ error: 'invalid_params' })

  try {
    const { error } = await supabaseAdmin
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId)

    if (error) throw error
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('blocks/unblock error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
