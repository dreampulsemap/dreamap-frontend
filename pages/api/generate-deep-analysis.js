import { createClient } from '@supabase/supabase-js'
import {
  cleanText,
  detectDreamLanguage,
  buildPrompt,
  generateWithOpenAIOnly,
  generateImageIfPossible
} from '@/lib/deepAnalysisEngine'
import { notifyAnalysisOutcome } from '@/lib/notify'

// =====================================================================
// PLAN A / PLAN B
// -----------------------------------------------------------------------
// PLAN A: bu route, isteği bekletmeden doğrudan OpenAI ile SENKRON analiz
//   üretmeyi dener (aynı OPENAI_API_KEY, normal jung analizindeki gibi).
//   Başarılı olursa kullanıcı sonucu ANINDA bu yanıtta alır — kuyruk yok,
//   cron yok, bildirim beklemek yok.
// PLAN B: PLAN A başarısız/boş/zaman aşımına uğrarsa (OpenAI'da geçici bir
//   sorun, kota, vb.) eskisi gibi 'pending' işaretlenir ve
//   /api/cron/process-deep-analysis worker'ı arka planda fire-and-forget
//   tetiklenir; cron-job.org → /api/cron/trigger-sweep güvenlik ağı olarak
//   kalmaya devam eder.
// =====================================================================

export const config = { maxDuration: 45 }

// PLAN A için ayrılan bütçe — Hobby'nin 60sn sert sınırının altında,
// Plan B'ye düşmek için de yeterli pay bırakıyor.
const SYNC_DEADLINE_MS = 30_000

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function triggerWorker(dreamId, lang) {
  const base = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL || 'www.lunosfer.com'}`
  const secret = process.env.CRON_SECRET

  // Yanıtı beklemeden ateşle-unut: worker'ın süresi bu isteğin süresini etkilemesin.
  fetch(`${base}/api/cron/process-deep-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {})
    },
    body: JSON.stringify({ dreamId, lang })
  }).catch((err) => {
    console.error('worker trigger failed (cron sweep will catch it later):', err.message)
  })
}

async function tryPlanA({ dream, lang }) {
  const { data: pastDreams } = await supabaseAdmin
    .from('dreams')
    .select('content, premium_deep_analysis')
    .eq('user_id', dream.user_id)
    .eq('premium_deep_analysis_status', 'generated')
    .neq('id', dream.id)
    .order('premium_deep_analysis_generated_at', { ascending: false })
    .limit(3)

  const pastContext = pastDreams?.length
    ? pastDreams
        .map(
          (d) =>
            `Content: "${cleanText(d.content || '')}"\nShadow focus: "${cleanText(d.premium_deep_analysis?.shadow_focus || '')}"`
        )
        .join('\n---\n')
    : 'No past history.'

  const detectedLang = detectDreamLanguage(dream.content || '', lang)

  const prompt = buildPrompt({
    dreamContent: cleanText(dream.content || ''),
    detectedLang,
    pastContext
  })

  const deadlineAt = Date.now() + SYNC_DEADLINE_MS
  return generateWithOpenAIOnly(prompt, detectedLang, deadlineAt)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)

    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId, lang = 'en' } = req.body || {}
    if (!dreamId) return res.status(400).json({ error: 'dream_id_required' })

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, content, premium_deep_analysis_status')
      .eq('id', dreamId)
      .single()

    if (dreamError || !dream) {
      return res.status(404).json({ error: 'dream_not_found' })
    }

    if (dream.premium_deep_analysis_status === 'pending' || dream.premium_deep_analysis_status === 'processing') {
      return res.status(200).json({ ok: true, queued: true, alreadyQueued: true })
    }

    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: 8
    })

    if (spendError) throw spendError

    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'no_auras' })
    }

    // ---- PLAN A: doğrudan OpenAI, senkron ----
    try {
      const best = await tryPlanA({ dream, lang })

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

      if (updateError) throw updateError

      // Bildirimi de gönder (Navbar zili / push) — kullanıcı zaten yanıtta
      // sonucu alıyor ama diğer sekmeler/cihazlar için tutarlılık sağlar.
      notifyAnalysisOutcome(supabaseAdmin, {
        userId: dream.user_id,
        dreamId,
        status: 'generated',
        lang
      }).catch((err) => console.error('Plan A notify error:', err.message))

      // Görsel best-effort, yanıtı bekletmeden arka planda dener.
      generateImageIfPossible(best.analysis.visual_prompt_en)
        .then(async (imageUrl) => {
          if (imageUrl) {
            await supabaseAdmin.from('dreams').update({ ai_image_url: imageUrl }).eq('id', dreamId)
          }
        })
        .catch((err) => console.error('Plan A image gen error:', err.message))

      return res.status(200).json({
        ok: true,
        generated: true,
        plan: 'a',
        analysis: best.analysis,
        provider: best.provider,
        aurasLeft: spend.remaining
      })
    } catch (planAError) {
      console.error('generate-deep-analysis: Plan A (sync OpenAI) failed, falling back to Plan B (queue):', planAError.message)
    }

    // ---- PLAN B: mevcut kuyruk + cron worker akışı ----
    const { error: updateError } = await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis_status: 'pending',
        premium_deep_analysis_error: null,
        premium_deep_analysis_lang: lang
      })
      .eq('id', dreamId)

    if (updateError) throw updateError

    triggerWorker(dreamId, lang)

    return res.status(200).json({
      ok: true,
      queued: true,
      plan: 'b',
      aurasLeft: spend.remaining
    })
  } catch (error) {
    console.error('Deep Analysis Enqueue Error:', error)
    return res.status(500).json({
      error: 'internal_server_error',
      details: error.message
    })
  }
}
