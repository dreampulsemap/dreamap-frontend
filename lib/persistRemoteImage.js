import { supabaseAdmin } from '@/lib/supabaseAdmin'

// KÖK NEDEN (bkz. "bazı görseller kırık" hata raporu): AI görsel üretimi
// (Replicate flux-schnell ve OpenAI DALL-E 3) sonucunda dönen URL'ler
// SAĞLAYICIYA AİT GEÇİCİ URL'lerdir — replicate.delivery çıktıları ve
// DALL-E'nin Azure blob URL'leri belirli bir süre sonra (DALL-E ~1 saat,
// Replicate saatler/günler mertebesinde) erişilemez hale gelir. Önceden bu
// URL'ler doğrudan `ai_image_url` / `cover_image_url` kolonlarına
// kaydediliyordu; bu yüzden yeni üretilen görseller güzel görünürken eski
// rüyalar/hedefler zamanla "kırık görsel" hâline geliyordu.
//
// Instagram gibi uygulamalar hiçbir zaman üçüncü taraf bir URL'e link
// vermez — yüklenen/üretilen her görseli indirip kendi kalıcı
// depolamasına (CDN) kopyalar. Burada da aynı deseni uyguluyoruz: kullanıcı
// yüklemeleri zaten `supabase.storage` (avatars/goal-covers/goal-images)
// kullanıyordu, AI üretimi bunu atlıyordu — bu fonksiyon o eksikliği kapatır.
//
// Yükleme herhangi bir nedenle başarısız olursa (örn. bucket henüz Supabase
// Dashboard'dan oluşturulmadıysa) orijinal geçici URL'e sessizce geri
// döneriz — analiz/üretim akışı asla bu adım yüzünden kırılmaz, görsel
// sadece bir süre sonra kırılabilir (mevcut davranışla aynı, en kötü hâliyle).
export async function persistRemoteImage(tempUrl, { bucket, path, contentType = 'image/jpeg' }) {
  if (!tempUrl) return tempUrl

  try {
    const response = await fetch(tempUrl)
    if (!response.ok) {
      throw new Error(`Geçici görsel indirilemedi: HTTP ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        cacheControl: '31536000', // 1 yıl — kalıcı görsel, agresif cache güvenli
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || tempUrl
  } catch (err) {
    console.error('persistRemoteImage başarısız, geçici URL kullanılacak:', err.message)
    return tempUrl
  }
}
