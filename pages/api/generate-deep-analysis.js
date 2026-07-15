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

const LANG_MAP = {
  en: 'English',
  tr: 'Turkish (Türkçe)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  pt: 'Portuguese (Português)',
  ru: 'Russian (Русский)',
  ja: 'Japanese (日本語)'
}

const SYSTEM_PROMPT = `You are an elite, world-class Jungian dream analyst writing for Lunosfer, a premium dream-journaling product.
Provide a breathtakingly insightful, compassionate, and psychologically profound analysis.
Ground every claim strictly in details actually present in the dream text. Never invent events, people, or symbols that were not mentioned.

CRITICAL INSTRUCTION FOR LENGTH AND DEPTH:
Every single text value you generate under "shadow_focus", "core_conflict", "individuation_path", and "symbolic_reading" MUST be extremely detailed, high-density, and fully elaborated. 
Do not output short or brief summaries. Each of these sections MUST consist of at least 2 to 3 long, psychologically rich paragraphs (minimum 150-250 words per section) that feel highly bespoke, elite, and intellectually stimulating.

Respond with valid JSON only, no markdown, and no text outside the JSON structure.`

// Klinik Güvenlik Filtresi (Tetikleyici kelimeleri denetler)
function containsCrisisTokens(text) {
  if (!text) return false;
  const lowercase = text.toLowerCase();
  const crisisTokens = [
    'intihar', 'suicide', 'kendimi öldürmek', 'canıma kıymak', 'kill myself', 
    'ölmek istiyorum', 'want to die', 'kendime zarar vermek', 'self harm'
  ];
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
    reflection_questions: [],
    persona_profile: {
      name: '',
      tagline: '',
      archetypal_style: '',
      public_self: '',
      hidden_self: '',
      strengths: [],
      shadow_sides: [],
      core_fears: [],
      emotional_needs: [],
    },
    symbols: [
      {
        symbol: '',
        meaning: '',
        emotional_charge: '',
        intensity: 0,
        color: '',
      },
    ],
    emotions: [
      { emotion: '', score: 0 },
    ],
    visual_theme: {
      background_color: '',
      text_color: '',
      primary_color: '',
      secondary_color: '',
      accent_color: '',
    },
    section_themes: {
      persona: { primary_color: '', secondary_color: '', accent_color: '' },
      shadow: { primary_color: '', secondary_color: '', accent_color: '' },
      transformation: { primary_color: '', secondary_color: '', accent_color: '' },
    },
  }
}

function buildPrompt({ content, targetLangName, pastContext }) {
  return `
Perform a profound, comprehensive, and highly resonant Jungian dream analysis of the following dream.

CRITICAL REQUIREMENT:
The entire JSON values, strings, array elements, meanings, titles, and explanations MUST be written entirely in: ${targetLangName}.
Do not mix languages. Use natural, idiomatic and poetic phrasing of this target language.

CONTEXT-AWARE ANALYSIS (JUNGİAN DREAM MEMORY):
Below is a summary of the dreamer's past dreams and psychological patterns:
"""
${pastContext || 'No past dream history available.'}
"""
Carefully compare the new dream with this history. 
Identify recurring symbols, developing archetypes, and evolving psychic dynamics. 
Focus heavily on the "unresolved aspects" of their psyche from past dreams. Analyze how this new dream compensates for, expands on, or challenges those unresolved patterns.

Rules for the Deep Analysis:
- "shadow_focus": Unveil hidden or unacknowledged parts of the psyche in extreme depth, specifically highlighting recurring or unresolved shadow elements from past history (minimum 2-3 long paragraphs).
- "core_conflict": Identify the central psychological tension between conscious persona and unconscious drive, comparing it with their psychological history (minimum 2-3 long paragraphs).
- "individuation_path": Provide actionable, personal guidance based on this dream's imagery and unresolved past conflicts (minimum 2-3 long paragraphs).
- "symbolic_reading": Decode metaphors, animals, colors, and narratives in extreme detail (minimum 3 paragraphs).
- "reflection_questions": 3 penetrating questions based on specifics of this dream and recurring unresolved patterns.
- "persona_profile": Archetypal profile currently embodied by the dreamer.

Dream:
"""
${content}
"""

Required JSON shape (keep exactly these keys, fill in real content in the target language):
${JSON.stringify(buildShape(), null, 2)}
`.trim()
}

function parseJsonSafely(text) {
  if (!text || typeof text !== 'string') return null

  try {
    return JSON.parse(text)
  } catch (err) {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      return JSON.parse(cleaned)
    } catch (err2) {
      return null
    }
  }
}

function getMessageContent(completion) {
  const content = completion?.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) {
    return content
  }
  return '{}'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
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

    const body = req.body || {}
    const dreamId = body.dreamId
    const lang = body.lang || 'en'

    if (!dreamId) {
      return res.status(400).json({ error: 'missing_dream_id' })
    }

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select(
        'id, user_id, content, original_language, premium_deep_analysis, premium_deep_analysis_status'
      )
      .eq('id', dreamId)
      .single()

    if (dreamError || !dream) {
      return res.status(404).json({ error: 'dream_not_found' })
    }

    // 1. KLİNİK GÜVENLİK FİLTRESİ TETİKLENME KONTROLÜ
    if (containsCrisisTokens(dream.content)) {
      await supabaseAdmin
        .from('dreams')
        .update({
          premium_deep_analysis_status: 'failed',
          premium_deep_analysis_error: 'safety_filter_triggered'
        })
        .eq('id', dream.id)

      return res.status(422).json({ 
        error: 'safety_filter_triggered',
        message: 'Klinik güvenlik uyarısı tetiklendi.'
      })
    }

    if (dream.premium_deep_analysis) {
      return res.status(200).json({
        ok: true,
        alreadyGenerated: true,
        analysis: dream.premium_deep_analysis,
      })
    }

    // AURA DÜŞÜLECEK KULLANICI (Ödemeyi gerçekleştiren kullanıcı: user.id)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, premium_analysis_auras')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ error: 'profile_not_found' })
    }

    const auras = Number(profile.premium_analysis_auras || 0)

    // ONARILAN GÜVENLİK SINIRI: 8 AURA KONTROLÜ (Bakiye eksiye düşmez!)
    if (auras < 8) {
      return res.status(402).json({ error: 'no_auras' })
    }

    await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis_status: 'generating',
        premium_deep_analysis_error: null,
      })
      .eq('id', dream.id)

    // =========================================================================
    // JUNGİAN DREAM MEMORY (Geçmiş Rüya Geçmişi Sorgulama)
    // =========================================================================
    const { data: pastDreams } = await supabaseAdmin
      .from('dreams')
      .select('content, premium_deep_analysis, ai_sentiment')
      .eq('user_id', user.id)
      .eq('premium_deep_analysis_status', 'generated')
      .neq('id', dreamId) // Mevcut rüyayı hariç tut
      .order('premium_deep_analysis_generated_at', { ascending: false })
      .limit(5)

    let pastContext = ""
    if (pastDreams && pastDreams.length > 0) {
      pastContext = pastDreams.map((d, i) => {
        const title = d.premium_deep_analysis?.title || ""
        const summary = d.premium_deep_analysis?.summary || ""
        const shadow = d.premium_deep_analysis?.shadow_focus || ""
        return `[Past Dream ${i+1}] Title: ${title}\nContent: "${d.content}"\nPast Shadow/Unresolved Conflict: "${shadow}"`
      }).join("\n\n")
    }

    const targetLangCode = lang || dream.original_language || 'en'
    const targetLangName = LANG_MAP[targetLangCode] || LANG_MAP['en']

    const prompt = buildPrompt({
      content: dream.content,
      targetLangName,
      pastContext
    })

    let completion
    try {
      completion = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
        },
        { timeout: 50_000 }
      )
    } catch (openaiError) {
      console.error('generate-deep-analysis openai error', openaiError)

      await supabaseAdmin
        .from('dreams')
        .update({
          premium_deep_analysis_status: 'failed',
          premium_deep_analysis_error: openaiError?.message || 'openai_request_failed',
        })
        .eq('id', dream.id)

      return res.status(502).json({ error: 'openai_request_failed' })
    }

    const raw = getMessageContent(completion)
    const analysis = parseJsonSafely(raw)

    if (!analysis) {
      await supabaseAdmin
        .from('dreams')
        .update({
          premium_deep_analysis_status: 'failed',
          premium_deep_analysis_error: 'invalid_json_from_model',
        })
        .eq('id', dream.id)

      return res.status(500).json({ error: 'invalid_json_from_model' })
    }

    // =========================================================================
    // HEDİYE KOZMİK RÜYA GÖRSELİ ÜRETİMİ (Flux Schnell Entegrasyonu)
    // =========================================================================
    let imageUrl = null
    let imagePrompt = null

    try {
      const topArchetype = analysis.archetypes?.[0] || 'Dreamer'
      const topSymbol = analysis.symbols?.[0]?.symbol || 'mystical elements'
      const shortContent = String(dream.content || '').replace(/\s+/g, ' ').trim().slice(0, 240)
      
      imagePrompt = `A breathtaking, ethereal dreamscape representing the ${topArchetype} archetype, with moody and atmospheric lighting, featuring ${topSymbol}, mystical surrealism style, dark cosmic tarot card aesthetic, deep indigo, fuchsia, and glowing gold accents, oil painting texture mixed with modern digital double-exposure, evocative of ${analysis.sentiment || 'mystery'}, high-art composition, hauntingly beautiful, cinematic, octane render, masterpiece, extremely detailed, inspired by Carl Jung's subconscious visual representations, based on: ${shortContent}`

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
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 90,
            num_inference_steps: 4
          }
        })
      })

      const replicateData = await replicateRes.json().catch(() => null)

      if (replicateRes.ok && replicateData?.output?.[0]) {
        imageUrl = replicateData.output[0]
      } else {
        console.error('Replicate image generation failed:', replicateData || replicateRes.status)
      }
    } catch (imageError) {
      console.error('Replicate image generation error:', imageError)
    }

    // Bakiye düşümü (Premium Derin Analiz = 8 Aura)
    const nextAuras = auras - 8
    const { error: auraUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ premium_analysis_auras: nextAuras })
      .eq('id', user.id)

    if (auraUpdateError) {
      await supabaseAdmin
        .from('dreams')
        .update({
          premium_deep_analysis_status: 'failed',
          premium_deep_analysis_error: 'aura_update_failed',
        })
        .eq('id', dream.id)

      return res.status(500).json({ error: 'aura_update_failed' })
    }

    // Analiz ve Görsel rüyanın sahibinin (dream.id) rüya kartına işlenir
    const { error: saveError } = await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis: analysis,
        premium_deep_analysis_status: 'generated',
        premium_deep_analysis_error: null,
        premium_deep_analysis_generated_at: new Date().toISOString(),
        ai_image_url: imageUrl || null,
        ai_image_prompt: imagePrompt || null
      })
      .eq('id', dream.id)

    if (saveError) {
      await supabaseAdmin
        .from('dreams')
        .update({
          premium_deep_analysis_status: 'failed',
          premium_deep_analysis_error: 'save_failed',
        })
        .eq('id', dream.id)

      return res.status(500).json({ error: 'save_failed' })
    }

    return res.status(200).json({
      ok: true,
      analysis,
      aurasLeft: nextAuras,
    })
  } catch (error) {
    console.error('generate-deep-analysis error', error)

    return res.status(500).json({
      error: 'internal_server_error',
      details: error && error.message ? error.message : 'unknown_error',
    })
  }
}