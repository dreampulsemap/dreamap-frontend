import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const WINDOW_HOURS = 24
const CACHE_FRESH_MINUTES = 60
// Küçük örneklemde "%50 kullanıcı X gördü" gibi bir istatistik hem
// anlamsız hem de potansiyel olarak teşhis edici (kaç kişiden bahsettiği
// belli olur) — bu eşiğin altında rapor "henüz yeterli veri yok" döner.
const MIN_SAMPLE_SIZE = 20
const DREAM_SCAN_LIMIT = 2000

function toApiShape(row) {
  return {
    available: row.sample_size >= MIN_SAMPLE_SIZE,
    topArchetype: row.top_archetype,
    percentage: row.percentage,
    sampleSize: row.sample_size,
    windowStart: row.window_start,
    windowEnd: row.window_end,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    // Veri kullanıcıya özel değil (agregat), ama tutarlılık için diğer
    // route'larla aynı auth kontrolünü kullanıyoruz.
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { data: cached } = await supabaseAdmin
      .from('collective_dream_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached) {
      const ageMinutes = (Date.now() - new Date(cached.created_at).getTime()) / 60000
      if (ageMinutes < CACHE_FRESH_MINUTES) {
        return res.status(200).json({ ok: true, ...toApiShape(cached) })
      }
    }

    const windowEnd = new Date()
    const windowStart = new Date(windowEnd.getTime() - WINDOW_HOURS * 3600000)

    // ai_archetypes bir text[] — PostgREST'in .select() düzeyinde unnest+group-by
    // desteği yok, bu yüzden summaries/generate.js'teki gibi ham satırları
    // çekip JS'te sayıyoruz (bu kod tabanının genel deseni: özel bir Postgres
    // fonksiyonu yerine route içinde JS mantığı).
    const { data: dreams, error: dreamsError } = await supabaseAdmin
      .from('dreams')
      .select('ai_archetypes')
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())
      .not('ai_archetypes', 'is', null)
      .limit(DREAM_SCAN_LIMIT)

    if (dreamsError) throw dreamsError

    const sampleSize = dreams?.length || 0

    const counts = new Map()
    for (const d of dreams || []) {
      const seenInThisDream = new Set(Array.isArray(d.ai_archetypes) ? d.ai_archetypes : [])
      for (const archetype of seenInThisDream) {
        counts.set(archetype, (counts.get(archetype) || 0) + 1)
      }
    }

    let topArchetype = null
    let topCount = 0
    for (const [archetype, count] of counts) {
      if (count > topCount) {
        topArchetype = archetype
        topCount = count
      }
    }

    const percentage = sampleSize > 0 ? Math.round((topCount / sampleSize) * 100) : 0

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('collective_dream_stats')
      .insert({
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        top_archetype: topArchetype,
        percentage,
        sample_size: sampleSize,
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    return res.status(200).json({ ok: true, ...toApiShape(inserted) })
  } catch (error) {
    console.error('dreams/collective-stats error:', error)
    return res.status(500).json({ ok: false, error: error.message || 'internal_error' })
  }
}
