import { createClient } from '@supabase/supabase-js'

// Vercel fonksiyonunun 10 saniyede zaman aşımına uğramasını engeller (Max 60'a kadar izin verir)
export const config = {
  maxDuration: 60,
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Lunosfer serves 8 languages across web + future app. Keep this in sync
// everywhere multi-language AI output is generated.
const SUPPORTED_LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja']

function emptyLangMap() {
  return SUPPORTED_LANGS.reduce((acc, l) => {
    acc[l] = ''
    return acc
  }, {})
}

function buildTeaserPrompt(params) {
  const content = params && params.content ? params.content : ''
  const lang = params && params.lang ? params.lang : 'en'

  return `
Analyze the following dream from a profound Jungian perspective. 

This is a free preview analysis, but it must provide a genuine, high-quality, and deeply resonant psychological insight (about 10-15% of a full reading). It must never feel like cheap marketing or empty clickbait. Instead, it should offer a real, substantive key to the dreamer's unconscious—revealing an authentic psychic dynamic (such as an archetypal tension, a shadow reflection, or an anima/animus movement) that triggers immediate psychological curiosity and intellectual excitement (dopamine).

Deliver an emotionally intelligent, intellectually rich, and poetic interpretation that leaves the dreamer with a profound realization, while naturally revealing that this is just the outer threshold of a much deeper, unresolved psychic pattern waiting to be explored in full.

Return only valid JSON.
Do not wrap the answer in markdown.
Do not include any explanation outside JSON.

Rules:
- summary must be at least 3-4 sentences of high-density Jungian insight. Provide genuine substance, identifying an actual unconscious tension or archetype.
- keep it beautiful, evocative, and psychologically substantive (avoid sounding clinical or generic).
- focus on triggering intellectual excitement and emotional resonance (curiosity-inducing).
- suggest that this threshold leads into a deeper, highly personal psychic territory that can be fully mapped in a premium analysis.
- motiv must be one short poetic, striking sentence.
- archetypes should contain 1 to 3 items max, always written in English (e.g. "The Shadow", "The Wanderer").
- sentiment should be a short lowercase word like: hopeful, anxious, mysterious, tender, restless, heavy, luminous.

Primary output language: ${lang}
This product ships in 8 languages. You MUST fill in "title", "summary" and "motiv"
for EVERY one of these language keys, with no blanks and no literal machine
translation, just natural idiomatic writing in each language: ${SUPPORTED_LANGS.join(', ')}.

Dream:
"""
${content}
"""

JSON shape (keep exactly these keys):
${JSON.stringify(
  {
    title: emptyLangMap(),
    summary: emptyLangMap(),
    motiv: emptyLangMap(),
    sentiment: '',
    archetypes: [],
  },
  null,
  2
)}
`
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    const cleaned = String(text || '')
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    return JSON.parse(cleaned)
  }
}

function normalizeArray(value, limit) {
  const max = typeof limit === 'number' ? limit : 3

  if (!Array.isArray(value)) return []

  return value
    .filter(Boolean)
    .map(function (item) {
      return String(item).trim()
    })
    .filter(Boolean)
    .slice(0, max)
}

function normalizeMultiLangField(value) {
  const result = {}
  const en = value && typeof value.en === 'string' ? value.en.trim() : ''

  SUPPORTED_LANGS.forEach((lang) => {
    const raw = value && typeof value[lang] === 'string' ? value[lang].trim() : ''
    result[lang] = raw || en
  })

  return result
}

async function generateWithOpenAI(params) {
  const prompt = buildTeaserPrompt(params)
  // Vercel iç limiti 60, fetch işlemine de 50 saniye verelim ki patlamasın.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 50000)

  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an expert Jungian dream analyst. Write short, emotionally resonant, and psychologically rich analyses that offer genuine, high-quality insights while naturally inviting the dreamer to explore the deeper layers of their unconscious. Always return valid JSON only, with every requested language key filled in.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`openai_request_failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()

    const content = data?.choices?.[0]?.message?.content || '{}'

    return parseJsonSafely(content)
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const body = req.body || {}
    const dreamId = body.dreamId
    const content = body.content
    const lang = body.lang

    let dream = null

    if (dreamId) {
      const result = await supabaseAdmin
        .from('dreams')
        .select('id, content, original_language')
        .eq('id', dreamId)
        .single()

      if (result.error || !result.data) {
        return res.status(404).json({ error: 'dream_not_found' })
      }

      dream = result.data
    } else if (content) {
      dream = {
        id: null,
        content,
        original_language: lang || 'en',
      }
    } else {
      return res.status(400).json({ error: 'missing_dream_input' })
    }

    if (dream.id) {
      await supabaseAdmin
        .from('dreams')
        .update({ analysis_status: 'processing', analysis_error: null })
        .eq('id', dream.id)
    }

    let analysis
    try {
      analysis = await generateWithOpenAI({
        content: dream.content,
        lang: lang || dream.original_language || 'en',
      })
    } catch (openaiError) {
      console.error('analyze-dream openai error', openaiError)

      if (dream.id) {
        await supabaseAdmin
          .from('dreams')
          .update({
            analysis_status: 'failed',
            analysis_error: openaiError?.message || 'openai_request_failed',
          })
          .eq('id', dream.id)
      }

      return res.status(502).json({
        error: 'openai_request_failed',
        details: openaiError?.message || 'unknown_error',
      })
    }

    if (!analysis || typeof analysis !== 'object') {
      if (dream.id) {
        await supabaseAdmin
          .from('dreams')
          .update({
            analysis_status: 'failed',
            analysis_error: 'invalid_json_from_model',
          })
          .eq('id', dream.id)
      }

      return res.status(500).json({ error: 'invalid_json_from_model' })
    }

    const normalized = {
      title: normalizeMultiLangField(analysis.title),
      summary: normalizeMultiLangField(analysis.summary),
      motiv: normalizeMultiLangField(analysis.motiv),
      sentiment: analysis.sentiment ? String(analysis.sentiment).toLowerCase() : null,
      archetypes: normalizeArray(analysis.archetypes, 3),
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

      analysis_status: 'completed',
      analysis_error: null,
    }

    if (dream.id) {
      const { data: updatedDream, error: updateError } = await supabaseAdmin
        .from('dreams')
        .update(payload)
        .eq('id', dream.id)
        .select('*')
        .single()

      if (updateError) {
        console.error('dream update error', updateError)

        await supabaseAdmin
          .from('dreams')
          .update({ analysis_status: 'failed', analysis_error: 'update_failed' })
          .eq('id', dream.id)

        return res.status(500).json({ error: 'update_failed' })
      }

      return res.status(200).json({
        ok: true,
        dream: updatedDream,
        analysis: payload.ai_jungian_analysis,
        fields: payload,
      })
    }

    return res.status(200).json({
      ok: true,
      dream: { ...dream, ...payload },
      analysis: payload.ai_jungian_analysis,
      fields: payload,
    })
  } catch (error) {
    console.error('analyze-dream error', error)

    return res.status(500).json({
      error: 'internal_server_error',
      details: error && error.message ? error.message : 'unknown_error',
    })
  }
        }
