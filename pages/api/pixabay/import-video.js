import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { cachePixabayVideo } from '@/lib/pixabayCache'
import { getPremiumVideoStatus } from '@/lib/premiumVideoStatus'

// import-image.js'in video karşılığı — bir goal'a bağlı olmadan (Vizyon
// Slaytları editöründe video seçimi için) Pixabay videosunu indirip kendi
// storage'ımıza kaydeder ve kalıcı URL'i döner. Galeriye eklemek gibi bir
// yan etkisi yok — slaytı oluşturmak /api/goals/slides/create'in işi.
//
// add-video-from-pixabay.js'ten farkı: goalId/gallery_image_urls'e
// dokunmuyor. AMA aynı kısıtlı kaynağı (haftalık ücretsiz video hakkı ya da
// premium sınırsız erişim) paylaştığı için erişim kontrolü ve hak düşürme
// mantığı BİREBİR aynı — aksi halde slayt editöründen bu kontrolü atlayıp
// sınırsız video alınabilirdi.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { pixabayId, videoUrl, tags, pixabayUser, width, height } = req.body || {}
  if (!pixabayId || typeof videoUrl !== 'string' || !videoUrl.trim()) {
    return res.status(400).json({ error: 'invalid_params' })
  }

  try {
    const premiumStatus = await getPremiumVideoStatus(user.id)
    if (!premiumStatus.canPickVideo) {
      return res.status(403).json({
        error: 'weekly_video_limit_reached',
        nextAvailableAt: premiumStatus.nextAvailableAt,
      })
    }

    const { storedUrl, error } = await cachePixabayVideo({ pixabayId, videoUrl, tags, pixabayUser, width, height })
    if (!storedUrl) return res.status(500).json({ error: error || 'cache_failed' })

    // Ücretsiz kullanıcı ise haftalık hakkını harcamış olur (premium ise dokunmuyoruz)
    if (!premiumStatus.isPremium) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ last_pixabay_video_pick_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    return res.status(200).json({ url: storedUrl, isPremiumMember: premiumStatus.isPremium })
  } catch (error) {
    console.error('pixabay/import-video error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
