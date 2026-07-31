// Bir görsel URL'inin bizim kalıcı Supabase Storage'ımızda mı yoksa bir
// sağlayıcının (Pollinations/Replicate/DALL-E) geçici/canlı linkinde mi
// olduğunu ayırt eder. persistRemoteImage.js, repairDreamImage.js,
// explore/feed.js (kalite filtresi) ve deep-analysis akışları bunu kullanır
// — tek bir yerden tanımlı olsun diye.
export function isPersistedImageUrl(url) {
  if (!url) return false
  try {
    return new URL(url).hostname.endsWith('.supabase.co')
  } catch {
    return false
  }
}
