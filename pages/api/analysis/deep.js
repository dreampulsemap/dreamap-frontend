import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { isPremiumMember, getAuraBalance } from '@/lib/premiumMembership'
import { checkPremiumQuota, refundPremiumQuota } from '@/lib/featureQuota'
import { generateOneImage } from '@/lib/goalImageGen'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { isPersistedImageUrl } from '@/lib/imageUrlUtils'
import {
  DEEP_ANALYSIS_AURA_COST,
  dominantDreamLang,
  generateDeepAnalysis,
  normalizeLang,
} from '@/lib/deepAnalysisOpus'

// =====================================================================
// POST /api/analysis/deep  — Derin Analiz uret
// GET  /api/analysis/deep  — kullanicinin gecmis analizleri
//
// GUVENLIK: user_id ASLA govdeden okunmuyor. getAuthedUser Authorization
// basligindaki oturum jetonunu Supabase'e dogrulatiyor; istemcinin
// gonderdigi bir id ile baskasinin materyali analiz edilemez.
//
// ODEME: premium uyeye bedava, degilse 10 Aura.
//   Aura ONCE atomik olarak dusuluyor, hata olursa atomik iade ediliyor
//   (add_auras). "Once uret, sonra dus" istenmisti ama o sirada ayni
//   bakiyeyle es zamanli birden fazla istek kabul edilebiliyor ve
//   kullanici 10 Aura'ya 3 analiz alabiliyordu; rezerve+iade ayni
//   sonucu verir (yarida kalirsa kullanici para kaybetmez) ve bu acigi
//   birakmaz.
// =====================================================================

export const config = { maxDuration: 60 }

const DEFAULT_DREAM_COUNT = 12
const MAX_DREAM_COUNT = 15
const MAX_GOALS = 10
const RATE_LIMIT_PER_HOUR = 3
const CARD_BUCKET = 'dream_images'

function topArchetypes(dreams) {
  const counts = {}
  for (const d of dreams) {
    for (const a of d.ai_archetypes || []) {
      if (typeof a !== 'string' || !a.trim()) continue
      counts[a] = (counts[a] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }))
}

async function refundAuras(userId, amount) {
  if (!amount) return
  try {
    await supabaseAdmin.rpc('add_auras', { p_user_id: userId, p_amount: amount })
  } catch (err) {
    console.error('deep analysis aura refund failed:', err.message)
  }
}

export default async function handler(req, res) {
  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('deep_analyses')
      .select('id, created_at, lang, status, personality_analysis, fear_map, confrontation_solution, card_headline, card_affirmation, card_image_url')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('deep analysis list error:', error)
      return res.status(500).json({ ok: false, error: 'list_failed' })
    }
    return res.status(200).json({ ok: true, analyses: data || [] })
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })

  let reserved = 0
  let rowId = null
  let usedPremiumQuota = false
  let premiumQuotaUsedBonus = false
  const refundWhicheverWasCharged = async () => {
    if (reserved > 0) {
      await refundAuras(user.id, reserved)
      reserved = 0
    } else if (usedPremiumQuota) {
      await refundPremiumQuota(supabaseAdmin, user.id, 'deep_analysis_opus', premiumQuotaUsedBonus)
      usedPremiumQuota = false
    }
  }

  try {
    // --- Kotuye kullanim / maliyet korumasi: saatte 3 deneme ---
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount, error: countError } = await supabaseAdmin
      .from('deep_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', hourAgo)

    if (countError) throw countError
    if ((recentCount || 0) >= RATE_LIMIT_PER_HOUR) {
      return res.status(429).json({
        ok: false,
        error: 'rate_limited',
        limit: RATE_LIMIT_PER_HOUR,
        retryAfterMinutes: 60,
      })
    }

    const { dreamIds, lang: rawLang } = req.body || {}
    const requestedLang = normalizeLang(rawLang)

    // --- Materyali topla ---
    let dreamQuery = supabaseAdmin
      .from('dreams')
      .select('id, content, created_at, ai_archetypes, ai_sentiment, original_language')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (Array.isArray(dreamIds) && dreamIds.length) {
      // Istemci id verse bile user_id filtresi yukarida duruyor: baskasinin
      // ruyasinin id'sini gondermek bir sey dondurmez.
      dreamQuery = dreamQuery.in('id', dreamIds.slice(0, MAX_DREAM_COUNT))
    } else {
      dreamQuery = dreamQuery.limit(DEFAULT_DREAM_COUNT)
    }

    const [{ data: dreams, error: dreamsError }, { data: goals, error: goalsError }] =
      await Promise.all([
        dreamQuery,
        supabaseAdmin
          .from('goals')
          .select('id, title, description, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_GOALS),
      ])

    if (dreamsError) throw dreamsError
    if (goalsError) throw goalsError

    const usableDreams = (dreams || []).filter((d) => (d.content || '').trim().length > 20)
    if (usableDreams.length < 3) {
      return res.status(400).json({ ok: false, error: 'not_enough_dreams', minimum: 3 })
    }

    const lang = dominantDreamLang(usableDreams, requestedLang)

    // --- Odeme ---
    // Premium icin de artik aylik bir ust sinir var (bkz. lib/featureQuota.js)
    // — bu route generateOneImage() ile bir gorsel de urettigi icin
    // generate-deep-analysis.js'deki 8-Aura'lik analizden daha pahali.
    const premium = await isPremiumMember(user.id)
    if (!premium) {
      const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
        p_user_id: user.id,
        p_amount: DEEP_ANALYSIS_AURA_COST,
      })
      if (spendError) throw spendError
      if (!spendResult?.[0]?.success) {
        return res.status(402).json({
          ok: false,
          error: 'insufficient_auras',
          cost: DEEP_ANALYSIS_AURA_COST,
          auras: await getAuraBalance(user.id),
        })
      }
      reserved = DEEP_ANALYSIS_AURA_COST
    } else {
      const quota = await checkPremiumQuota(supabaseAdmin, user.id, 'deep_analysis_opus')
      if (!quota.allowed) {
        return res.status(402).json({ ok: false, error: 'monthly_limit_reached' })
      }
      usedPremiumQuota = true
      premiumQuotaUsedBonus = quota.usedBonus
    }

    // Satiri ONCE 'pending' olarak yaz: istek Vercel tavaninda kesilse bile
    // denemenin izi kalir (rate limit ve maliyet takibi icin) ve istemci
    // polling yapabilir.
    const { data: pendingRow, error: insertError } = await supabaseAdmin
      .from('deep_analyses')
      .insert({
        user_id: user.id,
        aura_cost: reserved,
        lang,
        input_summary: {
          dream_ids: usableDreams.map((d) => d.id),
          goal_ids: (goals || []).map((g) => g.id),
        },
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) throw insertError
    rowId = pendingRow.id

    // --- Opus 5 ---
    let result
    try {
      result = await generateDeepAnalysis({
        lang,
        dreams: usableDreams,
        goals: goals || [],
        archetypes: topArchetypes(usableDreams),
      })
    } catch (aiError) {
      await supabaseAdmin
        .from('deep_analyses')
        .update({ status: 'failed', error: aiError.message })
        .eq('id', rowId)
      await refundWhicheverWasCharged()

      const known = ['anthropic_key_missing', 'claude_refusal', 'claude_truncated', 'invalid_json_from_model']
      return res.status(502).json({
        ok: false,
        error: known.includes(aiError.message) ? aiError.message : 'generation_failed',
        refunded: true,
      })
    }

    const { analysis, costUsd } = result

    // --- Yuzlesme karti gorseli (best effort) ---
    // Replicate/DALL-E GECICI url donuyor; dogrudan kaydedilirse gorsel bir
    // sure sonra kiriliyor (bkz. persistRemoteImage kok neden notu). Once
    // kendi storage'imiza kopyaliyoruz.
    let cardImageUrl = null
    if (analysis.card_image_prompt_en) {
      try {
        const { imageUrl, details } = await generateOneImage(analysis.card_image_prompt_en)
        if (imageUrl) {
          const persisted = await persistRemoteImage(imageUrl, {
            bucket: CARD_BUCKET,
            path: `deep-analysis/${user.id}/${rowId}.jpg`,
          })
          // Kalici kopyalama basarisiz olduysa gecici url'i kaydetmiyoruz:
          // kirik gorsel yerine gorselsiz kart daha iyi.
          cardImageUrl = isPersistedImageUrl(persisted) ? persisted : null
        } else if (details) {
          console.error('deep analysis card image failed:', details)
        }
      } catch (imgError) {
        console.error('deep analysis card image error:', imgError.message)
      }
    }

    const { data: finalRow, error: updateError } = await supabaseAdmin
      .from('deep_analyses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        personality_analysis: analysis.personality_analysis,
        fear_map: analysis.fear_map,
        confrontation_solution: analysis.confrontation_solution,
        card_headline: analysis.card_headline,
        card_affirmation: analysis.card_affirmation,
        card_image_url: cardImageUrl,
        api_cost_usd: costUsd,
      })
      .eq('id', rowId)
      .select('id, created_at, lang, status, personality_analysis, fear_map, confrontation_solution, card_headline, card_affirmation, card_image_url')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({
      ok: true,
      analysis: finalRow,
      aurasLeft: premium ? null : await getAuraBalance(user.id),
      isPremium: premium,
    })
  } catch (error) {
    console.error('deep analysis error:', error)
    if (rowId) {
      await supabaseAdmin
        .from('deep_analyses')
        .update({ status: 'failed', error: String(error.message).slice(0, 500) })
        .eq('id', rowId)
    }
    const hadCharge = reserved > 0 || usedPremiumQuota
    await refundWhicheverWasCharged()
    return res.status(500).json({ ok: false, error: 'internal_error', refunded: hadCharge })
  }
}
