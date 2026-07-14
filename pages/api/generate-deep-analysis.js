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
If the dream is short, keep the analysis proportionally focused rather than padding it with generic filler.

Respond with valid JSON only, no markdown, and no text outside the JSON structure.`

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

function buildPrompt({ content, targetLangName }) {
  return `
Perform a profound, comprehensive, and highly resonant Jungian deep analysis of the following dream.

CRITICAL REQUIREMENT:
The entire JSON values, strings, array elements, meanings, titles, and explanations MUST be written entirely in: ${targetLangName}.
Do not mix languages. Use natural, idiomatic and poetic phrasing of this target language.

Rules for the Deep Analysis:
- "shadow_focus": Unveil hidden or unacknowledged parts of the psyche that appear in the dream. Be direct and compassionate.
- "core_conflict": Identify the central psychological tension, specific to this dream's actual content.
- "individuation_path": Give actionable, grounded psychological guidance tied to what happened in the dream.
- "symbolic_reading": Decode the dream's narrative as a metaphorical map of the dreamer's current psychic state.
- "reflection_questions": 3 penetrating, personal questions rooted in specifics from the dream.
- "persona_profile": A fascinating archetypal summary of who the dreamer is currently embodying, based only on the dream.

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

    if (dream.user_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' })
    }

    if (dream.premium_deep_analysis) {
      return res.status(200).json({
        ok: true,
        alreadyGenerated: true,
        analysis: dream.premium_deep_analysis,
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

    if (auras <= 0) {
      return res.status(402).json({ error: 'no_auras' })
    }

    await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis_status: 'generating',
        premium_deep_analysis_error: null,
      })
      .eq('id', dream.id)

    const targetLangCode = lang || dream.original_language || 'en'
    const targetLangName = LANG_MAP[targetLangCode] || LANG_MAP['en']

    const prompt = buildPrompt({
      content: dream.content,
      targetLangName,
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

    const nextAuras = auras - 1
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

    const { error: saveError } = await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis: analysis,
        premium_deep_analysis_status: 'generated',
        premium_deep_analysis_error: null,
        premium_deep_analysis_generated_at: new Date().toISOString(),
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