import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Vizyona kullanıcının kendi cihazından istediği kadar görsel eklemesine
// izin veriyoruz. Görsel Supabase Storage'a istemci tarafında (uploadImage
// içinde) yükleniyor; bu endpoint sadece elde edilen public URL'i
// goals.gallery_image_urls (jsonb dizi) alanına ekliyor. Bkz.
// MIGRATION_NOTES.md — bu kolonun ve 'goal-images' bucket'ının oluşturulması
// gerekiyor.

const MAX_GALLERY_IMAGES = 20

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, imageUrl } = req.body || {}
    if (!goalId || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, gallery_image_urls')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const existing = Array.isArray(goal.gallery_image_urls) ? goal.gallery_image_urls : []
    if (existing.includes(imageUrl)) {
      return res.status(200).json({ gallery_image_urls: existing })
    }
    if (existing.length >= MAX_GALLERY_IMAGES) {
      return res.status(400).json({ error: 'gallery_limit_reached', max: MAX_GALLERY_IMAGES })
    }

    const updated = [...existing, imageUrl]

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({ gallery_image_urls: updated })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ goal: updatedGoal, gallery_image_urls: updated })
  } catch (error) {
    console.error('goals/add-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
