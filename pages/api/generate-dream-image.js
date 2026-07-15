import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const config = {
  maxDuration: 60,
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

    if (!token) return res.status(401).json({ error: 'missing_token' })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId } = req.body || {}
    if (!dreamId) return res.status(400).json({ error: 'missing_dream_id' })

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, content, ai_image_url, ai_sentiment, ai_archetypes')
      .eq('id', dreamId)
      .single()

    if (dreamError || !dream) return res.status(404).json({ error: 'dream_not_found' })

    if (dream.ai_image_url) {
      return res.status(200).json({ ok: true, alreadyGenerated: true, imageUrl: dream.ai_image_url })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, premium_analysis_auras')
      .eq('id', user.id)
      .single()

    const auras = Number(profile?.premium_analysis_auras || 0)
    if (auras < 2) return res.status(402).json({ error: 'no_auras' })

    // =========================================================================
    // ADIM 1: OPENAI İLE KUSURSUZ GÖRSEL PROMPTU ÜRETİMİ (Sahne Odaklı)
    // =========================================================================
    const promptEnhancement = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert AI image prompt engineer. Read the user\'s dream (in any language), extract the single most visually striking, surreal, and specific scene (characters, objects, environments, actions). Translate and rewrite it into a highly detailed, cinematic English prompt for a diffusion model. DO NOT use the word "dream". Just output the descriptive prompt.' 
        },
        { role: 'user', content: dream.content }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const optimizedScene = promptEnhancement.choices[0].message.content.trim();
    
    // Lunosfer Sanat Stilini Promptun Sonuna Enjekte Et
    const imagePrompt = `${optimizedScene}, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, and glowing gold accents, ethereal lighting, oil painting texture mixed with modern digital double-exposure, masterpiece, octane render, extremely detailed, hauntingly beautiful.`;

    // =========================================================================
    // ADIM 2: REPLICATE ÜZERİNDEN GÖRSEL ÜRETİMİ
    // =========================================================================
    const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=15'
      },
      body: JSON.stringify({
        input: {
          prompt: imagePrompt,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 90,
          num_inference_steps: 4
        }
      })
    })

    const replicateData = await replicateRes.json().catch(() => null)

    if (!replicateRes.ok || !replicateData?.output?.[0]) {
      console.error('Replicate Error:', replicateData)
      return res.status(502).json({ error: 'image_generation_failed', details: replicateData?.error || 'Unknown Replicate Error' })
    }

    const tempImageUrl = replicateData.output[0]

    // =========================================================================
    // ADIM 3: GÖRSELİ KALICI HALE GETİRME (SUPABASE STORAGE UPLOAD)
    // =========================================================================
    let finalImageUrl = tempImageUrl;
    
    try {
      const imageFetchRes = await fetch(tempImageUrl);
      if (imageFetchRes.ok) {
        const arrayBuffer = await imageFetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `${dreamId}-${Date.now()}.webp`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('dream_images') // Açtığınız bucket'ın adı!
          .upload(fileName, buffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from('dream_images').getPublicUrl(fileName);
          finalImageUrl = publicUrl;
        }
      }
    } catch (storageError) {
      console.error("Storage upload failed, falling back to temp url", storageError);
    }

    // =========================================================================
    // ADIM 4: VERİTABANINA KAYIT VE BAKİYE DÜŞÜMÜ
    // =========================================================================
    const nextAuras = auras - 2
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id)
    await supabaseAdmin.from('dreams').update({ ai_image_url: finalImageUrl, ai_image_prompt: imagePrompt }).eq('id', dream.id)

    return res.status(200).json({
      ok: true,
      imageUrl: finalImageUrl,
      aurasLeft: nextAuras,
    })
  } catch (error) {
    console.error('generate-dream-image error:', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}