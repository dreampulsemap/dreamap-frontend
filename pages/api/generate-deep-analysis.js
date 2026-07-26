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
// SADECE SENKRON OPENAI AKIŞI
// -----------------------------------------------------------------------
// Cron worker, kuyruk (pending/processing) ve dış sweep servisi tamamen
// kaldırıldı. Vercel artık Hobby planında dahi 300sn'e kadar fonksiyon
// süresine izin veriyor, bu yüzden tüm işi bu tek route içinde, kullanıcı
// isteğini bekleterek senkron tamamlıyoruz.
//
// Başarısız olursa: Aura iadesi yapılır, dream 'failed' olarak işaretlenir
// ve kullanıcıya anında hata döner. Hiçbir kayıt 'pending' veya
// 'processing' durumunda asılı kalmaz — bu route artık o durumları hiç
// yazmıyor.
// =====================================================================

export const config = { maxDuration: 120 } // Hobby üst sınırı 300sn; OpenAI + görsel için güvenli bir pay

// OpenAI çağrısı için ayrılan bütçe — fonksiyonun maxDuration'ından
// bilinçli olarak düşük tutulur ki deadline aşımında düzgün hata dönebilelim.
const SYNC_DEADLINE_MS = 90_000

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

async function generateAnalysis({ dream, lang }) {
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
            `Content: "${cleanText(d.content || '')}"
Shadow focus: "${cleanText(d.premium_deep_analysis?.shadow_focus || '')}"`
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

  const deadlineAt = Date.now() + SYNC_DEADLINE_MS
  return generateWithOpenAIOnly(prompt, detectedLang, deadlineAt)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let spendDone = false
  let userIdForRefund = null

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

    if (dream.premium_deep_analysis_status === 'generated') {
      return res.status(200).json({ ok: true, alreadyGenerated: true })
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

    spendDone = true
    userIdForRefund = user.id

    // ---- SENKRON OPENAI ANALİZİ ----
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
  } catch (error) {
    console.error('Deep Analysis Generation Error:', error)

    // Aura zaten harcandıysa iade et, dream'i açıkça 'failed' yap.
    // Böylece hiçbir kayıt 'pending'/'processing' gibi ara bir durumda
    // asılı kalmaz — kullanıcı ya sonucu alır ya da net bir hata görür.
    if (spendDone && userIdForRefund) {
      try {
        await refundAuras(userIdForRefund, 8)
      } catch (refundError) {
        console.error('Refund Error:', refundError)
      }
    }

    try {
      const { dreamId } = req.body || {}
      if (dreamId) {
        await supabaseAdmin
          .from('dreams')
          .update({
            premium_deep_analysis_status: 'failed',
            premium_deep_analysis_error: error.message
          })
          .eq('id', dreamId)
      }
    } catch (statusError) {
      console.error('Failed-status update error:', statusError)
    }

    return res.status(500).json({
      error: 'generation_failed',
      details: error.message
    })
  }
}
