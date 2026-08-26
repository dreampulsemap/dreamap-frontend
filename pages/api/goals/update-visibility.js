import { supabaseAdmin, getAuthedUser, clampVisibilityToProfile } from '@/lib/supabaseAdmin'

// update-status.js ile birebir aynı desen. Bu endpoint önceden hiç
// yoktu — Android tarafında GoalDetailScreen bir vizyonun gizliliğini
// oluşturulduktan sonra hiç değiştiremiyordu, bu route onu tamamlıyor.
const VALID_VISIBILITY = ['public', 'friends', 'private']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, visibility } = req.body || {}

    if (!goalId || !VALID_VISIBILITY.includes(visibility)) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    // Sahiplik kontrolü — RLS zaten engeller ama net bir hata mesajı için önce kontrol ediyoruz
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .single()

    if (fetchError || !existing) return res.status(404).json({ error: 'goal_not_found' })
    if (existing.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    // Profil gizliliğine göre kısıtla (013 migration'daki DB trigger'ıyla
    // aynı kural — burada da tekrarlıyoruz ki istemci net bir sonuç görsün;
    // trigger zaten nihai güvence olarak devrede kalıyor).
    const resolvedVisibility = await clampVisibilityToProfile(user.id, visibility)

    const { data: goal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({ visibility: resolvedVisibility })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ goal })
  } catch (error) {
    console.error('goals/update-visibility error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
