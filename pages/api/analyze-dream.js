import { createClient } from '@supabase/supabase-js'

const GROQ_MODEL = 'llama-3.3-70b-versatile'
const OPENROUTER_FALLBACK_MODEL =
  process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
const ANALYSIS_VERSION = 'jung-v6-groq-openrouter-fallback'

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
    .slice(0, 8)
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

function getPrompt(content, language) {
  const schemaGuide = {
    title: {
      tr: 'string',
      en: 'string',
      es: 'string',
      fr: 'string',
      de: 'string',
      pt: 'string',
      ru: 'string',
      ja: 'string',
    },
    summary: {
      tr: '80-150 words, deep Jungian interpretation',
      en: '80-150 words, deep Jungian interpretation',
      es: '80-150 words, deep Jungian interpretation',
      fr: '80-150 words, deep Jungian interpretation',
      de: '80-150 words, deep Jungian interpretation',
      pt: '80-150 words, deep Jungian interpretation',
      ru: '80-150 words, deep Jungian interpretation',
      ja: '80-150 words, deep Jungian interpretation',
    },
    motiv: {
      tr: '30-60 words, psychologically reflective integration guidance',
      en: '30-60 words, psychologically reflective integration guidance',
      es: '30-60 words, psychologically reflective integration guidance',
      fr: '30-60 words, psychologically reflective integration guidance',
      de: '30-60 words, psychologically reflective integration guidance',
      pt: '30-60 words, psychologically reflective integration guidance',
      ru: '30-60 words, psychologically reflective integration guidance',
      ja: '30-60 words, psychologically reflective integration guidance',
    },
    shadow_focus: {
      tr: 'string',
      en: 'string',
    },
    core_conflict: {
      tr: 'string',
      en: 'string',
    },
    individuation_path: {
      tr: 'string',
      en: 'string',
    },
    symbolic_reading: {
      tr: '50-100 words',
      en: '50-100 words',
    },
    archetypes: ['string'],
    sentiment: 'Fear | Joy | Sadness | Peace | Anxiety | Awe | Confusion | Surprise',
    symbols: [
      {
        symbol: 'string',
        meaning_tr: 'string',
        meaning_en: 'string',
        intensity: 'integer 0-100',
      },
    ],
    emotions: [
      {
        emotion: 'Fear | Joy | Sadness | Peace | Anxiety | Awe | Confusion | Surprise',
        score: 'integer 0-100',
      },
    ],
  }

  return `
You are an expert Jungian dream analyst.

Analyze the dream below as a meaningful message from the unconscious.
Return ONLY a valid JSON object.
Do not use markdown.
Do not wrap the JSON in backticks.
Do not add explanations before or after the JSON.

Dream language hint: ${language}
Dream text:
${content}

Return exactly this JSON shape:
${JSON.stringify(schemaGuide, null, 2)}

Rules:
- The tone must be psychologically deep, symbolically rich, and introspective.
- Avoid shallow motivational advice.
- Treat the dream as an expression of inner tension, compensation, shadow material, hidden fear, blocked vitality, or emerging potential.
- The summary should feel like a Jungian interpretation, not a generic self-help comment.
- The motiv field should offer integration guidance, not cheerleading.
- symbolic_reading must deepen the symbolic logic of the dream.
- shadow_focus should identify what rejected or disowned part may be appearing.
- core_conflict should name the central inner tension.
- individuation_path should suggest the next inner movement.
- Identify 1 to 5 Jungian archetypes.
- sentiment must be exactly one of: Fear, Joy, Sadness, Peace, Anxiety, Awe, Confusion, Surprise
- Write natural text for all 8 languages in title, summary, and motiv.
- symbols should include the most psychologically meaningful elements.
- emotions should contain 1 to 5 items.
- All scores and intensity values must be integers from 0 to 100.
- Output ONLY JSON.
`.trim()
}

function parseAnalysis(rawContent) {
  let analysis
  try {
    analysis = JSON.parse(rawContent)
  } catch {
    throw new Error('JSON parse edilemedi')
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

  if (!archetypes.length) throw new Error('Archetype üretilemedi')
  if (!symbols.length) throw new Error('Symbol üretilemedi')
  if (!pickLocalized(analysis.summary, 'en', 'en')) throw new Error('Summary üretilemedi')

  return {
    raw: analysis,
    title: analysis.title || {},
    summary: analysis.summary || {},
    motiv: analysis.motiv || {},
    shadow_focus: analysis.shadow_focus || {},
    core_conflict: analysis.core_conflict || {},
    individuation_path: analysis.individuation_path || {},
    symbolic_reading: analysis.symbolic_reading || {},
    archetypes,
    sentiment,
    symbols,
    emotions,
  }
}

async function analyzeWithGroq({ content, language, groqKey }) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.65,
      max_tokens: 2200,
      messages: [
        {
          role: 'system',
          content:
            'Return only valid JSON objects. You are a profound Jungian analyst, not a generic wellness assistant.',
        },
        {
          role: 'user',
          content: getPrompt(content, language),
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq error ${response.status}`)
  }

  const rawContent = data?.choices?.[0]?.message?.content
  if (!rawContent) throw new Error('Groq boş içerik döndürdü')

  return parseAnalysis(rawContent)
}

async function analyzeWithOpenRouter({ content, language, apiKey }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lunosfer.com',
      'X-Title': 'Lunosfer',
    },
    body: JSON.stringify({
      model: OPENROUTER_FALLBACK_MODEL,
      temperature: 0.65,
      max_tokens: 2200,
      messages: [
        {
          role: 'system',
          content:
            'Return only valid JSON objects. You are a profound Jungian analyst, not a generic wellness assistant.',
        },
        {
          role: 'user',
          content: getPrompt(content, language),
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenRouter error ${response.status}`)
  }

  const rawContent = data?.choices?.[0]?.message?.content
  if (!rawContent) throw new Error('OpenRouter boş içerik döndürdü')

  return parseAnalysis(rawContent)
}

function buildDreamUpdate({ dreamId, content, language, analysis, provider, model }) {
  const imagePrompt = buildImagePrompt({
    archetypes: analysis.archetypes,
    dominantEmotion: analysis.sentiment,
    symbols: analysis.symbols,
    content,
  })

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    imagePrompt
  )}?width=1200&height=630&nologo=true&seed=${dreamId}`

  return {
    ai_title: pickLocalized(analysis.title, language, 'en'),
    ai_title_en: pickLocalized(analysis.title, 'en', 'en'),
    ai_title_tr: pickLocalized(analysis.title, 'tr', 'en'),
    ai_title_es: pickLocalized(analysis.title, 'es', 'en'),
    ai_title_fr: pickLocalized(analysis.title, 'fr', 'en'),
    ai_title_de: pickLocalized(analysis.title, 'de', 'en'),
    ai_title_pt: pickLocalized(analysis.title, 'pt', 'en'),
    ai_title_ru: pickLocalized(analysis.title, 'ru', 'en'),
    ai_title_ja: pickLocalized(analysis.title, 'ja', 'en'),

    ai_summary: pickLocalized(analysis.summary, language, 'en'),
    ai_summary_en: pickLocalized(analysis.summary, 'en', 'en'),
    ai_summary_tr: pickLocalized(analysis.summary, 'tr', 'en'),
    ai_summary_es: pickLocalized(analysis.summary, 'es', 'en'),
    ai_summary_fr: pickLocalized(analysis.summary, 'fr', 'en'),
    ai_summary_de: pickLocalized(analysis.summary, 'de', 'en'),
    ai_summary_pt: pickLocalized(analysis.summary, 'pt', 'en'),
    ai_summary_ru: pickLocalized(analysis.summary, 'ru', 'en'),
    ai_summary_ja: pickLocalized(analysis.summary, 'ja', 'en'),

    ai_motiv: pickLocalized(analysis.motiv, language, 'en'),
    ai_motiv_en: pickLocalized(analysis.motiv, 'en', 'en'),
    ai_motiv_tr: pickLocalized(analysis.motiv, 'tr', 'en'),
    ai_motiv_es: pickLocalized(analysis.motiv, 'es', 'en'),
    ai_motiv_fr: pickLocalized(analysis.motiv, 'fr', 'en'),
    ai_motiv_de: pickLocalized(analysis.motiv, 'de', 'en'),
    ai_motiv_pt: pickLocalized(analysis.motiv, 'pt', 'en'),
    ai_motiv_ru: pickLocalized(analysis.motiv, 'ru', 'en'),
    ai_motiv_ja: pickLocalized(analysis.motiv, 'ja', 'en'),

    ai_archetypes: analysis.archetypes,
    ai_sentiment: analysis.sentiment,
    ai_symbols: analysis.symbols,
    ai_emotions: analysis.emotions,
    ai_jungian_analysis: {
      ...analysis.raw,
      shadow_focus: analysis.shadow_focus,
      core_conflict: analysis.core_conflict,
      individuation_path: analysis.individuation_path,
      symbolic_reading: analysis.symbolic_reading,
      provider,
    },

    ai_image_prompt: imagePrompt,
    ai_image_url: imageUrl,

    analysis_model: model,
    analysis_version: ANALYSIS_VERSION,
    analysis_status: 'completed',
    analysis_error: null,
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const GROQ_KEY = process.env.GROQ_KEY
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({
      error: 'Supabase env eksik',
      debug: {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
      },
    })
  }

  const { dreamId, content, language } = req.body || {}

  if (!dreamId || !content) {
    return res.status(400).json({ error: 'dreamId ve content zorunlu' })
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', dreamId)

    let analysis = null
    let provider = null
    let model = null
    let groqError = null

    if (GROQ_KEY) {
      try {
        analysis = await analyzeWithGroq({
          content,
          language: language || 'en',
          groqKey: GROQ_KEY,
        })
        provider = 'groq'
        model = GROQ_MODEL
      } catch (err) {
        groqError = err
      }
    }

    if (!analysis && OPENROUTER_API_KEY) {
      try {
        analysis = await analyzeWithOpenRouter({
          content,
          language: language || 'en',
          apiKey: OPENROUTER_API_KEY,
        })
        provider = 'openrouter'
        model = OPENROUTER_FALLBACK_MODEL
      } catch (openRouterErr) {
        const combinedMessage = [
          groqError ? `Groq: ${groqError.message}` : null,
          `OpenRouter: ${openRouterErr.message}`,
        ]
          .filter(Boolean)
          .join(' | ')

        throw new Error(combinedMessage)
      }
    }

    if (!analysis) {
      throw new Error(
        groqError?.message || 'Ne Groq ne de OpenRouter kullanılabilir durumda değil'
      )
    }

    const updates = buildDreamUpdate({
      dreamId,
      content,
      language: language || 'en',
      analysis,
      provider,
      model,
    })

    const { error: updateError } = await supabase
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return res.status(200).json({
      success: true,
      provider,
      model,
      analysis: {
        sentiment: analysis.sentiment,
        archetypes: analysis.archetypes,
        summary: pickLocalized(analysis.summary, language || 'en', 'en'),
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

    return res.status(500).json({
      error: `Analiz hatası: ${error.message}`,
    })
  }
}