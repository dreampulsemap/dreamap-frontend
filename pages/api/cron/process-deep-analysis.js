import { createClient } from '@supabase/supabase-js'
import {
  cleanText,
  detectDreamLanguage,
  buildPrompt,
  generateWithOpenAIOnly,
  generateImageIfPossible,
  isSupportedLang,
  REQUEST_DEADLINE_MS
} from '@/lib/deepAnalysisEngine'
import { notifyAnalysisOutcome } from '@/lib/notify'
import { isPersistedImageUrl } from '@/lib/imageUrlUtils'

// =====================================================================
// DERİN ANALİZ WORKER'I — asıl LLM işini burada, istek/yanıt döngüsünün
// DIŞINDA yapıyoruz. Bu route iki şekilde tetiklenir:
//
//  1. ANINDA: /api/generate-deep-analysis, kullanıcı isteği kuyruğa
//     eklendiği anda bu route'u body'de dreamId ile "fire-and-forget"
//     çağırır → kullanıcı genelde saniyeler içinde bildirim alır.
//  2. SÜPÜRME (GÜVENLİK AĞI): Bu route'u dışarıdan HER DAKİKA çağıran
//     ücretsiz bir cron servisi (örn. cron-job.org, UptimeRobot, Upstash
//     QStash) kurun — body GÖNDERMEDEN, sadece
//     `Authorization: Bearer <CRON_SECRET>` header'ıyla POST.
//     Body'de dreamId yoksa: en eski 'pending' durumdaki rüyayı bulup işler.
//     Bu, adım 1'deki fire-and-forget çağrısı ağ hatası/soğuk başlangıç
//     yüzünden kaybolursa (ya da fonksiyon 300sn üst sınırını aşarsa) işin
//     asla sonsuza dek 'pending' kalmamasını garantiler.
//
//  NOT — Vercel'in KENDİ Cron özelliği (vercel.json) Hobby planında günde
//  SADECE 1 kez çalışabiliyor, bu yüzden onun yerine yukarıdaki dış servisi
//  kullanın. Pro plana geçerseniz vercel.json'a dakikalık bir cron da
//  eklenebilir.
//
//  Bu route'un maxDuration'ı, tek bir dream'in TÜM üretim + görsel
//  aşamasını (REQUEST_DEADLINE_MS + görsel payı + güvenlik payı)
//  kapsayacak şekilde ayarlı. Hobby planda tavan 60sn'dir — bu yüzden
//  motor tarafındaki REQUEST_DEADLINE_MS (35sn) hâlâ önemlidir.
// =====================================================================

export const config = { maxDuration: 60 }

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

// Aynı dream'in iki paralel worker koşusu tarafından işlenmesini engeller:
// yalnızca hâlâ 'pending' durumundaysa 'processing'e çevirir. Satır dönmezse
// (0 satır etkilendiyse) başka bir koşu zaten almış demektir — sessizce çık.
async function claimDream(dreamId) {
  const { data, error } = await supabaseAdmin
    .from('dreams')
    .update({ premium_deep_analysis_status: 'processing' })
    .eq('id', dreamId)
    .eq('premium_deep_analysis_status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function findOldestPendingDreamId() {
  const { data, error } = await supabaseAdmin
    .from('dreams')
    .select('id')
    .eq('premium_deep_analysis_status', 'pending')
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.id || null
}

async function processDream(dream) {
  const lang = dream.premium_deep_analysis_lang || 'en'

  try {
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

    const detectedLang = isSupportedLang(dream.original_language)
      ? dream.original_language
      : detectDreamLanguage(dream.content || '', lang)

    const prompt = buildPrompt({
      dreamContent: cleanText(dream.content || ''),
      detectedLang,
      pastContext
    })

    const deadlineAt = Date.now() + REQUEST_DEADLINE_MS
    const best = await generateWithOpenAIOnly(prompt, detectedLang, deadlineAt)

    // ÖNEMLİ: DB'yi 'generated' yapıp bildirimi HEMEN gönder — görsel üretimini
    // (best-effort, 20sn'e kadar sürebilir) bundan SONRAYA bırak. Önceden görsel
    // üretimi bildirimden önceydi; toplam süre 60sn'lik maxDuration sınırına çok
    // yaklaşınca fonksiyon tam bildirim adımına gelirken sert şekilde
    // öldürülebiliyordu — sonuç: DB'de 'generated' ama kullanıcıya hiç haber
    // gitmemiş oluyordu. Şimdi bildirim, görsel beklenmeden garantiye alınıyor.
    const { error: updateError } = await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis: best.analysis,
        premium_deep_analysis_status: 'generated',
        premium_deep_analysis_generated_at: new Date().toISOString(),
        premium_deep_analysis_provider: best.provider,
        premium_deep_analysis_error: null
      })
      .eq('id', dream.id)

    if (updateError) throw updateError

    await notifyAnalysisOutcome(supabaseAdmin, {
      userId: dream.user_id,
      dreamId: dream.id,
      status: 'generated',
      lang
    })

    // Görsel best-effort: başarısız olursa ya da süre yetişmezse analiz yine de
    // kullanıcıya ulaşmış olur, görsel eksik kalır (sonradan tamamlanabilir).
    try {
      const imageUrl = await generateImageIfPossible(best.analysis.visual_prompt_en, {
        userId: dream.user_id,
        dreamId: dream.id,
      })
      if (imageUrl) {
        await supabaseAdmin
          .from('dreams')
          .update({
            ai_image_url: imageUrl,
            image_source: 'ai',
            image_status: isPersistedImageUrl(imageUrl) ? 'ok' : 'needs_persist',
            image_checked_at: new Date().toISOString(),
          })
          .eq('id', dream.id)
      }
    } catch (imageError) {
      console.error('process-deep-analysis: post-notify image generation failed:', dream.id, imageError.message)
    }

    return { ok: true, dreamId: dream.id, provider: best.provider }
  } catch (e) {
    console.error('process-deep-analysis failure:', dream.id, e.message)

    try {
      await refundAuras(dream.user_id, 8)
    } catch (refundError) {
      console.error('Refund Error:', refundError)
    }

    await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis_status: 'failed',
        premium_deep_analysis_error: e.message
      })
      .eq('id', dream.id)

    await notifyAnalysisOutcome(supabaseAdmin, {
      userId: dream.user_id,
      dreamId: dream.id,
      status: 'failed',
      lang
    })

    return { ok: false, dreamId: dream.id, reason: e.message, failures: e.failures || [] }
  }
}

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
    const { dreamId: explicitDreamId } = req.body || {}
    const dreamId = explicitDreamId || (await findOldestPendingDreamId())

    if (!dreamId) {
      return res.status(200).json({ ok: true, message: 'no_pending_dreams' })
    }

    const dream = await claimDream(dreamId)
    if (!dream) {
      // Zaten alınmış (processing/generated/failed) — çift işlem yok.
      return res.status(200).json({ ok: true, message: 'already_claimed_or_not_pending', dreamId })
    }

    const result = await processDream(dream)
    return res.status(200).json(result)
  } catch (error) {
    console.error('process-deep-analysis handler error:', error)
    return res.status(500).json({ error: 'internal_server_error', details: error.message })
  }
}
