import { createClient } from '@supabase/supabase-js'

// =====================================================================
// KUYRUĞA EKLEME UÇ NOKTASI — artık LLM çağrılarını KENDİSİ yapmıyor.
// Önceden bu route tüm sağlayıcı denemelerini + görsel üretimini senkron
// yapıyordu, bu da Vercel'in 60sn sert maxDuration sınırına takılıyordu.
//
// Yeni akış:
//  1. Bu route sadece: Aura düş, dream'i 'pending' işaretle, HEMEN 200 dön.
//  2. Gerçek üretim /api/cron/process-deep-analysis içinde arka planda olur:
//     - Bu route işi bitirir bitirmez o worker'ı "fire-and-forget" tetikler
//       (yanıtı beklemeden), yani genelde kullanıcı saniyeler içinde bildirim alır.
//     - Ayrıca dışarıdan (cron-job.org gibi ücretsiz bir servisten) her dakika
//       çağrılacak bir güvenlik ağı olarak da çalışır — bekleyen/yarım kalan
//       işleri toplar. Bkz. pages/api/cron/process-deep-analysis.js üstündeki not.
// =====================================================================

export const config = { maxDuration: 15 }

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
      .select('id, user_id, premium_deep_analysis_status')
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
