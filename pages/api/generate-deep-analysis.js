import OpenAI from 'openai'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js'

export const config = {
  maxDuration: 60,
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

const LANG_MAP = { en: 'English', tr: 'Turkish (Türkçe)', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese' }

const SYSTEM_PROMPT = `You are an elite, world-class Jungian dream analyst writing for Lunosfer, a premium dream-journaling product.
Provide a breathtakingly insightful, compassionate, and psychologically profound analysis.
Ground every claim strictly in details actually present in the dream text. Never invent events, people, or symbols that were not mentioned.

CRITICAL INSTRUCTION FOR LENGTH AND DEPTH:
Every single text value you generate under "shadow_focus", "core_conflict", "individuation_path", and "symbolic_reading" MUST be extremely detailed, high-density, and fully elaborated. 
Do not output short or brief summaries. Each of these sections MUST consist of at least 2 to 3 long, psychologically rich paragraphs (minimum 150-250 words per section).

Respond with valid JSON only, no markdown, and no text outside the JSON structure.`

function containsCrisisTokens(text) {
  if (!text) return false;
  const lowercase = text.toLowerCase();
  const crisisTokens = ['intihar', 'suicide', 'kendimi öldürmek', 'canıma kıymak', 'kill myself', 'ölmek istiyorum', 'want to die', 'kendime zarar vermek', 'self harm'];
  return crisisTokens.some(token => lowercase.includes(token));
}

function buildShape() {
  return {
    title: '', summary: '', motiv: '', sentiment: '', visual_prompt_en: '',
    archetypes: [], shadow_focus: '', core_conflict: '', individuation_path: '',
    symbolic_reading: '', reflection_questions: ["Q1", "Q2", "Q3"],
    persona_profile: { name: '', tagline: '', archetypal_style: '', public_self: '', hidden_self: '', strengths: [], shadow_sides: [], core_fears: [], emotional_needs: [] },
    symbols: [{ symbol: '', meaning: '', emotional_charge: '', intensity: 0, color: '' }],
    emotions: [{ emotion: '', score: 0 }],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const token = (req.headers.authorization || '').startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : ''
    if (!token) return res.status(401).json({ error: 'missing_token' })

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId, lang = 'en' } = req.body || {}
    if (!dreamId) return res.status(400).json({ error: 'missing_dream_id' })

    const { data: dream } = await supabaseAdmin.from('dreams').select('id, user_id, content, original_language, premium_deep_analysis').eq('id', dreamId).single()
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })

    if (containsCrisisTokens(dream.content)) {
      await supabaseAdmin.from('dreams').update({ premium_deep_analysis_status: 'failed', premium_deep_analysis_error: 'safety_filter_triggered' }).eq('id', dream.id)
      return res.status(422).json({ error: 'safety_filter_triggered', message: 'Klinik güvenlik uyarısı tetiklendi.' })
    }

    if (dream.premium_deep_analysis) return res.status(200).json({ ok: true, alreadyGenerated: true, analysis: dream.premium_deep_analysis })

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('id, premium_analysis_auras').eq('id', user.id).single()
    const auras = Number(profile?.premium_analysis_auras || 0)
    if (auras < 8) return res.status(402).json({ error: 'no_auras' })

    await supabaseAdmin.from('dreams').update({ premium_deep_analysis_status: 'generating' }).eq('id', dream.id)

    const { data: pastDreams } = await supabaseAdmin.from('dreams').select('content, premium_deep_analysis').eq('user_id', user.id).eq('premium_deep_analysis_status', 'generated').neq('id', dreamId).order('premium_deep_analysis_generated_at', { ascending: false }).limit(5)
    let pastContext = ""
    if (pastDreams && pastDreams.length > 0) {
      pastContext = pastDreams.map((d, i) => `[Past Dream ${i+1}] Title: ${d.premium_deep_analysis?.title || ""}\nContent: "${d.content}"\nPast Shadow: "${d.premium_deep_analysis?.shadow_focus || ""}"`).join("\n\n")
    }

    const prompt = `
      ${SYSTEM_PROMPT}
      Target Language: ${LANG_MAP[lang || dream.original_language || 'en'] || 'English'}
      Past History: ${pastContext}
      Current Dream: ${dream.content}
      Return JSON: ${JSON.stringify(buildShape())}
    `;

    // GÜNCEL KÜTÜPHANE İLE JSON MODE AKTİF EDİLDİ (Maliyet ve hız optimizasyonu ile)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { 
        maxOutputTokens: 2000, 
        temperature: 0.7,
        responseMimeType: "application/json" 
      }
    });

    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());

    // =========================================================================
    // HEDİYE KOZMİK RÜYA GÖRSELİ ÜRETİMİ (Flux Schnell Entegrasyonu)
    // =========================================================================
    let finalImageUrl = null
    let imagePrompt = `${analysis.visual_prompt_en || dream.content.slice(0, 150)}, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, glowing gold accents, ethereal lighting, masterpiece, octane render.`

    try {
      const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait=15' },
        body: JSON.stringify({ input: { prompt: imagePrompt, aspect_ratio: "1:1", output_format: "webp", output_quality: 90, num_inference_steps: 4 } })
      })

      const replicateData = await replicateRes.json().catch(() => null)
      if (replicateRes.ok && replicateData?.output?.[0]) {
        const tempImageUrl = replicateData.output[0];
        
        try {
          const imageFetchRes = await fetch(tempImageUrl);
          if (imageFetchRes.ok) {
            const buffer = Buffer.from(await imageFetchRes.arrayBuffer());
            const fileName = `${dreamId}-${Date.now()}.webp`;

            const { error: uploadError } = await supabaseAdmin.storage
              .from('dream_images')
              .upload(fileName, buffer, { contentType: 'image/webp', upsert: true });

            if (!uploadError) {
              finalImageUrl = supabaseAdmin.storage.from('dream_images').getPublicUrl(fileName).data.publicUrl;
            } else {
              finalImageUrl = tempImageUrl; 
            }
          }
        } catch (storageError) {
          finalImageUrl = tempImageUrl;
        }
      }
    } catch (imageError) {
      console.error('Replicate image generation error:', imageError)
    }

    const nextAuras = auras - 8
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id)

    await supabaseAdmin.from('dreams').update({
      premium_deep_analysis: analysis,
      premium_deep_analysis_status: 'generated',
      premium_deep_analysis_error: null,
      premium_deep_analysis_generated_at: new Date().toISOString(),
      ai_image_url: finalImageUrl || null,
      ai_image_prompt: imagePrompt || null
    }).eq('id', dream.id)

    return res.status(200).json({ ok: true, analysis, aurasLeft: nextAuras })
  } catch (error) {
    console.error('generate-deep-analysis error', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}