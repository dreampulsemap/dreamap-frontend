import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { extractGoalScene, buildGoalImagePrompt, generateOneImage } from '@/lib/goalImageGen'

export const config = { maxDuration: 60 }

const AURA_COST = 2

// SlideEditor'dan çağrılıyor: her tıklamada TEK bir görsel üretir, goal'un
// cover_image_url'ine DOKUNMAZ — sadece üretilen görselin URL'ini döner,
// istemci onu addSlide() ile slayt olarak ekliyor. Tekrar tekrar
// çağrılabilir, her seferinde yeni ve farklı bir görsel üretir (Flux/DALL-E
// stokastik olduğu için aynı hedef için bile her çağrı farklı sonuç verir).
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
      console.error('goals/generate-slide-image scene extraction error:', e)
    }
    const prompt = buildGoalImagePrompt(scene, goal.title)

    const { imageUrl: rawImageUrl, details } = await generateOneImage(prompt)

    if (!rawImageUrl) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ premium_analysis_auras: spend.remaining + AURA_COST })
        .eq('id', user.id)
      return res.status(502).json({ error: 'image_generation_failed', details })
    }

    const imageUrl = await persistRemoteImage(rawImageUrl, {
      bucket: 'goal-covers',
      path: `${user.id}/${Date.now()}.jpg`,
    })

    return res.status(200).json({ imageUrl, aurasLeft: spend.remaining })
  } catch (error) {
    console.error('goals/generate-slide-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
