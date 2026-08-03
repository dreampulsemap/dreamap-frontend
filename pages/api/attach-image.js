import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'
import { cachePixabayImage } from '@/lib/pixabayCache'
import { notifyDreamImageGift } from '@/lib/adminDreamGift'

// PixabayPicker'da admin bir görsele elle tıkladığında çağrılır — akış,
// CreateGoalModal.handleCoverPixabayPick ile aynı: indir/önbelleğe al,
// sonra bu SPESİFİK rüyaya yaz. Ek olarak (goal kapağından farklı olarak)
// rüya sahibine "hediye" bildirimi de gönderiyor.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  const { dreamId, hit, notify = true } = req.body || {}
  if (!dreamId || !hit?.id || typeof hit?.largeImageURL !== 'string' || !hit.largeImageURL.trim()) {
    return res.status(400).json({ error: 'invalid_params' })
  }

  try {
    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, original_language')
      .eq('id', dreamId)
      .maybeSingle()
    if (dreamError) throw dreamError
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })

    const { storedUrl, error: cacheError } = await cachePixabayImage({
      pixabayId: hit.id,
      imageUrl: hit.largeImageURL,
      tags: hit.tags,
      pixabayUser: hit.user,
      width: hit.width,
      height: hit.height,
    })
    if (!storedUrl) return res.status(500).json({ error: cacheError || 'cache_failed' })

    const { error: updateError } = await supabaseAdmin
      .from('dreams')
      .update({
        ai_image_url: storedUrl,
        image_source: 'pixabay',
        image_width: hit.width || null,
        image_height: hit.height || null,
        image_status: 'ok',
        image_checked_at: new Date().toISOString(),
      })
      .eq('id', dreamId)
    if (updateError) throw updateError

    if (notify && dream.user_id) {
      await notifyDreamImageGift(supabaseAdmin, { userId: dream.user_id, dreamId, lang: dream.original_language })
    }

    return res.status(200).json({ ok: true, url: storedUrl })
  } catch (error) {
    console.error('admin/dreams/attach-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
