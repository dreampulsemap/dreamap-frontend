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
// SADECE OpenAI, TAMAMEN SENKRON — kuyruk yok, cron yok, dış worker yok.
// -----------------------------------------------------------------------
// İlk deneme başarısız/boş/zaman aşımına uğrarsa, AYNI istek içinde bir
// kez daha denenir (kısa bir gecikmeyle — geçici OpenAI hatalarını
// (rate limit, ağ, vs.) tolere etmek için). İkinci deneme de başarısız
// olursa rüya 'failed' olarak işaretlenir, Aura iade edilir ve kullanıcıya
// hemen hata döner. Hiçbir zaman 'pending'/'processing' durumunda takılı
// kalmaz, çünkü onu işleyecek bir arka plan mekanizması artık yok.
// =====================================================================

export const config = { maxDuration: 60 }

// Hobby planının 60sn sert tavanına yakın — OpenAI'ın uzun JSON çıktıyı
// tamamlaması için yeterli süre. İki ayrı deneme yapacak bütçe yok (biri
// bile bu süreye yakın sürebiliyor), o yüzden tek denemeye tüm bütçe veriliyor.
const SYNC_DEADLINE_MS = 55_000

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function attemptAnalysis({ dream, lang, deadlineMs }) {
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

  const deadlineAt = Date.now() + deadlineMs
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

    // ---- Tek deneme, tam bütçeyle ----
    let best = null
    let lastError = null

    try {
      best = await attemptAnalysis({ dream, lang, deadlineMs: SYNC_DEADLINE_MS })
    } catch (err) {
      lastError = err
      console.error('generate-deep-analysis: OpenAI attempt failed:', err.message)
    }

    if (best) {
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
      }).catch((err) => console.error('notify error:', err.message))

      // Görsel best-effort, yanıtı bekletmeden arka planda dener.
      generateImageIfPossible(best.analysis.visual_prompt_en)
        .then(async (imageUrl) => {
          if (imageUrl) {
            await supabaseAdmin.from('dreams').update({ ai_image_url: imageUrl }).eq('id', dreamId)
          }
        })
        .catch((err) => console.error('image gen error:', err.message))

      return res.status(200).json({
        ok: true,
        generated: true,
        analysis: best.analysis,
        provider: best.provider,
        aurasLeft: spend.remaining
      })
    }

    // ---- Deneme başarısız: 'pending'de takılı bırakma — direkt failed + iade ----
    console.error('generate-deep-analysis: OpenAI attempt failed:', lastError?.message)

    const refundResult = await supabaseAdmin.rpc('refund_auras', {
      p_user_id: user.id,
      p_amount: 8
    })
    if (refundResult.error) console.error('refund error:', refundResult.error.message)

    await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis_status: 'failed',
        premium_deep_analysis_error: lastError?.message || 'openai_failed',
        premium_deep_analysis_lang: lang
      })
      .eq('id', dreamId)

    notifyAnalysisOutcome(supabaseAdmin, {
      userId: dream.user_id,
      dreamId,
      status: 'failed',
      lang
    }).catch((err) => console.error('notify error:', err.message))

    return res.status(502).json({
      error: 'analysis_failed',
      details: lastError?.message || 'openai_failed',
      aurasRefunded: true
    })
  } catch (error) {
    console.error('Deep Analysis Enqueue Error:', error)
    return res.status(500).json({
      error: 'internal_server_error',
      details: error.message
    })
  }
}
