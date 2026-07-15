import { createClient } from '@supabase/supabase-js'

export const config = {
  maxDuration: 60,
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : ''

    if (!token) {
      return res.status(401).json({ error: 'missing_token' })
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    const { dreamId } = req.body || {}

    if (!dreamId) {
      return res.status(400).json({ error: 'missing_dream_id' })
    }

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, content, ai_image_url, ai_sentiment, ai_archetypes')
      .eq('id', dreamId)
      .single()

    if (dreamError || !dream) {
      return res.status(404).json({ error: 'dream_not_found' })
    }

    if (dream.ai_image_url) {
      return res.status(200).json({
        ok: true,
        alreadyGenerated: true,
        imageUrl: dream.ai_image_url,
      })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, premium_analysis_auras')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ error: 'profile_not_found' })
    }

    const auras = Number(profile.premium_analysis_auras || 0)

    if (auras < 2) {
      return res.status(402).json({ error: 'no_auras' })
    }

    const topArchetype = Array.isArray(dream.ai_archetypes) && dream.ai_archetypes[0] ? dream.ai_archetypes[0] : 'Dreamer'
    const shortContent = String(dream.content || '').replace(/\s+/g, ' ').trim().slice(0, 240)
    
    const imagePrompt = `A breathtaking, ethereal dreamscape representing the ${topArchetype} archetype, with moody and atmospheric lighting, featuring mystical elements, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, and glowing gold accents, oil painting texture mixed with modern digital double-exposure, evocative of ${dream.ai_sentiment || 'mystery'}, high-art composition, hauntingly beautiful, cinematic, octane render, masterpiece, extremely detailed, inspired by Carl Jung's subconscious visual representations, based on: ${shortContent}`

    const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`, // Bearer yerine Token standardına geçildi (Replicate Özel İsteği)
        'Content-Type': 'application/json',
        'Prefer': 'wait=15'
      },
      body: JSON.stringify({
        input: {
          prompt: imagePrompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 90,
          num_inference_steps: 4
        }
      })
    })

    const replicateData = await replicateRes.json().catch(() => null)

    if (!replicateRes.ok || !replicateData?.output?.[0]) {
      console.error('Replicate error details:', replicateData)
      const errorDetail = replicateData?.error || replicateData?.detail || 'Replicate API rejected the request.'
      return res.status(replicateRes.status || 502).json({ 
        error: 'image_generation_failed',
        details: `Replicate HTTP ${replicateRes.status}: ${errorDetail}`
      })
    }

    const imageUrl = replicateData.output[0]

    const nextAuras = auras - 2
    const { error: auraUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ premium_analysis_auras: nextAuras })
      .eq('id', user.id)

    if (auraUpdateError) {
      return res.status(500).json({ error: 'aura_update_failed' })
    }

    const { error: saveError } = await supabaseAdmin
      .from('dreams')
      .update({
        ai_image_url: imageUrl,
        ai_image_prompt: imagePrompt,
      })
      .eq('id', dream.id)

    if (saveError) {
      return res.status(500).json({ error: 'save_failed' })
    }

    return res.status(200).json({
      ok: true,
      imageUrl,
      aurasLeft: nextAuras,
    })
  } catch (error) {
    console.error('generate-dream-image fatal error:', error)
    return res.status(500).json({
      error: 'internal_server_error',
      details: error.message || 'unknown_error',
    })
  }
}