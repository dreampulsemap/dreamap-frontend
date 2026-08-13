import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GÜVENLİK DÜZELTMESİ: bu route daha önce sahiplik kontrolünü body'den
  // gelen userId'ye göre yapıyordu — Authorization header hiç
  // doğrulanmıyordu, yani dreamId + gerçek sahibin userId'sini bilen
  // HERKES o rüyayı düzenleyebiliyordu. Artık kimlik Bearer token'dan
  // (getAuthedUser) doğrulanıyor, body'deki userId artık kullanılmıyor.
  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { dreamId, content, location_name, visibility, map_detail, in_feed, tags, ai_image_url, image_source, image_width, image_height, goalId } = req.body

  if (!dreamId) {
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

  try {
    const { data: dream, error: fetchError } = await supabaseAdmin
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single()

    if (fetchError || !dream) {
      return res.status(404).json({ error: 'Rüya bulunamadı' })
    }

    if (dream.user_id !== user.id) {
      return res.status(403).json({ error: 'Bu rüyayı düzenleme yetkiniz yok' })
    }

    // diary/create.js ile aynı desen: bir hedefe bağlanıyorsa gerçekten
    // kendi hedefi olduğunu doğrula — başkasının vizyonuna sessizce rüya
    // iliştirilmesin. goalId === null ise bağlantıyı kaldırma isteğidir,
    // doğrulama gerekmez.
    if (goalId) {
      const { data: goal } = await supabaseAdmin.from('goals').select('id, user_id').eq('id', goalId).maybeSingle()
      if (!goal || goal.user_id !== user.id) return res.status(403).json({ error: 'goal_not_owned' })
    }

    const updates = {}
    if (content !== undefined) updates.content = content
    if (location_name !== undefined) updates.location_name = location_name
    if (visibility !== undefined) updates.visibility = visibility
    if (map_detail !== undefined) updates.map_detail = map_detail
    if (in_feed !== undefined) updates.in_feed = in_feed
    if (cleanTags !== undefined) updates.tags = cleanTags
    if (goalId !== undefined) updates.goal_id = goalId || null
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

    const { error } = await supabaseAdmin
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
