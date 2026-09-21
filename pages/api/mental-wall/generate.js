import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { generateWithAI, stripJsonFence } from '@/lib/aiClient'
import { isPremiumMember, getAuraBalance } from '@/lib/premiumMembership'
import { LANG_NAMES } from '@/lib/translator'

// =====================================================================
// ZIHIN DUVARI (Mental Wall)
//
// NEDEN HIC CALISMIYORDU (prod'da mental_wall_reports satir sayisi: 0):
//  1. Uretim 5 Aura istiyordu. Aura satin alma akisi calismadigi icin
//     gercek kullanicilarin bakiyesi 0; her istek 402 ile donuyor,
//     Android ise 400 disindaki her hatayi tek bir genel
//     "Failed to generate mental wall" metnine ceviriyordu.
//  2. Basari durumunda bile yanit { report: {...} } seklindeydi; Android
//     MentalWallResponse ise narrative/summary/archetypes bekliyor. Yani
//     Aura olsa dahi ekranda bos bir kart cikacakti.
//
// SIMDI:
//  - Standart rapor UCRETSIZ (gunde FREE_DAILY_LIMIT kez, prophet ile
//    ayni sayac tablosu).
//  - "Daha derin yorum" (deep=true): premium uyeye bedava, degilse
//    DEEP_AURA_COST Aura.
//  - Yanit hem duz alanlari (narrative/summary/archetypes) hem de eski
//    `report` nesnesini iceriyor.
// =====================================================================

const MAX_DREAMS_CONSIDERED = 20
const MAX_GOALS = 10
const FREE_DAILY_LIMIT = 3
const DEEP_AURA_COST = 10

function buildPrompt({ dreamExcerpts, goalTitles, langName, deep }) {
  const shape = deep
    ? `{"detected_block": "3-6 word label in ${langName}", "report_content": "500-700 word in-depth report in ${langName}", "archetypes": ["up to 3 archetype names in ${langName}"]}`
    : `{"detected_block": "3-6 word label in ${langName}", "report_content": "150-250 word report in ${langName}", "archetypes": ["up to 3 archetype names in ${langName}"]}`

  const depth = deep
    ? `Go deep: name the specific tension between the dreams and the goals, trace how it repeats across the dreams, say what it protects the dreamer from, and end with two concrete steps. Phrase interpretations as possibilities, never certainties. No medical or psychiatric diagnosis.`
    : `Keep it short and plain. Phrase interpretations as possibilities, never certainties. No medical or psychiatric diagnosis.`

  return `You are a Jungian shadow-work analyst.

Respond ONLY in ${langName}. Every value in your JSON output must be written
entirely in ${langName}, as a native speaker would write it — not a translation.
Do not use English unless ${langName} IS English.

Recent dreams (excerpts):
${dreamExcerpts.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Conscious goals:
${goalTitles.map((g, i) => `${i + 1}. "${g}"`).join('\n')}

Identify ONE specific psychological pattern. ${depth}

Return ONLY valid JSON:
${shape}`
}

async function refundQuota(userId) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: row } = await supabaseAdmin
      .from('prophet_usage')
      .select('used_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .eq('mode', 'mental_wall')
      .maybeSingle()

    if (row && row.used_count > 0) {
      await supabaseAdmin
        .from('prophet_usage')
        .update({ used_count: row.used_count - 1 })
        .eq('user_id', userId)
        .eq('usage_date', today)
        .eq('mode', 'mental_wall')
    }
  } catch (err) {
    console.error('mental-wall quota refund failed:', err)
  }
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
      return res.status(200).json({ ok: true, reports: data || [] })
    } catch (error) {
      console.error('mental-wall/generate GET error:', error)
      return res.status(500).json({ ok: false, error: error.message })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  let user = null
  let quotaConsumed = false
  let aurasSpent = 0

  try {
    user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })

    const { goalId, lang = 'en', deep: rawDeep } = req.body || {}
    const wantsDeep = rawDeep === true || rawDeep === 'true'

    const { data: dreams, error: dreamsError } = await supabaseAdmin
      .from('dreams')
      .select('id, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_DREAMS_CONSIDERED)

    if (dreamsError) throw dreamsError
    if (!dreams || dreams.length < 3) {
      return res.status(400).json({ ok: false, error: 'not_enough_dreams', minimum: 3 })
    }

    let goalsQuery = supabaseAdmin
      .from('goals')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(MAX_GOALS)

    if (goalId) goalsQuery = goalsQuery.eq('id', goalId)

    const { data: goals, error: goalsError } = await goalsQuery
    if (goalsError) throw goalsError
    if (!goals || goals.length === 0) {
      return res.status(400).json({ ok: false, error: 'no_active_goals' })
    }

    const premium = await isPremiumMember(user.id)

    // --- Odeme / kota ---
    // Derin yorum: premium bedava, degilse 10 Aura. Standart rapor: ucretsiz
    // ama gunluk kotali (premium uyede kota islemiyor).
    let remaining = null
    if (wantsDeep && !premium) {
      const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
        p_user_id: user.id,
        p_amount: DEEP_AURA_COST,
      })
      if (spendError) throw spendError
      const spend = spendResult?.[0]
      if (!spend?.success) {
        return res.status(402).json({
          ok: false,
          error: 'insufficient_auras',
          cost: DEEP_AURA_COST,
          auras: await getAuraBalance(user.id),
        })
      }
      aurasSpent = DEEP_AURA_COST
    } else if (!premium) {
      const { data: quota, error: quotaError } = await supabaseAdmin.rpc('consume_prophet_quota', {
        p_user_id: user.id,
        p_mode: 'mental_wall',
        p_limit: FREE_DAILY_LIMIT,
      })
      if (quotaError) throw quotaError
      const row = quota?.[0]
      remaining = row?.remaining ?? 0
      if (!row?.allowed) {
        return res.status(200).json({
          ok: true,
          success: false,
          limitReached: true,
          remaining: 0,
          dailyLimit: FREE_DAILY_LIMIT,
          deepCost: DEEP_AURA_COST,
          error: 'free_limit_reached',
        })
      }
      quotaConsumed = true
    }

    const dreamExcerpts = dreams.map((d) => d.content?.substring(0, 200)).filter(Boolean)
    const goalTitles = goals.map((g) => g.title).filter(Boolean)

    const prompt = buildPrompt({
      dreamExcerpts,
      goalTitles,
      // 'tr' disindaki HER dil Ingilizce'ye dusuyordu: uygulama Almanca
      // olsa bile rapor Ingilizce geliyordu. Ortak dil haritasi kullaniliyor.
      langName: LANG_NAMES[String(lang || 'en').toLowerCase().split('-')[0]] || 'English',
      deep: wantsDeep,
    })

    let parsed
    try {
      const aiResult = await generateWithAI(prompt)
      const cleaned = stripJsonFence(aiResult)
      parsed = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned
    } catch (aiError) {
      if (aurasSpent) await supabaseAdmin.rpc('add_auras', { p_user_id: user.id, p_amount: aurasSpent })
      if (quotaConsumed) await refundQuota(user.id)
      throw aiError
    }

    const archetypes = Array.isArray(parsed?.archetypes)
      ? parsed.archetypes.filter((a) => typeof a === 'string' && a.trim()).slice(0, 3)
      : []

    // Kolon adi goal_id (TEKIL). Eskiden var olmayan "goal_ids" kolonuna
    // INSERT edildigi icin her cagri PGRST204 ile patliyordu.
    const { data: report, error: insertError } = await supabaseAdmin
      .from('mental_wall_reports')
      .insert({
        user_id: user.id,
        detected_block: parsed.detected_block,
        report_content: parsed.report_content,
        dream_ids: dreams.map((d) => d.id),
        goal_id: goalId || goals[0]?.id,
        aura_cost: aurasSpent,
      })
      .select('*')
      .single()

    if (insertError) {
      if (aurasSpent) await supabaseAdmin.rpc('add_auras', { p_user_id: user.id, p_amount: aurasSpent })
      if (quotaConsumed) await refundQuota(user.id)
      throw insertError
    }

    // Android MentalWallResponse duz alanlari okuyor (narrative/summary/
    // archetypes); `report` geriye donuk uyumluluk icin duruyor.
    return res.status(200).json({
      ok: true,
      success: true,
      summary: parsed.detected_block || null,
      narrative: parsed.report_content || null,
      archetypes,
      detailed: wantsDeep,
      isPremium: premium,
      remaining,
      dailyLimit: premium ? null : FREE_DAILY_LIMIT,
      deepCost: DEEP_AURA_COST,
      aurasLeft: await getAuraBalance(user.id),
      report,
    })
  } catch (error) {
    console.error('mental-wall/generate POST error:', error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}
