import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { repairDreamImage } from '@/lib/repairDreamImage'

// GÜVENLİK AĞI: /api/dreams/report-broken-image bir kullanıcı gerçekten o
// rüyayı görüntülediğinde tetiklenir — kimse o rüyayı açmazsa hiç
// tetiklenmeyebilir. Bu route düzenli olarak (vercel.json'daki günlük Vercel
// Cron + istersen cron-job.org ile daha sık) 'needs_persist' / 'broken'
// işaretli rüyaları tarayıp otomatik onarır, böylece bir sonraki ziyaretçi
// zaten düzeltilmiş görseli görür. Ayrıca /gorseltamiri admin sayfasından
// ?limit= ile manuel toplu tetikleme de yapılabilir (backlog'u hızlıca
// eritmek için).
//
// Hobby planda maxDuration tavanı 60sn. 'needs_persist' onarımları genelde
// UCUZ (mevcut URL hâlâ çalışıyor, sadece kalıcı depoya kopyalanıyor —
// ~1-3sn), yalnızca gerçekten ölü URL'ler tam yeniden üretim gerektiriyor
// (~8sn). Fonksiyon süresi dolarsa kalan rüyalar bir sonraki çağrıda kaldığı
// yerden devam eder (her rüya kendi DB yazımını tamamladıktan sonra
// sıradakine geçiliyor, yarım kalan/bozulan bir şey olmuyor).
export const config = { maxDuration: 60 }

const DEFAULT_BATCH_SIZE = 12
const MAX_BATCH_SIZE = 40

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

  const requestedLimit = parseInt(req.query.limit, 10)
  const batchSize = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_BATCH_SIZE)
    : DEFAULT_BATCH_SIZE

  try {
    const { data: dreams, error } = await supabaseAdmin
      .from('dreams')
      .select('id, content, ai_image_url, ai_image_prompt, ai_archetypes, image_status, image_repair_attempts')
      .in('image_status', ['needs_persist', 'broken'])
      .lt('image_repair_attempts', 5)
      .order('image_checked_at', { ascending: true, nullsFirst: true })
      .limit(batchSize)

    if (error) throw error

    if (!dreams || dreams.length === 0) {
      return res.status(200).json({ ok: true, processed: 0, results: [] })
    }

    const results = []
    for (const dream of dreams) {
      try {
        const result = await repairDreamImage(dream)
        results.push(result)
      } catch (err) {
        results.push({ dreamId: dream.id, result: 'error', error: err.message })
      }
    }

    // Kalan kaç rüya olduğunu da döndürelim — admin sayfası "hepsi bitene
    // kadar otomatik devam et" döngüsü için bunu kullanıyor.
    const { count: remaining } = await supabaseAdmin
      .from('dreams')
      .select('id', { count: 'exact', head: true })
      .in('image_status', ['needs_persist', 'broken'])
      .lt('image_repair_attempts', 5)

    return res.status(200).json({ ok: true, processed: results.length, remaining: remaining ?? null, results })
  } catch (error) {
    console.error('cron/repair-broken-images error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
