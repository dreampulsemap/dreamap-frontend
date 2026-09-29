// AdminAuthGate token'ı doğrular ve HttpOnly cookie olarak yazar — token artık
// tarayıcı JS'inin (dolayısıyla XSS'in) erişebileceği localStorage/sessionStorage'da
// tutulmuyor. bkz. lib/adminAuth.js
const COOKIE_NAME = 'admin_token'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const ADMIN_TOKEN = process.env.ADMIN_TOKEN
  const token = req.body?.token

  if (!ADMIN_TOKEN || !token || String(token).trim() !== String(ADMIN_TOKEN).trim()) {
    return res.status(401).json({ error: 'invalid_token' })
  }

  const isProd = process.env.NODE_ENV === 'production'
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${String(token).trim()}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${isProd ? '; Secure' : ''}`
  )
  return res.status(200).json({ ok: true })
}
