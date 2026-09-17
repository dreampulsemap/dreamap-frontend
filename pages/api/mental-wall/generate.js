import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { generateWithAI, stripJsonFence } from '@/lib/aiClient'

const MAX_DREAMS_CONSIDERED = 20 // Add explicit limit
const MAX_GOALS = 10
const AURA_COST = 5

function buildPrompt({ dreamExcerpts, goalTitles, langName }) {
  return `You are a Jungian shadow-work analyst.

Recent dreams (excerpts):
${dreamExcerpts.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Conscious goals:
${goalTitles.map((g, i) => `${i + 1}. "${g}"`).join('\n')}

Identify ONE specific psychological pattern. Return ONLY valid JSON:
{"detected_block": "3-6 word label in ${langName}", "report_content": "150-250 word report in ${langName}"}`
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { data, error } = await supabaseAdmin
        .from('mental_wall_reports')
        .select('id, detected_block, report_content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return res.status(200).json({ reports: data || [] })
    } catch (error) {
      console.error('mental-wall/generate GET error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, lang = 'en' } = req.body || {}

    // OPTIMIZED: Select only needed columns with explicit limit
    const { data: dreams, error: dreamsError } = await supabaseAdmin
      .from('dreams')
      .select('id, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_DREAMS_CONSIDERED)

    if (dreamsError) throw dreamsError
    if (!dreams || dreams.length < 3) {
      return res.status(400).json({ error: 'not_enough_dreams', minimum: 3 })
    }

    // Get comparison goals with explicit limit
    let goalsQuery = supabaseAdmin
      .from('goals')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(MAX_GOALS)

    if (goalId) {
      goalsQuery = goalsQuery.eq('id', goalId)
    }

    const { data: goals, error: goalsError } = await goalsQuery

    if (goalsError) throw goalsError
    if (!goals || goals.length === 0) {
      return res.status(400).json({ error: 'no_active_goals' })
    }

    const dreamExcerpts = dreams.map(d => d.content.substring(0, 200)).filter(Boolean)
    const goalTitles = goals.map(g => g.title).filter(Boolean)

    // Code-review fix: bu endpoint premium bir özellik olmasına rağmen Aura
    // bakiyesini hiç kontrol/düşürmüyordu — AURA_COST sabiti tanımlıydı ve
    // rapor satırına yazılıyordu ama kullanıcının bakiyesinden asla
    // düşülmüyordu, yani sınırsız ücretsiz rapor üretilebiliyordu. Frontend
    // (MentalWallPanel.jsx) zaten "insufficient_auras" hatasını bekliyordu;
    // backend bunu hiç döndürmüyordu. generate-cover.js / generate-slide-image.js
    // ile aynı atomik spend_auras + hata durumunda iade deseni kullanılıyor.
    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: AURA_COST,
    })
    if (spendError) throw spendError
    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'insufficient_auras', cost: AURA_COST })
    }

    const prompt = buildPrompt({
      dreamExcerpts,
      goalTitles,
      langName: lang === 'tr' ? 'Turkish' : 'English'
    })

    let parsed
    try {
      const aiResult = await generateWithAI(prompt)
      // response_format zorlanmadan önce model bazen çıktıyı ```json ... ```
      // bloğuna sarabiliyordu ve ham JSON.parse() burada SyntaxError fırlatırdı
      // (prophet.js'deki aynı sınıf sorunla aynı savunma deseni, artık
      // lib/aiClient.js'teki paylaşılan stripJsonFence() içinde) — aiClient.js'e
      // ayrıca response_format:{type:'json_object'} eklendi, bu ek bir güvence.
      const cleanedResult = stripJsonFence(aiResult)
      parsed = typeof cleanedResult === 'string' ? JSON.parse(cleanedResult) : cleanedResult
    } catch (aiError) {
      // Krediyi GERİ VER, kullanıcı karşılıksız harcamış olmasın.
      await supabaseAdmin
        .from('user_profiles')
        .update({ premium_analysis_auras: spend.remaining + AURA_COST })
        .eq('id', user.id)
      throw aiError
    }

    // Bug #6'nın GERÇEK ve doğrulanmış kök nedeni (Vercel prod loglarında
    // "PGRST204: Could not find the 'goal_ids' column of 'mental_wall_reports'
    // in the schema cache" — 2026-07-29'dan beri her tek çağrıda tekrarlıyordu):
    // gerçek kolon adı "goal_id" (TEKİL, uuid) — "goal_ids" (çoğul, dizi) diye
    // var olmayan bir kolona INSERT her seferinde 500 ile patlıyordu.
    const { data: report, error: insertError } = await supabaseAdmin
      .from('mental_wall_reports')
      .insert({
        user_id: user.id,
        detected_block: parsed.detected_block,
        report_content: parsed.report_content,
        dream_ids: dreams.map(d => d.id),
        goal_id: goalId || goals[0]?.id,
        aura_cost: AURA_COST
      })
      .select('*')
      .single()

    if (insertError) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ premium_analysis_auras: spend.remaining + AURA_COST })
        .eq('id', user.id)
      throw insertError
    }

    return res.status(200).json({ report, aurasLeft: spend.remaining })
  } catch (error) {
    console.error('mental-wall/generate POST error:', error)
    return res.status(500).json({ error: error.message })
  }
}
