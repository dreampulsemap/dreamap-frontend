import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendPushToUser } from '@/lib/webPush'

// "Her an her şey olabilir" hissi: günde bir kez (vercel.json: 16:40 UTC —
// Hobby planda cron günde birden fazla ÇALIŞTIRILAMIYOR, denendi ve
// "cron_jobs_limits_reached" ile reddedildi; Pro'ya geçilirse günde birkaç
// kez farklı saatlerde çalıştırmak daha da güçlü bir "her an" hissi verir),
// push-abone (FCM veya web push) KÜÇÜK rastgele bir kullanıcı örneklemine,
// rastgele bir mesajla sürpriz bir bildirim gönderir. Bilinçli olarak
// Aura/Mana gibi parasal değeri olan bir para birimi VERMİYOR — sadece
// dikkat çekici, oyunlaştırma amaçlı bir push. Kim seçildiği VE hangi
// mesajın çıktığı her çalıştırmada rastgele olduğu için kullanıcı
// tarafında öngörülemez bir "değişken oranlı ödül" (variable-ratio) hissi
// yaratıyor — parasal risk sıfır.
export const config = { maxDuration: 30 }

const SAMPLE_SIZE = 5

const MESSAGES = [
  { title: '✨ Bir şeyler oluyor', body: 'Explore\'da az önce yeni bir şey paylaşıldı. Bir göz atmaya ne dersin?' },
  { title: '🔮 Bugün senin günün olabilir', body: 'Uygulamayı aç, evrende seni bekleyen bir sürpriz var.' },
  { title: '🌙 Rüyalar hiç durmuyor', body: 'Şu an birileri yeni bir rüya paylaşıyor olabilir — kaçırma.' },
  { title: '⚡ Merak uyandıran bir an', body: 'Lunosfer\'de her an her şey olabilir. Şimdi bir bak.' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'unauthorized' })
    }
  }

  try {
    // Push-abone kullanıcı havuzu: FCM (native) + Web Push, tekilleştirilmiş.
    const [{ data: fcmRows }, { data: webRows }] = await Promise.all([
      supabaseAdmin.from('fcm_tokens').select('user_id'),
      supabaseAdmin.from('push_subscriptions').select('user_id'),
    ])
    const candidates = Array.from(new Set([...(fcmRows || []), ...(webRows || [])].map((r) => r.user_id)))
    if (candidates.length === 0) return res.status(200).json({ sent: 0, reason: 'no_push_subscribers' })

    // Mesajlar genel/herkese açık içeriğe (Explore) işaret ediyor — misafir
    // hesapları ayrıca filtrelemeye gerek yok, onlar da salt-okunur gezinebiliyor.
    // Fisher-Yates kısmi karıştırma + ilk N: her çalıştırmada FARKLI kişiler.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    const chosen = candidates.slice(0, SAMPLE_SIZE)

    let sent = 0
    for (const userId of chosen) {
      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
      const result = await sendPushToUser(supabaseAdmin, userId, {
        title: msg.title,
        body: msg.body,
        tag: 'surprise_moment',
        type: 'surprise',
      })
      if ((result?.sent || 0) > 0) sent++
    }

    return res.status(200).json({ success: true, candidates: candidates.length, targeted: chosen.length, sent })
  } catch (error) {
    console.error('cron/surprise-moment error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
