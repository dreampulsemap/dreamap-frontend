import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { cachePixabayVideo } from '@/lib/pixabayCache'
import { getPremiumVideoStatus } from '@/lib/premiumVideoStatus'

// Aynı akış add-image-from-pixabay.js ile aynı, iki fark var:
//  1) Gerçek erişim kontrolü burada yapılıyor: premium değilse ve haftalık
//     hakkını kullanmışsa 403 döner (UI'daki kilit sadece kullanıcı deneyimi
//     içindir, asıl güvenlik kontrolü sunucu tarafında).
//  2) Ücretsiz kullanıcı başarıyla bir video eklediğinde
//     user_profiles.last_pixabay_video_pick_at güncellenir.

const MAX_GALLERY_IMAGES = 20

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, pixabayId, videoUrl, tags, pixabayUser, width, height } = req.body || {}
    if (!goalId || !pixabayId || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const premiumStatus = await getPremiumVideoStatus(user.id)
    if (!premiumStatus.canPickVideo) {
      return res.status(403).json({ error: 'weekly_video_limit_reached', nextAvailableAt: premiumStatus.nextAvailableAt })
    }

    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, gallery_image_urls')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const existing = Array.isArray(goal.gallery_image_urls) ? goal.gallery_image_urls : []
    if (existing.length >= MAX_GALLERY_IMAGES) {
      return res.status(400).json({ error: 'gallery_limit_reached', max: MAX_GALLERY_IMAGES })
    }

    const { storedUrl, error: cacheError } = await cachePixabayVideo({ pixabayId, videoUrl, tags, pixabayUser, width, height })
    if (!storedUrl) return res.status(500).json({ error: cacheError || 'cache_failed' })

    let updated = existing
    if (!existing.includes(storedUrl)) {
      updated = [...existing, storedUrl]
      const { error: updateError } = await supabaseAdmin
        .from('goals')
        .update({ gallery_image_urls: updated })
        .eq('id', goalId)
      if (updateError) throw updateError
    }

    // Ücretsiz kullanıcı ise haftalık hakkını harcamış olur (premium ise dokunmuyoruz)
    if (!premiumStatus.isPremium) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ last_pixabay_video_pick_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    const { data: updatedGoal } = await supabaseAdmin.from('goals').select('*').eq('id', goalId).single()

    return res.status(200).json({ goal: updatedGoal, gallery_image_urls: updated })
  } catch (error) {
    console.error('goals/add-video-from-pixabay error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
