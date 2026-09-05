import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { isPersistedImageUrl } from '@/lib/imageUrlUtils'

// KÖK NEDEN (bkz. 2026-09-05 "Pixabay kapakları kayboluyor" incelemesi):
// Bazı vizyon kapakları ve galeri görselleri hiç kalıcı depoya kopyalanmadan
// doğrudan Pixabay'in ÇIPLAK /get/... linkiyle kaydedildi. Bu linkler
// Pixabay tarafında birkaç gün içinde kalıcı olarak geçersiz hale geliyor
// (repairDreamImage.js'deki pollinations senaryosundan farklı olarak, süresi
// dolunca YENİDEN de üretilemiyor — Pixabay aynı görseli aynı linkle tekrar
// vermiyor). Bu yüzden burada dreams'teki gibi bir "sağlayıcıdan yeniden
// üret" adımı YOK: kapak zaten kalıcıysa dokunma, geçiciyse taşımayı dene,
// olmazsa (varsa) kalıcı bir galeri görselini kapak olarak öne çıkar, o da
// yoksa pes edip 'broken' işaretle — otomatik AI kapak üretimi Aura kredisi
// harcadığından burada tetiklenmiyor, kullanıcı isterse GoalDetailModal'dan
// kendi seçer.
//
// Kaynak fark etmeksizin çalışır (web API, Android'in doğrudan Supabase
// insert'i, admin panel) çünkü flag_goal_image_for_persist trigger'ı
// (migration: goals_image_repair_columns_and_trigger) DB seviyesinde
// çalışıyor — bu fonksiyon sadece o trigger'ın işaretlediği satırları temizler.
const MAX_REPAIR_ATTEMPTS = 5
const GOAL_IMAGE_BUCKET = 'image-library'

async function markStatus(goalId, fields) {
  await supabaseAdmin
    .from('goals')
    .update({ image_checked_at: new Date().toISOString(), ...fields })
    .eq('id', goalId)
}

// goal: en az { id, cover_image_url, gallery_image_urls, image_repair_attempts } içermeli
export async function repairGoalImage(goal) {
  const attempts = goal.image_repair_attempts || 0
  if (attempts >= MAX_REPAIR_ATTEMPTS) {
    await markStatus(goal.id, { image_status: 'broken' })
    return { goalId: goal.id, result: 'gave_up' }
  }

  const galleryUrls = Array.isArray(goal.gallery_image_urls) ? goal.gallery_image_urls : []
  let coverUrl = goal.cover_image_url
  let coverFailed = false

  // 1) Kapak zaten kalıcıysa dokunma.
  if (coverUrl && !isPersistedImageUrl(coverUrl)) {
    const persisted = await persistRemoteImage(coverUrl, {
      bucket: GOAL_IMAGE_BUCKET,
      path: `pixabay/legacy-goal-${goal.id}-${Date.now()}.jpg`,
    })
    if (isPersistedImageUrl(persisted)) {
      coverUrl = persisted
    } else {
      coverFailed = true
    }
  }

  // 2) Galerideki geçici linkleri taşı (kapaktan bağımsız olarak).
  let galleryChanged = false
  let galleryAllOk = true
  const newGallery = []
  for (const url of galleryUrls) {
    if (isPersistedImageUrl(url)) {
      newGallery.push(url)
      continue
    }
    const persisted = await persistRemoteImage(url, {
      bucket: GOAL_IMAGE_BUCKET,
      path: `pixabay/legacy-goal-${goal.id}-${Date.now()}-${newGallery.length}.jpg`,
    })
    if (isPersistedImageUrl(persisted)) {
      newGallery.push(persisted)
      galleryChanged = true
    } else {
      newGallery.push(url)
      galleryAllOk = false
    }
  }

  // 3) Kapak hâlâ kalıcı değilse, galeride (artık taşınmış olabilecek) kalıcı
  //    bir görsel varsa onu kapak yap — hiç kapaksız kalmaktan iyidir.
  if (coverFailed) {
    const fallback = newGallery.find((u) => isPersistedImageUrl(u))
    if (fallback) {
      coverUrl = fallback
      coverFailed = false
    }
  }

  const update = {}
  if (coverUrl !== goal.cover_image_url) update.cover_image_url = coverUrl
  if (galleryChanged) update.gallery_image_urls = newGallery

  const stillBroken = coverFailed || !galleryAllOk
  if (stillBroken) {
    const nextAttempts = attempts + 1
    update.image_status = nextAttempts >= MAX_REPAIR_ATTEMPTS ? 'broken' : 'needs_persist'
    update.image_repair_attempts = nextAttempts
  } else {
    update.image_status = 'ok'
  }
  update.image_checked_at = new Date().toISOString()

  await supabaseAdmin.from('goals').update(update).eq('id', goal.id)

  return {
    goalId: goal.id,
    result: stillBroken ? 'partial_or_failed' : 'fixed',
    coverUrl: update.cover_image_url ?? goal.cover_image_url,
  }
}
