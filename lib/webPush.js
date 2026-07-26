import webpush from 'web-push'

let configured = false

function ensureConfigured() {
  if (configured) return true

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@lunosfer.com'

  if (!publicKey || !privateKey) return false

  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

// Bir kullanıcının kayıtlı TÜM push aboneliklerine bildirim gönderir.
// Geçersiz/süresi dolmuş abonelikleri (410/404) otomatik olarak siler.
export async function sendPushToUser(supabaseAdmin, userId, payload) {
  if (!ensureConfigured()) return { sent: 0, skipped: 'vapid_not_configured' }

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subs || subs.length === 0) return { sent: 0 }

  const body = JSON.stringify(payload)
  let sent = 0

  await Promise.all(
    subs.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }

      try {
        await webpush.sendNotification(subscription, body)
        sent++
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        } else {
          console.error('push send error:', err.statusCode, err.message)
        }
      }
    })
  )

  return { sent }
}
