import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { extractGoalScene, buildGoalImagePrompt, generateOneImage } from '@/lib/goalImageGen'

export const config = { maxDuration: 60 }

const AURA_COST = 2 // generate-dream-image.js'deki tekli görsel üretim maliyetiyle tutarlı

// SADECE var olan bir hedefin kapağını (yeniden) üretir — GoalDetailModal'dan
// çağrılıyor. Yeni vizyon oluştururken AI artık kapak değil, SLAYT görseli
// üretiyor (bkz. pages/api/goals/generate-slide-image.js), o akış burada yok.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'goal_id_required' })

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, title, description')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    // ATOMİK aura düşüşü — image_credits yerine Aura kullanıyoruz (bkz.
    // migration 005'teki spend_auras RPC'si, TOCTOU'yu önlemek için).
    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: AURA_COST,
    })
    if (spendError) throw spendError
    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'insufficient_auras', cost: AURA_COST })
    }

    let scene = null
    try {
      scene = await extractGoalScene(goal.title, goal.description)
    } catch (e) {
      console.error('goals/generate-cover scene extraction error:', e)
    }
    const prompt = buildGoalImagePrompt(scene, goal.title)

    const { imageUrl: rawImageUrl, details } = await generateOneImage(prompt)

    if (!rawImageUrl) {
      // KÖK NEDEN NOTU: bu dal önceden hiçbir şey loglamadan doğrudan 502
      // dönüyordu — Vercel'de bu 502'ler "AI Kapak Üret çalışmıyor" hata
      // raporuna yol açtı ama loglarda `details` hiçbir yerde görünmüyordu,
      // her seferinde gerçek nedeni (Replicate/OpenAI'nin neden reddettiği)
      // kör noktada bırakıyordu. Artık console.error ile logluyoruz.
      console.error('goals/generate-cover: both providers failed —', details)
      // Krediyi GERİ VER, kullanıcı karşılıksız harcamış olmasın.
      await supabaseAdmin
        .from('user_profiles')
        .update({ premium_analysis_auras: spend.remaining + AURA_COST })
        .eq('id', user.id)
      return res.status(502).json({ error: 'image_generation_failed', details })
    }

    // Sağlayıcı URL'si (Replicate/DALL-E) geçicidir — kullanıcının kendi
    // yüklediği kapaklarla aynı bucket'a (goal-covers) kalıcı olarak
    // kopyalıyoruz.
    const imageUrl = await persistRemoteImage(rawImageUrl, {
      bucket: 'goal-covers',
      path: `${user.id}/${Date.now()}.jpg`,
    })

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({ cover_image_url: imageUrl, cover_image_source: 'ai_generated' })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError
    return res.status(200).json({ goal: updatedGoal, imageUrl, aurasLeft: spend.remaining })
  } catch (error) {
    console.error('goals/generate-cover error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
