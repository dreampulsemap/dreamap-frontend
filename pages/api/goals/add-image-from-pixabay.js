import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Kullanıcı Pixabay'den bir görsel seçtiğinde:
//   1) image_library tablosunda bu görsel daha önce indirilmiş mi diye bakar
//      (aynı Pixabay görseli birden fazla kullanıcı seçerse tekrar indirmeyiz)
//   2) Yoksa Pixabay'den indirir, kendi 'image-library' storage bucket'ımıza
//      yükler ve etiketleriyle birlikte image_library'ye kaydeder
//   3) Elde edilen kalıcı URL'i goals.gallery_image_urls'e ekler
// Bkz. MIGRATION_NOTES_pixabay.md — image_library tablosu ve
// 'image-library' bucket'ının oluşturulması gerekiyor.

const MAX_GALLERY_IMAGES = 20
const LIBRARY_BUCKET = 'image-library'

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

    let storedUrl = null

    // 1) Kendi kütüphanemizde bu Pixabay görseli daha önce indirilmiş mi?
    const { data: cached } = await supabaseAdmin
      .from('image_library')
      .select('id, stored_url, downloads_count')
      .eq('source', 'pixabay')
      .eq('source_id', String(pixabayId))
      .maybeSingle()

    if (cached?.stored_url) {
      storedUrl = cached.stored_url
      await supabaseAdmin
        .from('image_library')
        .update({ downloads_count: (cached.downloads_count || 0) + 1 })
        .eq('id', cached.id)
    } else {
      // 2) Yoksa Pixabay'den indir ve kendi storage'ımıza yükle.
      // Not: Bu indirme yalnızca kullanıcı görseli bilinçli olarak SEÇTİĞİNDE
      // tetiklenir (toplu/otomatik kazıma değil) — Pixabay içerik lisansı
      // görsellerin ücretsiz kullanımına ve indirilmesine izin verir.
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) return res.status(502).json({ error: 'pixabay_download_failed' })

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.includes('png') ? 'png' : 'jpg'
      const arrayBuffer = await imgRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'image_too_large' })
      }

      const filePath = `pixabay/${pixabayId}.${ext}`
      const { error: uploadError } = await supabaseAdmin.storage
        .from(LIBRARY_BUCKET)
        .upload(filePath, buffer, { contentType, upsert: true })
      if (uploadError) return res.status(500).json({ error: uploadError.message || 'upload_error' })

      const { data: publicData } = supabaseAdmin.storage.from(LIBRARY_BUCKET).getPublicUrl(filePath)
      storedUrl = publicData?.publicUrl
      if (!storedUrl) return res.status(500).json({ error: 'public_url_failed' })

      const cleanTags = Array.isArray(tags) ? tags.slice(0, 20).map((t) => String(t).slice(0, 40)) : []

      const { error: libError } = await supabaseAdmin.from('image_library').upsert(
        {
          source: 'pixabay',
          source_id: String(pixabayId),
          tags: cleanTags,
          original_url: imageUrl,
          stored_url: storedUrl,
          width: width || null,
          height: height || null,
          pixabay_user: pixabayUser || null,
          downloads_count: 1,
        },
        { onConflict: 'source,source_id' }
      )
      if (libError) console.error('image_library upsert error:', libError)
    }

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
