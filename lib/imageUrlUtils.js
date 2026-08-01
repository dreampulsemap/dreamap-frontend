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

// next.config.js'nin images.domains / images.remotePatterns listesiyle
// senkron tutulmalı. next/image <Image/>, burada olmayan bir host'u
// optimize edemez ve component'i hatalandırır (onError'a düşer). Pinterest
// gibi kaynaklar (kullanıcının astığı rastgele dış URL'ler) sabit bir
// domain'e whitelist edilemeyecek kadar çeşitli olduğundan next/image
// yerine düz <img> kullanılmalı — bkz. GoalCard.jsx'teki mevcut desen
// (MANIFEST.md, madde 7: "GoalCard kapak (Pinterest hariç)"). Bu fonksiyon
// aynı kontrolü, kaynağı 'pinterest' olarak etiketlenmemiş olsa bile
// (ör. VisionFeedCard.jsx'teki galeri görselleri) genel olarak yapar.
const NEXT_IMAGE_EXACT_HOSTS = ['image.pollinations.ai', 'replicate.delivery']
const NEXT_IMAGE_HOST_SUFFIXES = ['.supabase.co', '.blob.core.windows.net']

export function isNextImageHost(url) {
  if (!url) return false
  try {
    const { hostname } = new URL(url)
    return (
      NEXT_IMAGE_EXACT_HOSTS.includes(hostname) ||
      NEXT_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    )
  } catch {
    return false
  }
}
