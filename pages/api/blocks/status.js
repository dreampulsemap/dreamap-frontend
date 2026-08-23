// pages/api/blocks/status.js
// GET /api/blocks/status?targetUserId=... — bir profili/sohbeti açarken
// "Engelle" mi "Engeli Kaldır" mı gösterileceğine, ve mesaj gönderiminin
// engellenip engellenmediğine karar vermek için kullanılır.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { targetUserId } = req.query
  if (!targetUserId) return res.status(400).json({ error: 'invalid_params' })

  try {
    const { data, error } = await supabaseAdmin
      .from('user_blocks')
      .select('blocker_id, blocked_id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`
      )

    if (error) throw error

    const blockedByMe = (data || []).some((r) => r.blocker_id === user.id)
    const blockedMe = (data || []).some((r) => r.blocker_id === targetUserId)

    return res.status(200).json({ blockedByMe, blockedMe })
  } catch (error) {
    console.error('blocks/status error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
