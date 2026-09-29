// Basit, tek-kullanıcılı admin koruması: admin_token HttpOnly cookie'si
// env var'daki değere eşleşiyorsa istek admin sayılır. Cookie
// pages/api/admin/login.js tarafından yazılır (bkz. AdminAuthGate.jsx).
// Önceden Authorization: Bearer header'ı + localStorage kullanılıyordu —
// bu, token'ı tarayıcı JS'ine (ve dolayısıyla XSS'e) açık bırakıyordu.
// HttpOnly cookie buna kapalı.
//
// Bilinçli olarak Supabase session/role tabanlı değil: bu panel sadece
// senin (uygulama sahibi) kullanacağı bir "arka ofis" aracı, kullanıcı
// hesaplarıyla hiç ilişkisi yok. Coolify'a (ve varsa .env.local'e)
// ADMIN_TOKEN=... eklemen yeterli. bkz. MIGRATION_NOTES_admin_dream_gift.md
export function isAdminRequest(req) {
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN
  if (!ADMIN_TOKEN) return false

  const cookieToken = req.cookies?.admin_token
  return !!cookieToken && cookieToken === String(ADMIN_TOKEN).trim()
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
