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
    title: '',
    summary: '',
    motiv: '',
    sentiment: '',
    archetypes: [],
    shadow_focus: '',
    core_conflict: '',
    individuation_path: '',
    symbolic_reading: '',
    reflection_questions: [
      "Psychological question 1",
      "Psychological question 2",
      "Psychological question 3"
    ],
    persona_profile: { name: '', tagline: '', archetypal_style: '', public_self: '', hidden_self: '', strengths: [], shadow_sides: [], core_fears: [], emotional_needs: [] },
    symbols: [{ symbol: '', meaning: '', emotional_charge: '', intensity: 0, color: '' }],
    emotions: [{ emotion: '', score: 0 }],
  }
}

function buildPrompt({ content, targetLangName, pastContext }) {
  return `
Perform a profound, comprehensive, and highly resonant Jungian dream analysis of the following dream.

CRITICAL REQUIREMENT:
The entire JSON values MUST be written entirely in: ${targetLangName}. Do not mix languages. Use natural, idiomatic phrasing.

Rules for the Deep Analysis:
- "shadow_focus", "core_conflict", "individuation_path": Minimum 2-3 long paragraphs each.
- "symbolic_reading": Decode metaphors, animals, colors, and narratives in extreme detail (minimum 3 paragraphs).
- "reflection_questions": Must provide exactly 3 penetrating questions.

CONTEXT-AWARE ANALYSIS (JUNGİAN DREAM MEMORY):
Past Dreams Summary:
"""
${pastContext || 'No past dream history available.'}
"""

Dream:
"""
${content}
"""

Required JSON shape:
${JSON.stringify(buildShape(), null, 2)}
`.trim()
}

function parseJsonSafely(text) {
  if (!text || typeof text !== 'string') return null
  try { return JSON.parse(text) } 
  catch (err) {
    try { return JSON.parse(text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()) } 
    catch (err2) { return null }
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

    const { data: dream } = await supabaseAdmin.from('dreams').select('id, user_id, content, original_language, premium_deep_analysis, ai_image_url').eq('id', dreamId).single()
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })

    if (containsCrisisTokens(dream.content)) {
      await supabaseAdmin.from('dreams').update({ premium_deep_analysis_status: 'failed', premium_deep_analysis_error: 'safety_filter_triggered' }).eq('id', dream.id)
      return res.status(422).json({ error: 'safety_filter_triggered' })
    }

    if (dream.premium_deep_analysis) return res.status(200).json({ ok: true, alreadyGenerated: true, analysis: dream.premium_deep_analysis })

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('id, premium_analysis_auras').eq('id', user.id).single()
    const auras = Number(profile?.premium_analysis_auras || 0)
    if (auras < 8) return res.status(402).json({ error: 'no_auras' })

    await supabaseAdmin.from('dreams').update({ premium_deep_analysis_status: 'generating' }).eq('id', dream.id)

    const { data: pastDreams } = await supabaseAdmin.from('dreams').select('content, premium_deep_analysis').eq('user_id', user.id).eq('premium_deep_analysis_status', 'generated').neq('id', dreamId).order('premium_deep_analysis_generated_at', { ascending: false }).limit(5)
    let pastContext = ""
    if (pastDreams && pastDreams.length > 0) {
      pastContext = pastDreams.map((d, i) => `[Past Dream ${i+1}] Title: ${d.premium_deep_analysis?.title || ""}\nContent: "${d.content}"`).join("\n\n")
    }

    // GÖREV 1: REPLICATE GÖRSEL ÜRETİMİ VE SUPABASE YÜKLEMESİ (Asenkron başlar)
    const imageTask = async () => {
      try {
        if (dream.ai_image_url) return dream.ai_image_url; // Zaten varsa tekrar üretme

        const shortContent = String(dream.content || '').replace(/\s+/g, ' ').trim().slice(0, 240)
        const imagePrompt = `A breathtaking, ethereal dreamscape, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, glowing gold accents, ethereal lighting, masterpiece, octane render, extremely detailed, subconscious visual representation of this dream: ${shortContent}`;

        const replicateRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`, 'Content-Type': 'application/json', 'Prefer': 'wait=15' },
          body: JSON.stringify({ input: { prompt: imagePrompt, aspect_ratio: "1:1", output_format: "webp", output_quality: 90, num_inference_steps: 4 } })
        })

        const replicateData = await replicateRes.json().catch(() => null)
        if (!replicateRes.ok || !replicateData?.output?.[0]) return null;

        const tempUrl = replicateData.output[0];

        // Supabase Storage Yüklemesi
        const imageFetchRes = await fetch(tempUrl);
        if (!imageFetchRes.ok) return tempUrl;

        const arrayBuffer = await imageFetchRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `${dream.id}-${Date.now()}.webp`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('dream_images')
          .upload(fileName, buffer, { contentType: 'image/webp', upsert: true });

        if (uploadError) return tempUrl;

        const { data: { publicUrl } } = supabaseAdmin.storage.from('dream_images').getPublicUrl(fileName);
        return publicUrl;
      } catch (e) {
        console.error("Image Task Error:", e);
        return null;
      }
    };

    // GÖREV 2: OPENAI DERİN ANALİZ (Asenkron başlar)
    const analysisTask = async () => {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: buildPrompt({ content: dream.content, targetLangName: LANG_MAP[lang || dream.original_language || 'en'], pastContext }) }],
      })
      const raw = completion?.choices?.[0]?.message?.content || '{}';
      return parseJsonSafely(raw);
    };

    // İKİ GÖREVİ AYNI ANDA BEKLE (Vercel Timeout Süresini Yarı Yarıya Azaltır!)
    const [finalImageUrl, analysis] = await Promise.all([imageTask(), analysisTask()]);

    if (!analysis) {
      await supabaseAdmin.from('dreams').update({ premium_deep_analysis_status: 'failed', premium_deep_analysis_error: 'invalid_json' }).eq('id', dream.id)
      return res.status(500).json({ error: 'invalid_json_from_model' })
    }

    const nextAuras = auras - 8
    await supabaseAdmin.from('user_profiles').update({ premium_analysis_auras: nextAuras }).eq('id', user.id)

    await supabaseAdmin.from('dreams').update({
      premium_deep_analysis: analysis,
      premium_deep_analysis_status: 'generated',
      premium_deep_analysis_error: null,
      premium_deep_analysis_generated_at: new Date().toISOString(),
      ai_image_url: finalImageUrl || null
    }).eq('id', dream.id)

    return res.status(200).json({ ok: true, analysis, aurasLeft: nextAuras })
  } catch (error) {
    console.error('generate-deep-analysis error', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
}