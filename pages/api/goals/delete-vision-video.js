import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Kullanıcının vizyon videosunu kaldırır. Yeniden düzenleme zaten
// save-vision-video ile üzerine yazıyor — bu route sadece "videoyu tamamen
// kaldır, eski slayt gösterisine dön" akışı için.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'invalid_params' })

    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, vision_video_url')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({ vision_video_url: null, vision_video_updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Storage'daki dosyayı da sessizce silmeyi dene — başarısız olsa da
    // isteği başarısız saymıyoruz (video zaten hedeften kaldırıldı).
    try {
      const bucketPrefix = '/storage/v1/object/public/goal-videos/'
      const idx = (goal.vision_video_url || '').indexOf(bucketPrefix)
      if (idx !== -1) {
        const path = goal.vision_video_url.slice(idx + bucketPrefix.length)
        await supabaseAdmin.storage.from('goal-videos').remove([path])
      }
    } catch (storageErr) {
      console.error('goals/delete-vision-video storage cleanup error:', storageErr)
    }

    return res.status(200).json({ goal: updatedGoal })
  } catch (error) {
    console.error('goals/delete-vision-video error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
