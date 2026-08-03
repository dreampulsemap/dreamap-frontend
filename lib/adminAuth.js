// Basit, tek-kullanıcılı admin koruması: Authorization: Bearer <ADMIN_TOKEN>
// header'ı env var'daki değere eşleşiyorsa istek admin sayılır.
// pages/api/reanalyze-dreams.js'deki ADMIN_REANALYZE_TOKEN deseniyle aynı
// mantık — /api/admin/* altındaki tüm route'lar tek yerden bunu kullanır.
//
// Bilinçli olarak Supabase session/role tabanlı değil: bu panel sadece
// senin (uygulama sahibi) kullanacağı bir "arka ofis" aracı, kullanıcı
// hesaplarıyla hiç ilişkisi yok. Vercel'e (ve varsa .env.local'e)
// ADMIN_TOKEN=... eklemen yeterli. bkz. MIGRATION_NOTES_admin_dream_gift.md
export function isAdminRequest(req) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN
  if (!ADMIN_TOKEN) return false

  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  return !!bearerToken && bearerToken === String(ADMIN_TOKEN).trim()
}

// API route'larının en başında çağır; false dönerse 401'i zaten yazdı,
// handler'ın geri kalanını atlayıp hemen return et.
export function requireAdmin(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}
