import { createClient } from '@supabase/supabase-js'
import {
  cleanText,
  detectDreamLanguage,
  buildPrompt,
  generateWithOpenAIOnly,
  generateImageIfPossible
} from '@/lib/deepAnalysisEngine'
import { notifyAnalysisOutcome } from '@/lib/notify'

export const config = { maxDuration: 120 }

const SYNC_DEADLINE_MS = 90_000
const AURA_COST = 8

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function refundAuras(userId, amount) {
  const { data, error } = await supabaseAdmin.rpc('refund_auras', {
    p_user_id: userId,
    p_amount: amount
  })

  if (error) throw new Error(`refund_failed: ${error.message}`)

  const refund = data?.[0]
  if (!refund?.success) throw new Error('refund_failed_user_not_found')

  return refund.remaining
}

async function spendAuras(userId, amount) {
  const { data, error } = await supabaseAdmin.rpc('spend_auras', {
    p_user_id: userId,
    p_amount: amount
  })

  if (error) throw error

  const spend = data?.[0]
  if (!spend?.success) {
    return { success: false, remaining: null }
  }

  return {
    success: true,
    remaining: spend.remaining
  }
}

async function buildAnalysisPrompt({ dream, lang }) {
  const { data: pastDreams, error: pastDreamsError } = await supabaseAdmin
    .from('dreams')
    .select('content, premium_deep_analysis')
    .eq('user_id', dream.user_id)
    .eq('premium_deep_analysis_status', 'generated')
    .neq('id', dream.id)
    .order('premium_deep_analysis_generated_at', { ascending: false })
    .limit(3)

  if (pastDreamsError) {
    throw new Error(`past_dreams_fetch_failed: ${pastDreamsError.message}`)
  }

  const pastContext = pastDreams?.length
    ? pastDreams
        .map(
          (d) =>
            `Content: "${cleanText(d.content || '')}"
Shadow focus: "${cleanText(
              d.premium_deep_analysis?.shadow_focus || ''
            )}"`
        )
        .join('
---
')
    : 'No past history.'

  const detectedLang = detectDreamLanguage(dream.content || '', lang)

  const prompt = buildPrompt({
    dreamContent: cleanText(dream.content || ''),
    detectedLang,
    pastContext
  })

  return { prompt, detectedLang }
}

async function generateAnalysis({ dream, lang }) {
  const { prompt, detectedLang } = await buildAnalysisPrompt({ dream, lang })
  const deadlineAt = Date.now() + SYNC_DEADLINE_MS
  return generateWithOpenAIOnly(prompt, detectedLang, deadlineAt)
}

async function markDreamFailed(dreamId, message) {
  if (!dreamId) return

  const { error } = await supabaseAdmin
    .from('dreams')
    .update({
      premium_deep_analysis_status: 'failed',
      premium_deep_analysis_error: message
    })
    .eq('id', dreamId)

  if (error) {
    console.error('markDreamFailed error:', error.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  let spendDone = false
  let refundUserId = null
  let currentDreamId = null
  let currentDream = null
  let lang = 'en'

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const {
      data: { user },
      error: authError
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const body = req.body || {}
    const { dreamId, lang: requestLang = 'en' } = body

    currentDreamId = dreamId
    lang = requestLang

    if (!dreamId) {
      return res.status(400).json({ error: 'dream_id_required' })
    }

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select(
        'id, user_id, content, premium_deep_analysis_status, premium_deep_analysis, premium_deep_analysis_provider'
      )
      .eq('id', dreamId)
      .single()

    if (dreamError || !dream) {
      return res.status(404).json({ error: 'dream_not_found' })
    }

    if (dream.user_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' })
    }

    currentDream = dream

    if (dream.premium_deep_analysis_status === 'generated' && dream.premium_deep_analysis) {
      return res.status(200).json({
        ok: true,
        alreadyGenerated: true,
        analysis: dream.premium_deep_analysis,
        provider: dream.premium_deep_analysis_provider || null
      })
    }

    const spend = await spendAuras(user.id, AURA_COST)

    if (!spend.success) {
      return res.status(402).json({ error: 'no_auras' })
    }

    spendDone = true
    refundUserId = user.id

    const best = await generateAnalysis({ dream, lang })

    const { error: updateError } = await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis: best.analysis,
        premium_deep_analysis_status: 'generated',
        premium_deep_analysis_generated_at: new Date().toISOString(),
        premium_deep_analysis_provider: best.provider,
        premium_deep_analysis_error: null,
        premium_deep_analysis_lang: lang
      })
      .eq('id', dreamId)

    if (updateError) {
      throw new Error(`dream_update_failed: ${updateError.message}`)
    }

    notifyAnalysisOutcome(supabaseAdmin, {
      userId: dream.user_id,
      dreamId,
      status: 'generated',
      lang
    }).catch((err) => {
      console.error('notifyAnalysisOutcome error:', err.message)
    })

    generateImageIfPossible(best.analysis?.visual_prompt_en)
      .then(async (imageUrl) => {
        if (!imageUrl) return

        const { error: imageUpdateError } = await supabaseAdmin
          .from('dreams')
          .update({ ai_image_url: imageUrl })
          .eq('id', dreamId)

        if (imageUpdateError) {
          console.error('ai_image_url update error:', imageUpdateError.message)
        }
      })
      .catch((err) => {
        console.error('generateImageIfPossible error:', err.message)
      })

    return res.status(200).json({
      ok: true,
      generated: true,
      analysis: best.analysis,
      provider: best.provider,
      aurasLeft: spend.remaining
    })
  } catch (error) {
    console.error('generate-deep-analysis error:', error)

    if (spendDone && refundUserId) {
      try {
        await refundAuras(refundUserId, AURA_COST)
      } catch (refundError) {
        console.error('refund error:', refundError.message)
      }
    }

    await markDreamFailed(currentDreamId, error.message)

    if (currentDream?.user_id && currentDreamId) {
      notifyAnalysisOutcome(supabaseAdmin, {
        userId: currentDream.user_id,
        dreamId: currentDreamId,
        status: 'failed',
        lang
      }).catch((notifyError) => {
        console.error('failed notification error:', notifyError.message)
      })
    }

    return res.status(500).json({
      error: 'generation_failed',
      details: error.message
    })
  }
  }
