import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { data, error } = await supabaseAdmin
      .rpc('get_profile_stats', { p_user_id: user.id })
      .single()

    if (error) throw error

    return res.status(200).json({
      totalEngagement: Number(data.total_engagement) || 0,
      totalComments: Number(data.total_comments) || 0,
      friendsCount: Number(data.friends_count) || 0,
    })
  } catch (error) {
    console.error('profile-stats error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
