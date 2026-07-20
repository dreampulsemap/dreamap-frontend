import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { data: referrals, error } = await supabaseAdmin
      .from('referrals')
      .select('id, invited_user_id, reward_granted, reward_amount, created_at')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const totalInvited = (referrals || []).length
    const totalCreditsEarned = (referrals || [])
      .filter((r) => r.reward_granted)
      .reduce((sum, r) => sum + (r.reward_amount || 0), 0)

    return res.status(200).json({
      referralCode: user.id, // davet linki: /auth?ref=<user.id>
      totalInvited,
      totalCreditsEarned,
      referrals: referrals || [],
    })
  } catch (error) {
    console.error('referrals/stats error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
