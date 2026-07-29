import { getAuthedUser } from '@/lib/supabaseAdmin'
import { cachePixabayImage } from '@/lib/pixabayCache'

// Bir goal'a bağlı olmadan (henüz hedef oluşturulmamışken kapak fotoğrafı
// seçimi, ya da slayt editöründe herhangi bir görsel seçimi için) Pixabay
// görselini indirip kendi storage'ımıza kaydeder ve kalıcı URL'i döner.
// Galeriye eklemek gibi bir yan etkisi yok — o iş add-image-from-pixabay'de.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { pixabayId, imageUrl, tags, pixabayUser, width, height } = req.body || {}
  if (!pixabayId || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return res.status(400).json({ error: 'invalid_params' })
  }

  try {
    const { storedUrl, error } = await cachePixabayImage({ pixabayId, imageUrl, tags, pixabayUser, width, height })
    if (!storedUrl) return res.status(500).json({ error: error || 'cache_failed' })
    return res.status(200).json({ url: storedUrl })
  } catch (error) {
    console.error('pixabay/import-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
