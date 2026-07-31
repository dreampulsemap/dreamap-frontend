import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

// Reels'teki "Kaydet" butonu — bir slaytı kullanıcının kendi kaydettikleri
// listesine ekler/çıkarır. saves_count trigger ile otomatik güncelleniyor
// (bkz. migration: handle_goal_slide_save_change).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { slideId } = req.body || {}
    if (!slideId) return res.status(400).json({ error: 'invalid_params' })

    const { data: slide, error: fetchError } = await supabaseAdmin
      .from('goal_slides')
      .select('id, goal_id')
      .eq('id', slideId)
      .single()
    if (fetchError || !slide) return res.status(404).json({ error: 'slide_not_found' })

    const { allowed } = await canViewGoal(slide.goal_id, user.id)
    if (!allowed) return res.status(403).json({ error: 'not_visible' })

    const { data: existing } = await supabaseAdmin
      .from('goal_slide_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('goal_slide_id', slideId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin.from('goal_slide_saves').delete().eq('id', existing.id)
      if (error) throw error
      return res.status(200).json({ saved: false })
    }

    const { error } = await supabaseAdmin.from('goal_slide_saves').insert({ user_id: user.id, goal_slide_id: slideId })
    if (error) throw error
    return res.status(200).json({ saved: true })
  } catch (error) {
    console.error('goals/slides/save error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
