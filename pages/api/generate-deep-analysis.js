// pages/api/generate-deep-analysis.js
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// Vercel fonksiyonunun 10 saniyede zaman aşımına uğramasını engeller (Max 60'a kadar izin verir)
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

// Lunosfer serves 8 languages across web + future app.
const SUPPORTED_LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja']

function emptyLangMap() {
  return SUPPORTED_LANGS.reduce((acc, l) => {
    acc[l] = ''
    return acc
  }, {})
}

function emptyLangArrayMap() {
  return SUPPORTED_LANGS.reduce((acc, l) => {
    acc[l] = []
    return acc
  }, {})
}

function buildShape() {
  return {
    title: emptyLangMap(),
    summary: emptyLangMap(),
    motiv: emptyLangMap(),
    sentiment: '',
    archetypes: [],
    shadow_focus: emptyLangMap(),
    core_conflict: emptyLangMap(),
    individuation_path: emptyLangMap(),
    symbolic_reading: emptyLangMap(),
    reflection_questions: emptyLangArrayMap(),
    persona_profile: {
      name: emptyLangMap(),
      tagline: emptyLangMap(),
      archetypal_style: emptyLangMap(),
      public_self: emptyLangMap(),
      hidden_self: emptyLangMap(),
      strengths: emptyLangArrayMap(),
      shadow_sides: emptyLangArrayMap(),
      core_fears: emptyLangArrayMap(),
      emotional_needs: emptyLangArrayMap(),
    },
    symbols: [
      {
        symbol: '',
        meaning_en: '',
        meaning_tr: '',
        emotional_charge: '',
        intensity: 0,
        color: '',
      },
    ],
    emotions: [
      {
        emotion: '',
        score: 0,
      },
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

function buildPrompt({ content, lang = 'en' }) {
  return `
Perform a profound, comprehensive, and highly resonant Jungian deep analysis of the following dream. 

This is a PREMIUM analysis. It must be exceptionally high-quality, delivering deep psychological substance, emotional intelligence, and striking revelations about the dreamer's unconscious.
The tone should be empathetic yet deeply analytical, poetic, and intellectually thrilling.
The goal is to provide the dreamer with such a transformative, 'aha' moment that they feel truly understood, deeply fascinated by their own mind, and incredibly eager to map their future dreams with this tool.

Rules for the Deep Analysis:
- "shadow_focus": Unveil the hidden, repressed, or unacknowledged parts of the psyche appearing in the dream. Be direct, compassionate, and illuminating. Do not hold back on depth.
- "core_conflict": Identify the central psychological tension (e.g., Anima/Animus integration, Persona vs. Authentic Self, fear of transformation). Make it highly specific to the dream.
- "individuation_path": Provide actionable, profound psychological advice on how the dreamer can integrate this dream's message into their waking life for profound personal growth.
- "symbolic_reading": Decode the dream's narrative as a metaphorical map of the dreamer's current psychic state. Read between the lines.
- "reflection_questions": Provide 3 penetrating, deeply personal questions that will make the dreamer introspect profoundly and want to return for more answers.
- "persona_profile": Create a fascinating, archetypal summary of who the dreamer is currently embodying based on this dream. Make it feel like a high-end psychological profile.

Return only a valid JSON object.
Do not use markdown.
Do not add explanations before or after the JSON.

Primary output language: ${lang}
This product ships in 8 languages. Every multi-language field below is an
object keyed by language code. You MUST fill in EVERY one of these language
keys for EVERY multi-language field, with natural idiomatic writing (not a
literal machine translation) — never leave a key blank: ${SUPPORTED_LANGS.join(', ')}.

Dream:
"""
${content}
"""

Required JSON shape (keep exactly these keys, fill in real content):
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
  // completion.choices is an ARRAY — must index into [0] before .message.
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
      .select('id, premium_analysis_credits')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(404).json({ error: 'profile_not_found' })
    }

    const credits = Number(profile.premium_analysis_credits || 0)

    if (credits <= 0) {
      return res.status(402).json({ error: 'no_credits' })
    }

    await supabaseAdmin
      .from('dreams')
      .update({
        premium_deep_analysis_status: 'generating',
        premium_deep_analysis_error: null,
      })
      .eq('id', dream.id)

    const prompt = buildPrompt({
      content: dream.content,
      lang: lang || dream.original_language || 'en',
    })

    let completion
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.75, // Daha yaratıcı ve derinlikli bir ton için çok az artırıldı
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an elite, world-class Jungian dream analyst. Provide a breathtakingly insightful, compassionate, and psychologically profound premium analysis. Your interpretation must leave the user feeling deeply understood, enlightened, and hungry to explore more of their unconscious. Respond with valid JSON only, with every requested language key filled in.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
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

    const nextCredits = credits - 1

    const { error: creditUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        premium_analysis_credits: nextCredits,
      })
      .eq('id', user.id)

    if (creditUpdateError) {
      await supabaseAdmin
        .from('dreams')
        .update({
          premium_deep_analysis_status: 'failed',
          premium_deep_analysis_error: 'credit_update_failed',
        })
        .eq('id', dream.id)

      return res.status(500).json({ error: 'credit_update_failed' })
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
      creditsLeft: nextCredits,
    })
  } catch (error) {
    console.error('generate-deep-analysis error', error)

    return res.status(500).json({
      error: 'internal_server_error',
      details: error && error.message ? error.message : 'unknown_error',
    })
  }
                                   }
