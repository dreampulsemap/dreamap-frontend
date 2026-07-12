import { createClient } from '@supabase/supabase-js'

const MODEL = 'llama-3.3-70b-versatile'
const ANALYSIS_VERSION = 'jung-v4-deep'
const DEFAULT_BATCH_SIZE = 3
const MAX_BATCH_SIZE = 10

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
    .replace(/\s+/g, ' ')
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

async function analyzeDreamWithGroq({ content, language, groqKey }) {
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
      tr: '120-220 words, deep Jungian interpretation',
      en: '120-220 words, deep Jungian interpretation',
      es: '120-220 words, deep Jungian interpretation',
      fr: '120-220 words, deep Jungian interpretation',
      de: '120-220 words, deep Jungian interpretation',
      pt: '120-220 words, deep Jungian interpretation',
      ru: '120-220 words, deep Jungian interpretation',
      ja: '120-220 words, deep Jungian interpretation',
    },
    motiv: {
      tr: '50-100 words, psychologically reflective integration guidance',
      en: '50-100 words, psychologically reflective integration guidance',
      es: '50-100 words, psychologically reflective integration guidance',
      fr: '50-100 words, psychologically reflective integration guidance',
      de: '50-100 words, psychologically reflective integration guidance',
      pt: '50-100 words, psychologically reflective integration guidance',
      ru: '50-100 words, psychologically reflective integration guidance',
      ja: '50-100 words, psychologically reflective integration guidance',
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
      tr: '80-180 words',
      en: '80-180 words',
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

  const prompt = `
You are an expert Jungian dream analyst with deep knowledge of Carl Jung, archetypes, shadow work, compensation theory, symbol amplification, and individuation.

Analyze the dream below as if it is a communication from the unconscious.
Return ONLY a valid JSON object.
Do not use markdown.
Do not wrap the JSON in backticks.
Do not add explanations before or after the JSON.

Dream language hint: ${language}
Dream text:
${content}

Return exactly this JSON shape:
${JSON.stringify(schemaGuide, null, 2)}

Interpretation rules:
- The tone must be psychologically deep, symbolically rich, and introspective.
- Do not give shallow motivational advice.
- Treat the dream as a meaningful psychic drama, not a generic inspirational story.
- Ask implicitly: what is the unconscious compensating for?
- Explore possible shadow material, split desire, hidden fear, wounded self-image, blocked vitality, or emerging inner potential.
- When appropriate, refer to archetypal dynamics such as shadow, persona, anima, animus, inner child, self, trickster, wise old figure, death-rebirth, descent, threshold, pursuit, labyrinth, flood, house, mirror, animal, mother, father, lover, stranger, mask, double.
- The summary should feel like a real Jungian interpretation: layered, reflective, and slightly unsettling in a meaningful way.
- The motiv field should not be cheerleading. It should offer integration guidance, emotional honesty, and a psychologically mature next step.
- symbolic_reading must deepen the symbolic logic of the dream, especially the relation between symbols and the dreamer's inner conflict.
- shadow_focus should identify what rejected or disowned part of the psyche may be appearing.
- core_conflict should name the central inner tension.
- individuation_path should suggest what inner movement or reconciliation the dream may be pointing toward.
- Identify 1 to 5 Jungian archetypes.
- sentiment must be exactly one of: Fear, Joy, Sadness, Peace, Anxiety, Awe, Confusion, Surprise
- Write natural text for all 8 languages in title, summary, and motiv.
- summary fields should be 120 to 220 words each.
- motiv fields should be 50 to 100 words each.
- symbols should include the most psychologically meaningful elements, not surface decorations.
- emotions should contain 1 to 5 items.
- All scores and intensity values must be integers from 0 to 100.
- Output ONLY JSON.
`.trim()

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 3200,
      messages: [
        {
          role: 'system',
          content:
            'Return only valid JSON objects. You are a profound Jungian analyst, not a generic wellness assistant.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
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
    throw new Error('Groq JSON parse edilemedi')
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

function buildDreamUpdate({ dreamId, content, language, analysis }) {
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
    },

    ai_image_prompt: imagePrompt,
    ai_image_url: imageUrl,

    analysis_model: MODEL,
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

  const ADMIN_TOKEN = process.env.ADMIN_REANALYZE_TOKEN
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const GROQ_KEY = process.env.GROQ_KEY

  const authHeader = req.headers.authorization || ''
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null

  if (!ADMIN_TOKEN || bearerToken !== String(ADMIN_TOKEN).trim()) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GROQ_KEY) {
    return res.status(500).json({
      error: 'Eksik environment variables',
      debug: {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_KEY,
        hasGroqKey: !!GROQ_KEY,
      },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const requestedLimit = Number(req.body?.limit || DEFAULT_BATCH_SIZE)
  const limit = Math.min(
    MAX_BATCH_SIZE,
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? requestedLimit
      : DEFAULT_BATCH_SIZE
  )

  try {
    const { data: dreams, error } = await supabase
      .from('dreams')
      .select('id, content, original_language, analysis_status, created_at')
      .eq('analysis_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      throw new Error(`Pending dreams alınamadı: ${error.message}`)
    }

    if (!dreams || dreams.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        message: 'Pending rüya yok.',
        results: [],
      })
    }

    const results = []

    for (const dream of dreams) {
      try {
        await supabase
          .from('dreams')
          .update({
            analysis_status: 'processing',
            analysis_error: null,
            analysis_model: MODEL,
            analysis_version: ANALYSIS_VERSION,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dream.id)

        const analysis = await analyzeDreamWithGroq({
          content: dream.content,
          language: dream.original_language || 'en',
          groqKey: GROQ_KEY,
        })

        const updates = buildDreamUpdate({
          dreamId: dream.id,
          content: dream.content,
          language: dream.original_language || 'en',
          analysis,
        })

        const { error: updateError } = await supabase
          .from('dreams')
          .update(updates)
          .eq('id', dream.id)

        if (updateError) {
          throw new Error(`Supabase update error: ${updateError.message}`)
        }

        results.push({
          dreamId: dream.id,
          success: true,
          sentiment: analysis.sentiment,
          archetypes: analysis.archetypes,
        })
      } catch (err) {
        await supabase
          .from('dreams')
          .update({
            analysis_status: 'failed',
            analysis_error: String(err.message || err).slice(0, 1000),
            updated_at: new Date().toISOString(),
          })
          .eq('id', dream.id)

        results.push({
          dreamId: dream.id,
          success: false,
          error: err.message,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    return res.status(200).json({
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
    })
  } catch (error) {
    console.error('Reanalyze batch error:', error)
    return res.status(500).json({
      error: `Batch analiz hatası: ${error.message}`,
    })
  }
}