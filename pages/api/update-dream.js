import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, userId, content, location_name, visibility, map_detail, in_feed, tags, ai_image_url, image_source, image_width, image_height } = req.body

  if (!dreamId || !userId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  // Etiketler: en fazla 10, boş/uzun/tekrarlı olanlar temizlenir
  // (dreams_tags_max10 CHECK constraint'i de aynısını DB tarafında zorluyor).
  let cleanTags
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'tags_must_be_array' })
    }
    cleanTags = [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
      .slice(0, 10)
      .map((t) => t.slice(0, 30))
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Service role key eksik' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const { data: dream, error: fetchError } = await supabase
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single()

    if (fetchError || !dream) {
      return res.status(404).json({ error: 'Rüya bulunamadı' })
    }

    if (dream.user_id !== userId) {
      return res.status(403).json({ error: 'Bu rüyayı düzenleme yetkiniz yok' })
    }

    const updates = {}
    if (content !== undefined) updates.content = content
    if (location_name !== undefined) updates.location_name = location_name
    if (visibility !== undefined) updates.visibility = visibility
    if (map_detail !== undefined) updates.map_detail = map_detail
    if (in_feed !== undefined) updates.in_feed = in_feed
    if (cleanTags !== undefined) updates.tags = cleanTags
    if (ai_image_url !== undefined) {
      updates.ai_image_url = ai_image_url
      updates.image_source = ai_image_url ? (image_source || 'pixabay') : null
      updates.image_width = ai_image_url ? (image_width || null) : null
      updates.image_height = ai_image_url ? (image_height || null) : null
      // Kullanıcı elle yeni bir görsel seçti/kaldırdı — sağlık durumunu
      // sıfırla. Yeni URL zaten kalıcı (Pixabay import her zaman
      // image-library bucket'ına indirip kaydeder), bu yüzden doğrudan 'ok';
      // görsel tamamen kaldırıldıysa da 'ok' (Explore filtresi zaten
      // ai_image_url IS NOT NULL şartını ayrıca arıyor).
      updates.image_status = 'ok'
      updates.image_checked_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
