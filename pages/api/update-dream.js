import { supabaseAdmin, getAuthedUser, clampVisibilityToProfile } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { isPersistedImageUrl } from '@/lib/imageUrlUtils'

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
    // 013 migration: profil gizliliği "friends"/"private" ise DB trigger'ı
    // zaten aynı kısıtlamayı uygular; API'de de uyguluyoruz ki bu isteğe
    // verilen 200 yanıtı gerçek/nihai değeri yansıtsın.
    if (visibility !== undefined) updates.visibility = await clampVisibilityToProfile(user.id, visibility)
    if (map_detail !== undefined) updates.map_detail = map_detail
    if (in_feed !== undefined) updates.in_feed = in_feed
    if (cleanTags !== undefined) updates.tags = cleanTags
    if (goalId !== undefined) updates.goal_id = goalId || null
    if (ai_image_url !== undefined) {
      // GÜVENLİK AĞI: bu endpoint önceden "gönderen taraf zaten Pixabay
      // cache'ini kullanmıştır" varsayımıyla ai_image_url'i doğrudan
      // yazıyordu. dreams tablosu client-side doğrudan insert'e de açık
      // olduğundan (bkz. submit-dream.js notu) bu varsayım Android gibi
      // Next.js API'sini atlayan yazarlar için hiç geçerli değildi — çıplak
      // Pixabay linkleri birkaç gün içinde ölüyordu. Artık kalıcı değilse
      // (supabase.co değilse) burada, DB'ye yazmadan önce indirip
      // image-library bucket'ına kaydediyoruz.
      let finalUrl = ai_image_url
      if (finalUrl && !isPersistedImageUrl(finalUrl)) {
        finalUrl = await persistRemoteImage(finalUrl, {
          bucket: 'image-library',
          path: `pixabay/legacy-dream-${dreamId}-${Date.now()}.jpg`,
        })
      }
      const stillTemp = finalUrl && !isPersistedImageUrl(finalUrl)

      updates.ai_image_url = finalUrl
      updates.image_source = finalUrl ? (image_source || 'pixabay') : null
      updates.image_width = finalUrl ? (image_width || null) : null
      updates.image_height = finalUrl ? (image_height || null) : null
      // persistRemoteImage indiremezse (link zaten ölmüş) sessizce orijinal
      // URL'e döner — bu durumda 'ok' DEMİYORUZ, cron onu tekrar denesin/pes
      // etsin diye 'needs_persist' işaretliyoruz.
      updates.image_status = stillTemp ? 'needs_persist' : 'ok'
      updates.image_checked_at = stillTemp ? null : new Date().toISOString()
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
