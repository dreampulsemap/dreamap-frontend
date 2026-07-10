import { createClient } from '@supabase/supabase-js'

const SUPPORTED_LANGS = ['tr', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'ja']
const MODEL = 'llama-3.3-70b-versatile'
const ANALYSIS_VERSION = 'jung-v2-structured'

function normalizeText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 6)
}

function normalizeEmotionLabel(value) {
  if (typeof value !== 'string') return null
  const cleaned = value.trim()
  const allowed = [
    'Fear',
    'Joy',
    'Sadness',
    'Peace',
    'Anxiety',
    'Awe',
    'Confusion',
    'Surprise',
  ]
  return allowed.includes(cleaned) ? cleaned : null
}

function normalizeScore(value, min = 0, max = 100) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.round(n)))
}

function pickLocalized(map, lang, fallback = 'en') {
  if (!map || typeof map !== 'object') return null
  return normalizeText(map[lang]) || normalizeText(map[fallback]) || null
}

function buildImagePrompt({ archetypes, dominantEmotion, symbols, content }) {
  const topArchetype = archetypes[0] || 'Dream'
  const topSymbol = symbols[0]?.symbol || 'symbolic landscape'
  const shortContent = String(content || '')
    .replace(/s+/g, ' ')
    .trim()
    .slice(0, 240)

  return [
    `${topArchetype} archetype`,
    `${dominantEmotion || 'mysterious'} atmosphere`,
    `${topSymbol}`,
    'surreal dreamscape',
    'jungian symbolism',
    'cinematic lighting',
    'mystical visual language',
    shortContent,
  ].join(', ')
}

function buildSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tr: { type: 'string' },
          en: { type: 'string' },
          es: { type: 'string' },
          fr: { type: 'string' },
          de: { type: 'string' },
          pt: { type: 'string' },
          ru: { type: 'string' },
          ja: { type: 'string' },
        },
        required: SUPPORTED_LANGS,
      },
      summary: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tr: { type: 'string' },
          en: { type: 'string' },
          es: { type: 'string' },
          fr: { type: 'string' },
          de: { type: 'string' },
          pt: { type: 'string' },
          ru: { type: 'string' },
          ja: { type: 'string' },
        },
        required: SUPPORTED_LANGS,
      },
      motiv: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tr: { type: 'string' },
          en: { type: 'string' },
          es: { type: 'string' },
          fr: { type: 'string' },
          de: { type: 'string' },
          pt: { type: 'string' },
          ru: { type: 'string' },
          ja: { type: 'string' },
        },
        required: SUPPORTED_LANGS,
      },
      archetypes: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 6,
      },
      sentiment: {
        type: 'string',
        enum: ['Fear', 'Joy', 'Sadness', 'Peace', 'Anxiety', 'Awe', 'Confusion', 'Surprise'],
      },
      symbols: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            symbol: { type: 'string' },
            meaning_tr: { type: 'string' },
            meaning_en: { type: 'string' },
            intensity: { type: 'integer' },
          },
          required: ['symbol', 'meaning_tr', 'meaning_en', 'intensity'],
        },
        minItems: 1,
        maxItems: 8,
      },
      emotions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            emotion: {
              type: 'string',
              enum: ['Fear', 'Joy', 'Sadness', 'Peace', 'Anxiety', 'Awe', 'Confusion', 'Surprise'],
            },
            score: { type: 'integer' },
          },
          required: ['emotion', 'score'],
        },
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ['title', 'summary', 'motiv', 'archetypes', 'sentiment', 'symbols', 'emotions'],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, content, language = 'tr' } = req.body || {}

  if (!dreamId || !content) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const GROQ_KEY = process.env.GROQ_KEY
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!GROQ_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({
      error: 'API anahtarları eksik',
      debug: {
        hasGroqKey: !!GROQ_KEY,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
      },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    await supabase
      .from('dreams')
      .update({
        analysis_status: 'processing',
        analysis_error: null,
        analysis_model: MODEL,
        analysis_version: ANALYSIS_VERSION,
      })
      .eq('id', dreamId)

    const schema = buildSchema()

    const prompt = `
You are an expert Jungian dream analyst.

Analyze the dream below and return a structured result.
Write concise, insightful, non-clinical interpretations.
Do not mention that you are an AI.
Do not output markdown.

Dream language hint: ${language}
Dream text:
${content}

Rules:
- Identify 1 to 4 Jungian archetypes.
- Choose one dominant sentiment from the allowed enum.
- Write natural, fluent text for all 8 languages: tr, en, es, fr, de, pt, ru, ja.
- Summaries should be 2 to 3 sentences.
- Motiv texts should be short, encouraging, and reflective.
- Symbols should capture the most psychologically meaningful dream elements.
- Emotion scores should be integers from 0 to 100.
`.trim()

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 2200,
        messages: [
          {
            role: 'system',
            content:
              'You produce Jungian dream analysis as strictly schema-valid structured output.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'dream_analysis',
            schema,
          },
        },
      }),
    })

    const groqData = await groqResponse.json()

    if (!groqResponse.ok) {
      throw new Error(
        groqData?.error?.message || `Groq request failed with status ${groqResponse.status}`
      )
    }

    const rawContent = groqData?.choices?.[0]?.message?.content
    if (!rawContent) {
      throw new Error('Groq API boş içerik döndü')
    }

    let analysis
    try {
      analysis = JSON.parse(rawContent)
    } catch {
      throw new Error('Structured output parse edilemedi')
    }

    const archetypes = normalizeArray(analysis.archetypes)
    const sentiment = normalizeEmotionLabel(analysis.sentiment) || 'Confusion'

    const symbols = Array.isArray(analysis.symbols)
      ? analysis.symbols
          .map((item) => ({
            symbol: normalizeText(item?.symbol),
            meaning_tr: normalizeText(item?.meaning_tr),
            meaning_en: normalizeText(item?.meaning_en),
            intensity: normalizeScore(item?.intensity, 0, 100),
          }))
          .filter((item) => item.symbol && item.meaning_tr && item.meaning_en)
          .slice(0, 8)
      : []

    const emotions = Array.isArray(analysis.emotions)
      ? analysis.emotions
          .map((item) => ({
            emotion: normalizeEmotionLabel(item?.emotion),
            score: normalizeScore(item?.score, 0, 100),
          }))
          .filter((item) => item.emotion)
          .slice(0, 5)
      : []

    const title = analysis.title || {}
    const summary = analysis.summary || {}
    const motiv = analysis.motiv || {}

    const imagePrompt = buildImagePrompt({
      archetypes,
      dominantEmotion: sentiment,
      symbols,
      content,
    })

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      imagePrompt
    )}?width=1200&height=630&nologo=true&seed=${dreamId}`

    const updates = {
      ai_title: pickLocalized(title, language, 'en'),
      ai_title_en: pickLocalized(title, 'en', 'en'),
      ai_title_tr: pickLocalized(title, 'tr', 'en'),
      ai_title_es: pickLocalized(title, 'es', 'en'),
      ai_title_fr: pickLocalized(title, 'fr', 'en'),
      ai_title_de: pickLocalized(title, 'de', 'en'),
      ai_title_pt: pickLocalized(title, 'pt', 'en'),
      ai_title_ru: pickLocalized(title, 'ru', 'en'),
      ai_title_ja: pickLocalized(title, 'ja', 'en'),

      ai_summary: pickLocalized(summary, language, 'en'),
      ai_summary_en: pickLocalized(summary, 'en', 'en'),
      ai_summary_tr: pickLocalized(summary, 'tr', 'en'),
      ai_summary_es: pickLocalized(summary, 'es', 'en'),
      ai_summary_fr: pickLocalized(summary, 'fr', 'en'),
      ai_summary_de: pickLocalized(summary, 'de', 'en'),
      ai_summary_pt: pickLocalized(summary, 'pt', 'en'),
      ai_summary_ru: pickLocalized(summary, 'ru', 'en'),
      ai_summary_ja: pickLocalized(summary, 'ja', 'en'),

      ai_motiv: pickLocalized(motiv, language, 'en'),
      ai_motiv_en: pickLocalized(motiv, 'en', 'en'),
      ai_motiv_tr: pickLocalized(motiv, 'tr', 'en'),
      ai_motiv_es: pickLocalized(motiv, 'es', 'en'),
      ai_motiv_fr: pickLocalized(motiv, 'fr', 'en'),
      ai_motiv_de: pickLocalized(motiv, 'de', 'en'),
      ai_motiv_pt: pickLocalized(motiv, 'pt', 'en'),
      ai_motiv_ru: pickLocalized(motiv, 'ru', 'en'),
      ai_motiv_ja: pickLocalized(motiv, 'ja', 'en'),

      ai_archetypes: archetypes,
      ai_sentiment: sentiment,
      ai_symbols: symbols,
      ai_emotions: emotions,
      ai_jungian_analysis: analysis,

      ai_image_prompt: imagePrompt,
      ai_image_url: imageUrl,

      analysis_model: MODEL,
      analysis_version: ANALYSIS_VERSION,
      analysis_status: 'completed',
      analysis_error: null,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)

    if (updateError) {
      throw new Error(`Supabase güncelleme hatası: ${updateError.message}`)
    }

    return res.status(200).json({
      success: true,
      dreamId,
      imageUrl,
      analysis: {
        archetypes,
        sentiment,
        title,
        summary,
        motiv,
        symbols,
        emotions,
      },
    })
  } catch (error) {
    await supabase
      .from('dreams')
      .update({
        analysis_status: 'failed',
        analysis_error: String(error.message || error).slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dreamId)

    console.error('Analyze error:', error)

    return res.status(500).json({
      error: `Analiz hatası: ${error.message}`,
    })
  }
}