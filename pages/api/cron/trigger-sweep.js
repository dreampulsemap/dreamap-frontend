// =====================================================================
// HAFİF SÜPÜRME TETİKLEYİCİSİ
// -----------------------------------------------------------------------
// cron-job.org gibi ücretsiz servislerin sabit bir timeout üst sınırı
// vardır (ör. 30sn) ve bunu değiştiremezsin. Ama /api/cron/process-deep-analysis
// tek bir rüyayı işlerken 60sn'e kadar sürebilir (LLM + görsel üretimi),
// bu yüzden cron-job.org'u DOĞRUDAN o route'a bağlarsan sürekli
// "Failed (timeout)" alırsın — iş sunucu tarafında aslında bitmiş olsa bile.
//
// Bu route bunun yerine cron-job.org'un çağıracağı nokta olur:
//  1. Yetkiyi doğrular (CRON_SECRET).
//  2. Asıl işi /api/cron/process-deep-analysis'e fire-and-forget
//     (yanıtı BEKLEMEDEN) bir istekle devreder — generate-deep-analysis.js
//     içindeki triggerWorker() ile birebir aynı desen.
//  3. Milisaniyeler içinde 200 döner.
//
// cron-job.org tarafında yapman gereken TEK şey: job URL'sini
// /api/cron/process-deep-analysis yerine /api/cron/trigger-sweep olarak
// güncellemek. Authorization header (Bearer CRON_SECRET) aynı kalıyor.
// =====================================================================

export const config = { maxDuration: 10 }

function triggerWorker() {
  const base = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL || 'www.lunosfer.com'}`
  const secret = process.env.CRON_SECRET

  // Yanıtı beklemeden ateşle-unut: process-deep-analysis kendi 60sn'lik
  // bütçesinde ayrı bir invocation olarak çalışır, bu route'u etkilemez.
  fetch(`${base}/api/cron/process-deep-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {})
    },
    body: JSON.stringify({})
  }).catch((err) => {
    console.error('trigger-sweep: worker trigger failed:', err.message)
  })
}

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

  triggerWorker()

  return res.status(200).json({ ok: true, triggered: true })
}
