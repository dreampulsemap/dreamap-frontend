import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { getPremiumVideoStatus } from '@/lib/premiumVideoStatus'

// Akış add-image-from-pixabay.js ile aynı, iki fark var:
//  1) Gerçek erişim kontrolü burada yapılıyor: premium değilse ve haftalık
//     hakkını kullanmışsa 403 döner (UI'daki kilit sadece kullanıcı deneyimi
//     içindir, asıl güvenlik kontrolü sunucu tarafında).
//  2) Ücretsiz kullanıcı başarıyla bir video eklediğinde
//     user_profiles.last_pixabay_video_pick_at güncellenir.

const MAX_GALLERY_IMAGES = 20
const LIBRARY_BUCKET = 'image-library'

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

    let storedUrl = null

    const { data: cached } = await supabaseAdmin
      .from('image_library')
      .select('id, stored_url, downloads_count')
      .eq('source', 'pixabay')
      .eq('media_type', 'video')
      .eq('source_id', String(pixabayId))
      .maybeSingle()

    if (cached?.stored_url) {
      storedUrl = cached.stored_url
      await supabaseAdmin
        .from('image_library')
        .update({ downloads_count: (cached.downloads_count || 0) + 1 })
        .eq('id', cached.id)
    } else {
      const videoRes = await fetch(videoUrl)
      if (!videoRes.ok) return res.status(502).json({ error: 'pixabay_download_failed' })

      const arrayBuffer = await videoRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Videolar görsellerden çok daha büyük olabiliyor — storage maliyetini
      // kontrol altında tutmak için 60MB üstünü reddediyoruz (Pixabay 'small'
      // kalite zaten genelde bunun çok altında kalıyor).
      if (buffer.length > 60 * 1024 * 1024) {
        return res.status(400).json({ error: 'video_too_large' })
      }

      const filePath = `pixabay-video/${pixabayId}.mp4`
      const { error: uploadError } = await supabaseAdmin.storage
        .from(LIBRARY_BUCKET)
        .upload(filePath, buffer, { contentType: 'video/mp4', upsert: true })
      if (uploadError) return res.status(500).json({ error: uploadError.message || 'upload_error' })

      const { data: publicData } = supabaseAdmin.storage.from(LIBRARY_BUCKET).getPublicUrl(filePath)
      storedUrl = publicData?.publicUrl
      if (!storedUrl) return res.status(500).json({ error: 'public_url_failed' })

      const cleanTags = Array.isArray(tags) ? tags.slice(0, 20).map((t) => String(t).slice(0, 40)) : []

      const { error: libError } = await supabaseAdmin.from('image_library').upsert(
        {
          source: 'pixabay',
          media_type: 'video',
          source_id: String(pixabayId),
          tags: cleanTags,
          original_url: videoUrl,
          stored_url: storedUrl,
          width: width || null,
          height: height || null,
          pixabay_user: pixabayUser || null,
          downloads_count: 1,
        },
        { onConflict: 'source,media_type,source_id' }
      )
      if (libError) console.error('image_library video upsert error:', libError)
    }

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
