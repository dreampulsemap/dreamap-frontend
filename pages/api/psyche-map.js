import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// "Psyche Haritası" — kullanıcının TÜM rüyalarında AI'ın tespit ettiği
// arketipleri (dreams.ai_archetypes, her rüya analiz edilirken zaten
// dolduruluyor — bkz. lib/deepAnalysisEngine.js) toplayıp en sık
// tekrarlananları döner. Yeni bir AI çağrısı YOK — tamamen var olan
// veriden agregasyon, bu yüzden ucuz ve anlık.
//
// "Haritan zamanla netleşiyor" hissi GERÇEK: ne kadar çok rüya analiz
// edilirse örüntü o kadar netleşiyor — ama gizemli/gerçeklik bulandıran
// bir çerçeve yok, sade bir istatistik.
const MIN_DREAMS_FOR_MAP = 3
const MAX_ARCHETYPES_RETURNED = 8

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { data: dreams, error } = await supabaseAdmin
      .from('dreams')
      .select('ai_archetypes, premium_deep_analysis, created_at')
      .eq('user_id', user.id)
      .not('ai_archetypes', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    const analyzedDreams = (dreams || []).filter((d) => Array.isArray(d.ai_archetypes) && d.ai_archetypes.length > 0)

    const counts = new Map()
    for (const dream of analyzedDreams) {
      for (const raw of dream.ai_archetypes) {
        const label = String(raw || '').trim()
        if (!label) continue
        // AI çağrı çağrı ürettiği için aynı arketip farklı büyük/küçük
        // harfle gelebiliyor — anahtar küçük harf, gösterimde İLK görülen
        // (genelde en özenli yazılmış) hâli kullanılıyor.
        const key = label.toLowerCase()
        const existing = counts.get(key)
        if (existing) existing.count += 1
        else counts.set(key, { label, count: 1 })
      }
    }

    const archetypes = [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_ARCHETYPES_RETURNED)
      .map((a) => ({ ...a, share: analyzedDreams.length ? a.count / analyzedDreams.length : 0 }))

    // Varsa en son premium derin analizden kısa bir doku alıntısı — bu
    // kullanıcının KENDİ verisi, üçüncü taraf içerik değil.
    const latestPremium = analyzedDreams.find((d) => d.premium_deep_analysis && typeof d.premium_deep_analysis === 'object')
    const premiumExcerpt = latestPremium?.premium_deep_analysis?.individuation_path
      ? String(latestPremium.premium_deep_analysis.individuation_path).slice(0, 280)
      : null

    return res.status(200).json({
      totalAnalyzedDreams: analyzedDreams.length,
      readyForMap: analyzedDreams.length >= MIN_DREAMS_FOR_MAP,
      minDreamsNeeded: MIN_DREAMS_FOR_MAP,
      archetypes,
      premiumExcerpt,
    })
  } catch (error) {
    console.error('psyche-map error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
