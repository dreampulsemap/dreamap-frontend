import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { isPersistedImageUrl } from '@/lib/imageUrlUtils'
import { generateOneImage } from '@/lib/goalImageGen'

// KÖK NEDEN (bkz. lib/persistRemoteImage.js'deki not + reanalyze-dreams.js):
// Bazı rüya görselleri hiç kalıcı depoya kopyalanmadan doğrudan sağlayıcının
// CANLI/GEÇİCİ URL'i olarak kaydedildi (özellikle image.pollinations.ai —
// her istekte YENİDEN render eden bir servis, statik bir dosya değil). Kesif
// gibi bir ızgarada aynı anda 15-20 tanesi paralel istenince sağlayıcı
// zaman aşımına uğrayıp bazılarını kırık döndürüyor, ama tek bir rüyayı
// DreamCard'da açtığında (tek istek, rekabet yok) aynı URL genelde sorunsuz
// yükleniyor — "gridde kırık, tıklayınca sağlam" raporunun sebebi bu.
//
// Bu fonksiyon üç kademeli bir onarım uygular ve SONUCU HER ZAMAN kalıcı
// depoya yazar — asla canlı/geçici bir URL'i tekrar DB'ye kaydetmez (aksi
// halde onarımın kendisi aynı hatayı yeniden üretir).
const MAX_REPAIR_ATTEMPTS = 5
// DÜZELTME (Vercel prod logları, en sık tekrarlayan hata — 58 kez):
// gerçek Supabase Storage bucket'ı alt çizgili "dream_images" (bkz.
// generate-dream-image.js'de Temmuz'da düzeltilen aynı yazım hatası ve
// storage.buckets tablosu) — burada tireli "dream-images" kalmıştı, bu
// yüzden /api/cron/repair-broken-images ve /api/dreams/report-broken-image
// üzerinden gelen HER onarım "Bucket not found" ile sessizce başarısız
// oluyor, persistRemoteImage geçici URL'e geri dönüyor, repairDreamImage
// bunu kalıcı sayılmadığı için hata olarak işaretleyip attempt sayısını
// tüketiyordu — yani onarım cron'u aylardır hiçbir görseli gerçekten
// onaramıyordu.
const DREAM_IMAGE_BUCKET = 'dream_images'

function buildFallbackPrompt(dream) {
  if (dream.ai_image_prompt) return dream.ai_image_prompt
  const archetype = Array.isArray(dream.ai_archetypes) && dream.ai_archetypes[0]
    ? dream.ai_archetypes[0]
    : 'Dream'
  const shortContent = String(dream.content || '').replace(/\s+/g, ' ').trim().slice(0, 200)
  return [
    `${archetype} archetype`,
    'surreal dreamscape',
    'jungian symbolism',
    'cinematic lighting',
    'mystical visual language',
    shortContent,
  ].join(', ')
}

async function markStatus(dreamId, fields) {
  await supabaseAdmin
    .from('dreams')
    .update({ image_checked_at: new Date().toISOString(), ...fields })
    .eq('id', dreamId)
}

// dream: en az { id, content, ai_image_url, ai_image_prompt, ai_archetypes, image_repair_attempts } içermeli
export async function repairDreamImage(dream) {
  const attempts = dream.image_repair_attempts || 0
  if (attempts >= MAX_REPAIR_ATTEMPTS) {
    await markStatus(dream.id, { image_status: 'broken' })
    return { dreamId: dream.id, result: 'gave_up', imageUrl: null }
  }

  // 1) Zaten kalıcı depodaysa muhtemelen geçici bir ağ/CDN hatasıydı — sadece doğrula.
  if (isPersistedImageUrl(dream.ai_image_url)) {
    try {
      const head = await fetch(dream.ai_image_url, { method: 'HEAD' })
      if (head.ok) {
        await markStatus(dream.id, { image_status: 'ok' })
        return { dreamId: dream.id, result: 'already_ok', imageUrl: dream.ai_image_url }
      }
    } catch {
      // düşüp aşağıdaki yeniden üretim adımına geçiyoruz
    }
  } else if (dream.ai_image_url) {
    // 2) Geçici bir sağlayıcı URL'i var — önce onu kalıcı depoya taşımayı dene
    //    (hâlâ canlıysa, yeniden üretmekten çok daha ucuz).
    const persisted = await persistRemoteImage(dream.ai_image_url, {
      bucket: DREAM_IMAGE_BUCKET,
      path: `repaired/${dream.id}-${Date.now()}.jpg`,
    })
    if (isPersistedImageUrl(persisted)) {
      await supabaseAdmin
        .from('dreams')
        .update({
          ai_image_url: persisted,
          image_status: 'ok',
          image_checked_at: new Date().toISOString(),
        })
        .eq('id', dream.id)
      return { dreamId: dream.id, result: 'persisted_existing', imageUrl: persisted }
    }
  }

  // 3) URL yok ya da indirilemedi: Replicate (flux-schnell) ile yeniden üret,
  //    sonucu DOĞRUDAN kalıcı depoya yükle — geçici replicate.delivery linkini
  //    asla DB'ye yazma. Pollinations'tan vazgeçildi: 2026-10 itibarıyla
  //    anahtarsız istekler ilkinden sonra HTTP 402 dönüyor, cron günde 12
  //    rüyanın yalnızca 1'ini onarabiliyordu.
  try {
    const prompt = buildFallbackPrompt(dream)
    const { imageUrl: freshUrl, details } = await generateOneImage(prompt, { aspectRatio: '1:1', allowFallback: false })
    if (!freshUrl) throw new Error(details || 'generate_failed')

    const persisted = await persistRemoteImage(freshUrl, {
      bucket: DREAM_IMAGE_BUCKET,
      path: `repaired/${dream.id}-${Date.now()}.jpg`,
    })

    if (!isPersistedImageUrl(persisted)) {
      throw new Error('persist_after_regenerate_failed')
    }

    await supabaseAdmin
      .from('dreams')
      .update({
        ai_image_url: persisted,
        ai_image_prompt: prompt,
        image_source: 'ai',
        image_status: 'ok',
        image_checked_at: new Date().toISOString(),
        image_repair_attempts: attempts + 1,
      })
      .eq('id', dream.id)

    return { dreamId: dream.id, result: 'regenerated', imageUrl: persisted }
  } catch (err) {
    const nextAttempts = attempts + 1
    await markStatus(dream.id, {
      image_status: nextAttempts >= MAX_REPAIR_ATTEMPTS ? 'broken' : 'needs_persist',
      image_repair_attempts: nextAttempts,
    })
    return { dreamId: dream.id, result: 'failed', error: err.message, imageUrl: null }
  }
}
