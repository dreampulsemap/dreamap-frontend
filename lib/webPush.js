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

// --- FCM (native Android) ---
// VAPID/web-push'tan tamamen ayrı, opsiyonel bir kanal. Dinamik import()
// bilerek kullanıldı: firebase-admin paketi henüz kurulmamış OLSA BİLE
// (npm install yapılmadan önce) ya da FIREBASE_SERVICE_ACCOUNT_BASE64 env
// var'ı tanımlı değilse bu kanal sessizce atlanır — web push (ve dolayısıyla
// tüm bildirim akışı) hiçbir şekilde etkilenmez/çökmez.
let fcmApp = null
let fcmConfigAttempted = false

async function ensureFcmConfigured() {
  if (fcmApp) return true
  if (fcmConfigAttempted) return false
  fcmConfigAttempted = true

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  if (!raw) return false

  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app')
    const serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
    fcmApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) })
    return true
  } catch (err) {
    console.error('FCM init error:', err.message)
    return false
  }
}

// Bir kullanıcının kayıtlı TÜM FCM token'larına bildirim gönderir.
// Geçersiz/kaldırılmış token'ları (registration-token-not-registered)
// otomatik olarak siler — push_subscriptions'daki 404/410 temizliğiyle
// aynı mantık.
async function sendFcmToUser(supabaseAdmin, userId, payload) {
  const ok = await ensureFcmConfigured()
  if (!ok) return { sent: 0, skipped: 'fcm_not_configured' }

  const { data: tokens, error } = await supabaseAdmin
    .from('fcm_tokens')
    .select('token')
    .eq('user_id', userId)

  if (error || !tokens || tokens.length === 0) return { sent: 0 }

  const { getMessaging } = await import('firebase-admin/messaging')
  const messaging = getMessaging(fcmApp)
  let sent = 0

  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        // data payload'daki "url" alanı, LunosferMessagingService.
        // parseTargetRoute()'un okuduğu alanla birebir aynı — Android
        // bildirime dokununca doğru ekrana gidiyor.
        await messaging.send({
          token,
          notification: { title: payload.title, body: payload.body },
          data: { url: payload.url || '', tag: payload.tag || '' },
        })
        sent++
      } catch (err) {
        if (
          err.code === 'messaging/registration-token-not-registered' ||
          err.code === 'messaging/invalid-registration-token'
        ) {
          await supabaseAdmin.from('fcm_tokens').delete().eq('token', token)
        } else {
          console.error('fcm send error:', err.code || err.message)
        }
      }
    })
  )

  return { sent }
}

// Bir kullanıcının kayıtlı TÜM push aboneliklerine (tarayıcı Web Push +
// native Android FCM) bildirim gönderir. Geçersiz/süresi dolmuş
// abonelikleri/token'ları otomatik olarak siler. ÇAĞIRAN KOD (notify.js,
// messages/send.js, vb.) HİÇBİR DEĞİŞİKLİK GEREKTİRMEDİ — aynı fonksiyon
// imzası, aynı payload şekli ({title, body, url, tag}), artık iki kanala
// birden gidiyor.
export async function sendPushToUser(supabaseAdmin, userId, payload) {
  let webPushSent = 0

  if (ensureConfigured()) {
    const { data: subs, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (!error && subs && subs.length > 0) {
      const body = JSON.stringify(payload)

      await Promise.all(
        subs.map(async (sub) => {
          const subscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }

          try {
            await webpush.sendNotification(subscription, body)
            webPushSent++
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            } else {
              console.error('push send error:', err.statusCode, err.message)
            }
          }
        })
      )
    }
  }

  const fcmResult = await sendFcmToUser(supabaseAdmin, userId, payload)

  return { sent: webPushSent + fcmResult.sent, webPush: webPushSent, fcm: fcmResult.sent }
}
