import { getAuthedUser, supabaseAdmin } from '@/lib/supabaseAdmin'
import { getPremiumVideoStatus } from '@/lib/premiumVideoStatus'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  try {
    const status = await getPremiumVideoStatus(user.id)

    // Mobil "Buy Aura" ekranı gerçek bakiyeyi gösterebilsin diye eklendi —
    // getPremiumVideoStatus'a dokunmadık (web tarafında başka çağıranları
    // da var), bakiyeyi burada ayrıca okuyup response'a ekliyoruz.
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('premium_analysis_auras')
      .eq('id', user.id)
      .maybeSingle()

    return res.status(200).json({
      ...status,
      auraBalance: Number(profile?.premium_analysis_auras || 0),
    })
  } catch (error) {
    console.error('user/premium-status error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
