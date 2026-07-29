import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { cachePixabayImage } from '@/lib/pixabayCache'

// Kullanıcı Pixabay'den bir görsel seçtiğinde, indirip kendi storage/DB'mize
// kaydeder (bkz. lib/pixabayCache.js) ve elde edilen kalıcı URL'i
// goals.gallery_image_urls'e ekler.

const MAX_GALLERY_IMAGES = 20

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, pixabayId, imageUrl, tags, pixabayUser, width, height } = req.body || {}
    if (!goalId || !pixabayId || typeof imageUrl !== 'string' || !imageUrl.trim()) {
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
    if (existing.length >= MAX_GALLERY_IMAGES) {
      return res.status(400).json({ error: 'gallery_limit_reached', max: MAX_GALLERY_IMAGES })
    }

    const { storedUrl, error: cacheError } = await cachePixabayImage({ pixabayId, imageUrl, tags, pixabayUser, width, height })
    if (!storedUrl) return res.status(500).json({ error: cacheError || 'cache_failed' })

    if (existing.includes(storedUrl)) {
      return res.status(200).json({ goal, gallery_image_urls: existing })
    }

    const updated = [...existing, storedUrl]
    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({ gallery_image_urls: updated })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ goal: updatedGoal, gallery_image_urls: updated })
  } catch (error) {
    console.error('goals/add-image-from-pixabay error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
