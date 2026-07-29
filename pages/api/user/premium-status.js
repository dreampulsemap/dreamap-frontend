import { getAuthedUser } from '@/lib/supabaseAdmin'
import { getPremiumVideoStatus } from '@/lib/premiumVideoStatus'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  try {
    const status = await getPremiumVideoStatus(user.id)
    return res.status(200).json(status)
  } catch (error) {
    console.error('user/premium-status error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
