import { getAuthedUser } from '@/lib/supabaseAdmin'
import { cachePixabayImage } from '@/lib/pixabayCache'

// Rüya için Pixabay'den seçilen görseli indirip kalıcı depoya (image-library
// bucket + image_library tablosu — goals akışıyla AYNI önbellek) kaydeder ve
// kalıcı URL'i döner. Kasıtlı olarak dreamId İSTEMİYOR: rüya oluşturma
// formunda, rüya henüz DB'de yokken de görsel seçilebilsin diye — submit
// sırasında dönen URL doğrudan dreams.ai_image_url'e yazılıyor. Düzenleme
// akışında da aynı endpoint kullanılır, sadece dönen URL update-dream'e geçilir.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { pixabayId, imageUrl, tags, pixabayUser, width, height } = req.body || {}
    if (!pixabayId || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const { storedUrl, error } = await cachePixabayImage({ pixabayId, imageUrl, tags, pixabayUser, width, height })
    if (!storedUrl) return res.status(500).json({ error: error || 'cache_failed' })

    return res.status(200).json({
      url: storedUrl,
      width: width || null,
      height: height || null,
    })
  } catch (error) {
    console.error('dreams/pixabay-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
