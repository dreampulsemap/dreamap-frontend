// Backend'den (API route) tetiklenen ANAHTAR retention/aktivasyon
// olayları için — sunucu tarafı olaylar client-side ad-blocker'lardan
// etkilenmez, bu yüzden "ilk rüya", "satın alma" gibi kritik olaylar
// burada da (client'a ek olarak, tekrar değil) yakalanıyor.
// POSTHOG_KEY boşsa hiçbir şey göndermez — güvenli no-op.
import { PostHog } from 'posthog-node'

let client = null

function getClient() {
  if (client) return client
  const key = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1, // Vercel serverless: fonksiyon istekten hemen sonra dondurulabilir, hemen flush et
    flushInterval: 0,
  })
  return client
}

export function captureServerEvent(userId, event, properties = {}) {
  const ph = getClient()
  if (!ph || !userId) return
  try {
    ph.capture({ distinctId: userId, event, properties })
  } catch (err) {
    console.error('posthog capture error:', err.message)
  }
}
