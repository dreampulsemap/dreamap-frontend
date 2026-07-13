// pages/api/generate-deep-analysis.js
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function buildPrompt({ content, lang = 'en' }) {
  return `
Analyze the following dream using a deep Jungian framework.

Return only valid JSON.
Do not wrap in markdown.
Do not include explanations outside JSON.

Language: ${lang}

Dream:
"""
${content}
"""

JSON shape:
{
  "title": { "en": "", "tr": "" },
  "summary": { "en": "", "tr": "" },
  "motiv": { "en": "", "tr": "" },
  "sentiment": "",
  "archetypes": [],
  "shadow_focus": { "en": "", "tr": "" },
  "core_conflict": { "en": "", "tr": "" },
  "individuation_path": { "en": "", "tr": "" },
  "symbolic_reading": { "en": "", "tr": "" },
  "reflection_questions": {
    "en": [],
    "tr": []
  },
  "persona_profile": {
    "name": { "en": "", "tr": "" },
    "tagline": { "en": "", "tr": "" },
    "archetypal_style": { "en": "", "tr": "" },
    "public_self": { "en": "", "tr": "" },
    "hidden_self": { "en": "", "tr": "" },
    "strengths": { "en": [], "tr": [] },
    "shadow_sides": { "en": [], "tr": [] },
    "core_fears": { "en": [], "tr": [] },
    "emotional_needs": { "en": [], "tr": [] }
  },
  "symbols": [
    {
      "symbol": "",
      "meaning_en": "",
      "meaning_tr": "",
      "emotional_charge": "",
      "intensity": 0,
      "color": ""
    }
  ],
  "emotions": [
    {
      "emotion": "",
      "score": 0
    }
  ],
  "visual_theme": {
    "background_color": "",
    "text_color": "",
    "primary_color": "",
    "secondary_color": "",
    "accent_color": ""
  },
  "section_themes": {
    "persona": {
      "primary_color": "",
      "secondary_color": "",
      "accent_color": ""
    },
    "shadow": {
      "primary_color": "",
      "secondary_color": "",
      "accent_color": ""
    },
    "transformation": {
      "primary_color": "",
      "secondary_color": "",
      "accent_color": ""
    }
  }
}
`
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    const cleaned = text
      .replace(/^```jsons*/i, '')
      .replace(/^```s*/i, '')
      .replace(/s*```$/i, '')
      .trim()
    return JSON.parse(cleaned)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace('Bearer ', '').trim()

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

    const { dreamId, lang } = req.body || {}

    if (!dreamId) {
      return res.status(400).json({ error: 'missing_dream_id' })
    }

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, content, original_language, premium_deep_analysis')
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Jungian dream analyst. Return psychologically rich but compassionate interpretations. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const raw = completion.choices?.?.message?.content || '{}'
    const analysis = parseJsonSafely(raw)

    const nextCredits = credits - 1

    const { error: creditUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ premium_analysis_credits: nextCredits })
      .eq('id', user.id)

    if (creditUpdateError) {
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
      details: error?.message || 'unknown_error',
    })
  }
}