// Rehber sayfasında (/ruya-tabirleri/*, /dream-meanings/*) ziyaretçinin
// yazdığı rüya, kayıt/giriş sonrasına taşınır: önce burada saklanır,
// giriş tamamlanınca /add-dream açılır ve metin kutuya hazır gelir.
// Sunucuya hiçbir şey gönderilmez; yalnızca bu tarayıcının localStorage'ı.

export const PENDING_DREAM_KEY = 'lunosfer_pending_dream'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function savePendingDream({ content, source, lang }) {
  try {
    window.localStorage.setItem(
      PENDING_DREAM_KEY,
      JSON.stringify({ content: String(content).slice(0, 5000), source: source || null, lang: lang || null, ts: Date.now() })
    )
    return true
  } catch (_) {
    return false
  }
}

export function readPendingDream() {
  try {
    const raw = window.localStorage.getItem(PENDING_DREAM_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.content || Date.now() - (data.ts || 0) > MAX_AGE_MS) {
      window.localStorage.removeItem(PENDING_DREAM_KEY)
      return null
    }
    return data
  } catch (_) {
    return null
  }
}

export function clearPendingDream() {
  try {
    window.localStorage.removeItem(PENDING_DREAM_KEY)
  } catch (_) {}
}

// Giriş/kayıt sonrası nereye gidilecek: bekleyen rüya varsa yazma ekranına.
export function postAuthPath(fallback = '/profile') {
  return readPendingDream() ? '/add-dream' : fallback
}

// supabase-js oturumu localStorage'da "sb-<proje>-auth-token" anahtarında
// tutuyor. Rehber sayfasına Supabase istemcisini yüklememek için yalnızca
// anahtarın varlığına bakılıyor; yanılırsa /add-dream zaten /auth'a atar.
export function looksSignedIn() {
  try {
    return Object.keys(window.localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
  } catch (_) {
    return false
  }
}
