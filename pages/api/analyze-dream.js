import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function buildTeaserPrompt({ content, lang = 'en' }) {
  return `
Analyze the following dream in a concise, emotionally resonant, curiosity-inducing way.

Return only valid JSON.
Do not wrap the answer in markdown.
Do not include any explanation outside JSON.

This is a short free dream analysis shown on a card preview.
It should feel psychologically meaningful, poetic, and slightly mysterious.
It should gently make the user want a deeper premium analysis.

Rules:
- summary must be exactly 4 or 5 sentences
- keep it concise and beautiful
- avoid sounding clinical, generic, or repetitive
- suggest that there is a deeper unresolved pattern
- do not give the full answer away
- motiv must be one short poetic sentence
- archetypes should contain 1 to 3 items max
- sentiment should be a short lowercase word like: hopeful, anxious, mysterious, tender, restless, heavy, luminous

Primary output language: ${lang}
Also provide English and Turkish versions for title, summary, and motiv.

Dream:
"""
${content}
"""

JSON shape:
{
  "title": {
    "en": "",
    "tr": ""
  },
  "summary": {
    "en": "",
    "tr": ""
  },
  "motiv": {
    "en": "",
    "tr": ""
  },
  "sentiment": "",
  "archetypes": []
}
`
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    const cleaned = String(text || '')
      .replace(/^```jsons*/i, '')
      .replace(/^```s*/i, '')
      .replace(/s*```$/i, '')
      .trim()

    return JSON.parse(cleaned)
  }
}

function normalizeArray(value, limit = 3) {
  if (!Array.isArray(value)) return []

  return value
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, limit)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const { dreamId, content, lang } = req.body || {}

    let dream = null

    if (dreamId) {
      const { data, error } = await supabaseAdmin
        .from('dreams')
        .select('id, content, original_language')
        .eq('id', dreamId)
        .single()

      if (error || !data) {
        return res.status(404).json({ error: 'dream_not_found' })
      }

      dream = data
    } else if (content) {
      dream = {
        id: null,
        content,
        original_language: lang || 'en',
      }
    } else {
      return res.status(400).json({ error: 'missing_dream_input' })
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an expert dream interpretation assistant. Write short, emotionally intelligent, intriguing teaser analyses that make the user curious for a deeper reading. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: buildTeaserPrompt({
            content: dream.content,
            lang: lang || dream.original_language || 'en',
          }),
        },
      ],
    })

    const raw = completion.choices?.?.message?.content || '{}'
    const analysis = parseJsonSafely(raw)

    const normalized = {
      title: {
        en: analysis?.title?.en || '',
        tr: analysis?.title?.tr || analysis?.title?.en || '',
      },
      summary: {
        en: analysis?.summary?.en || '',
        tr: analysis?.summary?.tr || analysis?.summary?.en || '',
      },
      motiv: {
        en: analysis?.motiv?.en || '',
        tr: analysis?.motiv?.tr || analysis?.motiv?.en || '',
      },
      sentiment: analysis?.sentiment
        ? String(analysis.sentiment).toLowerCase()
        : null,
      archetypes: normalizeArray(analysis?.archetypes, 3),
    }

    const payload = {
      ai_title: normalized.title.en || null,
      ai_title_en: normalized.title.en || null,
      ai_title_tr: normalized.title.tr || null,

      ai_summary: normalized.summary.en || null,
      ai_summary_en: normalized.summary.en || null,
      ai_summary_tr: normalized.summary.tr || null,

      ai_motiv: normalized.motiv.en || null,
      ai_motiv_en: normalized.motiv.en || null,
      ai_motiv_tr: normalized.motiv.tr || null,

      ai_sentiment: normalized.sentiment || null,
      ai_archetypes: normalized.archetypes,

      ai_jungian_analysis: {
        title: normalized.title,
        summary: normalized.summary,
        motiv: normalized.motiv,
        sentiment: normalized.sentiment,
        archetypes: normalized.archetypes,
        teaser: true,
      },
    }

    if (dream.id) {
      const { error: updateError } = await supabaseAdmin
        .from('dreams')
        .update(payload)
        .eq('id', dream.id)

      if (updateError) {
        console.error('dream update error', updateError)
        return res.status(500).json({ error: 'update_failed' })
      }
    }

    return res.status(200).json({
      ok: true,
      analysis: payload.ai_jungian_analysis,
      fields: payload,
    })
  } catch (error) {
    console.error('analyze-dream error', error)

    return res.status(500).json({
      error: 'internal_server_error',
      details: error?.message || 'unknown_error',
    })
  }
}
