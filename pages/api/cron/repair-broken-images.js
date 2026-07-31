import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { repairDreamImage } from '@/lib/repairDreamImage'

// GÜVENLİK AĞI: /api/dreams/report-broken-image bir kullanıcı gerçekten o
// rüyayı görüntülediğinde tetiklenir — kimse o rüyayı açmazsa hiç
// tetiklenmeyebilir. Bu route düzenli olarak (vercel.json'daki günlük Vercel
// Cron + istersen cron-job.org ile daha sık) 'needs_persist' / 'broken'
// işaretli rüyaları tarayıp otomatik onarır, böylece bir sonraki ziyaretçi
// zaten düzeltilmiş görseli görür.
//
// Hobby planda maxDuration tavanı 60sn — her onarım ~1 (HEAD kontrolü) ile
// ~8sn (indir + yeniden üret + yükle) arası sürebilir, bu yüzden batch'i
// güvenli tarafta tutuyoruz.
export const config = { maxDuration: 60 }

const BATCH_SIZE = 6

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
    const { data: dreams, error } = await supabaseAdmin
      .from('dreams')
      .select('id, content, ai_image_url, ai_image_prompt, ai_archetypes, image_status, image_repair_attempts')
      .in('image_status', ['needs_persist', 'broken'])
      .lt('image_repair_attempts', 5)
      .order('image_checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE)

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

    return res.status(200).json({ ok: true, processed: results.length, results })
  } catch (error) {
    console.error('cron/repair-broken-images error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
