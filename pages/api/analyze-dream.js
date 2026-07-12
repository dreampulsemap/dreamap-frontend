import { createClient } from '@supabase/supabase-js'

const GROQ_MODEL = 'llama-3.1-8b-instant'
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct'
const ANALYSIS_VERSION = 'jung-v12-history-aware'

const SUPPORTED_LANGS = ['tr', 'en', 'es', 'fr', 'de', 'pt', 'ru', 'ja']
const ALLOWED_EMOTIONS = [
  'Fear',
  'Joy',
  'Sadness',
  'Peace',
  'Anxiety',
  'Awe',
  'Confusion',
  'Surprise',
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const groqKey = process.env.GROQ_API_KEY
const openRouterKey = process.env.OPENROUTER_API_KEY

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!groqKey && !openRouterKey) throw new Error('Missing AI provider keys')

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

function cleanText(value, maxLen = 4000) {
  if (typeof value !== 'string') return null
  const v = value.replace(/s+/g, ' ').trim()
  return v ? v.slice(0, maxLen) : null
}

function cleanArray(value, max = 8) {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, max)
}

function cleanHex(value, fallback = '#6B7280') {
  return typeof value === 'string' && /^#([0-9A-Fa-f]{6})$/.test(value.trim())
    ? value.trim()
    : fallback
}

function cleanScore(value, min = 0, max = 100) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.round(n)))
}

function cleanEmotion(value) {
  if (typeof value !== 'string') return null
  const v = value.trim()
  return ALLOWED_EMOTIONS.includes(v) ? v : null
}

function pickLocalized(obj, lang = 'en', fallback = 'en') {
  if (!obj || typeof obj !== 'object') return null
  return cleanText(obj[lang]) || cleanText(obj[fallback]) || cleanText(obj.en) || cleanText(obj.tr) || null
}

function ensureMultilangText(value, fallbackLang = 'en', maxLen = 4000) {
  const src = value && typeof value === 'object' ? value : {}
  const out = {}
  for (const lang of SUPPORTED_LANGS) {
    out[lang] =
      cleanText(src[lang], maxLen) ||
      cleanText(src[fallbackLang], maxLen) ||
      cleanText(src.en, maxLen) ||
      cleanText(src.tr, maxLen) ||
      null
  }
  return out
}

function ensureMultilangArray(value, max = 6) {
  const src = value && typeof value === 'object' ? value : {}
  const out = {}
  for (const lang of SUPPORTED_LANGS) {
    out[lang] =
      cleanArray(src[lang], max).length
        ? cleanArray(src[lang], max)
        : cleanArray(src.en, max).length
        ? cleanArray(src.en, max)
        : cleanArray(src.tr, max)
  }
  return out
}

function extractJsonString(content) {
  if (typeof content !== 'string') throw new Error('AI output is not text')
  const trimmed = content.trim()

  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {}

  const fenced = trimmed.match(/```(?:json)?s*([sS]*?)s*```/i)
  if (fenced?.[1]) {
    JSON.parse(fenced[1])
    return fenced[1]
  }

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    const candidate = trimmed.slice(first, last + 1)
    JSON.parse(candidate)
    return candidate
  }

  throw new Error('Could not parse JSON output')
}

function buildHistoryDigest(history = [], shares = []) {
  const sentiments = {}
  const archetypes = {}
  const symbols = {}
  const phrases = []

  for (const item of history) {
    if (item?.ai_sentiment) {
      sentiments[item.ai_sentiment] = (sentiments[item.ai_sentiment] || 0) + 1
    }

    if (Array.isArray(item?.ai_archetypes)) {
      for (const arc of item.ai_archetypes) {
        if (typeof arc === 'string' && arc.trim()) {
          archetypes[arc.trim()] = (archetypes[arc.trim()] || 0) + 1
        }
      }
    }

    if (Array.isArray(item?.ai_symbols)) {
      for (const symbol of item.ai_symbols) {
        const key = typeof symbol?.symbol === 'string' ? symbol.symbol.trim() : ''
        if (key) symbols[key] = (symbols[key] || 0) + 1
      }
    }

    if (typeof item?.ai_summary === 'string') {
      phrases.push(item.ai_summary.slice(0, 220))
    }
  }

  for (const share of shares) {
    if (typeof share?.content === 'string') {
      phrases.push(share.content.slice(0, 180))
    }
  }

  const top = (obj, limit = 6) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }))

  return {
    dream_count: history.length,
    share_count: shares.length,
    dominant_sentiments: top(sentiments, 5),
    dominant_archetypes: top(archetypes, 6),
    recurring_symbols: top(symbols, 8),
    memory_fragments: phrases.slice(0, 12),
  }
}

async function fetchDream(dreamId) {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('id', dreamId)
    .single()

  if (error || !data) throw new Error('Dream not found')
  return data
}

async function fetchUserDreamHistory(userId, currentDreamId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('dreams')
    .select(
      'id, content, dream_date, created_at, ai_sentiment, ai_summary, ai_archetypes, ai_symbols, ai_emotions, user_selected_sentiment'
    )
    .eq('user_id', userId)
    .neq('id', currentDreamId)
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) throw new Error(`Failed to fetch history: ${error.message}`)
  return data || []
}

async function fetchUserShares(userId) {
  if (!userId) return []

  // TODO: gerçek paylaşım tablonun adı buysa kullan; değilse değiştir.
  // Tablo yoksa sessizce boş dönsün.
  const { data, error } = await supabase
    .from('dream_shares')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return data || []
}

function buildSchemaGuide() {
  const langsText = Object.fromEntries(
    SUPPORTED_LANGS.map((lang) => [lang, 'string'])
  )
  const langsArray = Object.fromEntries(
    SUPPORTED_LANGS.map((lang) => [lang, ['string']])
  )

  return {
    title: langsText,
    summary: langsText,
    motiv: langsText,
    image_prompt: langsText,
    shadow_focus: langsText,
    core_conflict: langsText,
    individuation_path: langsText,
    symbolic_reading: langsText,
    persona_profile: {
      name: langsText,
      tagline: langsText,
      archetypal_style: langsText,
      public_self: langsText,
      hidden_self: langsText,
      strengths: langsArray,
      shadow_sides: langsArray,
      core_fears: langsArray,
      emotional_needs: langsArray,
      defenses: langsArray,
    },
    user_pattern_context: {
      pattern_summary: langsText,
      dominant_archetypes: ['string'],
      recurring_symbols: ['string'],
      recurring_emotions: ['string'],
      repeated_conflicts: ['string'],
      dream_series_phase: langsText,
      continuity_notes: langsText,
    },
    relational_reading: {
      self_pattern: langsText,
      shadow_pattern: langsText,
      adaptive_strategy: langsText,
      growth_edge: langsText,
    },
    visual_theme: {
      overall_mood: 'string',
      aura: 'string',
      primary_color: '#RRGGBB',
      secondary_color: '#RRGGBB',
      accent_color: '#RRGGBB',
      background_color: '#RRGGBB',
      text_color: '#RRGGBB',
      gradient_suggestion: 'string',
      texture_hint: 'string',
      highlight_style: 'string',
      card_style: 'string',
    },
    section_themes: {
      persona: {
        aura: 'string',
        primary_color: '#RRGGBB',
        secondary_color: '#RRGGBB',
        accent_color: '#RRGGBB',
        gradient_suggestion: 'string',
      },
      shadow: {
        aura: 'string',
        primary_color: '#RRGGBB',
        secondary_color: '#RRGGBB',
        accent_color: '#RRGGBB',
        gradient_suggestion: 'string',
      },
      transformation: {
        aura: 'string',
        primary_color: '#RRGGBB',
        secondary_color: '#RRGGBB',
        accent_color: '#RRGGBB',
        gradient_suggestion: 'string',
      },
    },
    archetypes: ['string'],
    sentiment: 'Fear | Joy | Sadness | Peace | Anxiety | Awe | Confusion | Surprise',
    symbols: [
      {
        symbol: 'string',
        meaning_tr: 'string',
        meaning_en: 'string',
        emotional_charge: 'string',
        intensity: 'integer 0-100',
        color: '#RRGGBB',
      },
    ],
    emotions: [
      {
        emotion: 'Fear | Joy | Sadness | Peace | Anxiety | Awe | Confusion | Surprise',
        score: 'integer 0-100',
      },
    ],
    reflection_questions: langsArray,
  }
}

function buildJsonSchema() {
  return {
    name: 'dream_analysis_full',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'object' },
        summary: { type: 'object' },
        motiv: { type: 'object' },
        image_prompt: { type: 'object' },
        shadow_focus: { type: 'object' },
        core_conflict: { type: 'object' },
        individuation_path: { type: 'object' },
        symbolic_reading: { type: 'object' },
        persona_profile: { type: 'object' },
        user_pattern_context: { type: 'object' },
        relational_reading: { type: 'object' },
        visual_theme: { type: 'object' },
        section_themes: { type: 'object' },
        archetypes: { type: 'array', items: { type: 'string' } },
        sentiment: { type: 'string', enum: ALLOWED_EMOTIONS },
        symbols: { type: 'array', items: { type: 'object' } },
        emotions: { type: 'array', items: { type: 'object' } },
        reflection_questions: { type: 'object' },
      },
      required: [
        'title',
        'summary',
        'motiv',
        'image_prompt',
        'shadow_focus',
        'core_conflict',
        'individuation_path',
        'symbolic_reading',
        'persona_profile',
        'user_pattern_context',
        'relational_reading',
        'visual_theme',
        'section_themes',
        'archetypes',
        'sentiment',
        'symbols',
        'emotions',
        'reflection_questions',
      ],
    },
  }
}

function buildPrompt(dream, historyDigest, history, shares) {
  const content = cleanText(dream?.content, 12000) || ''
  const language = cleanText(dream?.original_language, 16) || 'en'
  const sentiment = cleanText(dream?.user_selected_sentiment, 80) || 'unknown'
  const location = cleanText(dream?.location_name, 200) || 'unknown'
  const dreamDate = dream?.dream_date || 'unknown'

  const compactHistory = history.map((item) => ({
    dream_date: item?.dream_date || null,
    user_selected_sentiment: item?.user_selected_sentiment || null,
    ai_sentiment: item?.ai_sentiment || null,
    ai_archetypes: Array.isArray(item?.ai_archetypes) ? item.ai_archetypes : [],
    ai_symbols: Array.isArray(item?.ai_symbols)
      ? item.ai_symbols.slice(0, 4).map((s) => s?.symbol).filter(Boolean)
      : [],
    ai_summary: typeof item?.ai_summary === 'string' ? item.ai_summary.slice(0, 240) : null,
  }))

  const compactShares = shares.map((item) => ({
    created_at: item?.created_at || null,
    content: typeof item?.content === 'string' ? item.content.slice(0, 220) : null,
  }))

  return `
You are an elite Jungian dream analyst writing for Lunosfer, a premium dream analysis platform.

Return ONLY valid JSON. No markdown. No explanations.

CORE RULE:
- The Jungian reading must be rooted primarily in the CURRENT dream.
- However, other interpretive layers should incorporate the user's prior dream history and past shares to identify recurring psychic patterns, repeated symbols, affective loops, archetypal tendencies, and continuity across the dream series.
- Do not invent biographical facts not supported by the inputs.

CURRENT DREAM:
- original language: ${language}
- user-selected sentiment: ${sentiment}
- location: ${location}
- dream date: ${dreamDate}

Dream text:
${content}

USER DREAM HISTORY DIGEST:
${JSON.stringify(historyDigest, null, 2)}

RECENT DREAM HISTORY:
${JSON.stringify(compactHistory, null, 2)}

RECENT USER SHARES:
${JSON.stringify(compactShares, null, 2)}

Return exactly this JSON shape:
${JSON.stringify(buildSchemaGuide(), null, 2)}

Interpretation requirements:
1. summary: long, deep, elegant Jungian reading of the CURRENT dream.
2. motiv: grounded integration guidance; may incorporate historical patterns.
3. image_prompt: cinematic, symbolic, highly visual, safe for image generation, premium aesthetic.
4. persona_profile: psychologically resonant, specific, and non-generic.
5. user_pattern_context: derived from user history and shares, not just this dream.
6. relational_reading: synthesize adaptive style, shadow pattern, and growth edge using continuity across dreams.
7. symbolic_reading: explain symbolic sequence and image logic of the CURRENT dream.
8. reflection_questions: penetrating, intimate, useful.

Multilingual requirements:
- title, summary, motiv, image_prompt, shadow_focus, core_conflict, individuation_path, symbolic_reading
  must exist in all 8 languages: tr, en, es, fr, de, pt, ru, ja.
- persona_profile.name/tagline/archetypal_style/public_self/hidden_self must exist in all 8 languages.
- persona_profile.strengths/shadow_sides/core_fears/emotional_needs/defenses must exist in all 8 languages as arrays.
- user_pattern_context.pattern_summary, dream_series_phase, continuity_notes must exist in all 8 languages.
- relational_reading.self_pattern, shadow_pattern, adaptive_strategy, growth_edge must exist in all 8 languages.
- reflection_questions must exist in all 8 languages.

Tone:
- psychologically mature
- symbolically dense
- emotionally precise
- clinically responsible
- literary but not purple
- never shallow wellness language
- no diagnosis
- no deterministic prophecy

Output only JSON.
`.trim()
}

function normalizeAnalysis(parsed) {
  const visual = parsed?.visual_theme || {}
  const sectionThemes = parsed?.section_themes || {}
  const persona = parsed?.persona_profile || {}
  const pattern = parsed?.user_pattern_context || {}
  const relational = parsed?.relational_reading || {}

  const normalized = {
    title: ensureMultilangText(parsed?.title, 'en', 240),
    summary: ensureMultilangText(parsed?.summary, 'en', 3200),
    motiv: ensureMultilangText(parsed?.motiv, 'en', 1800),
    image_prompt: ensureMultilangText(parsed?.image_prompt, 'en', 1800),
    shadow_focus: ensureMultilangText(parsed?.shadow_focus, 'en', 1800),
    core_conflict: ensureMultilangText(parsed?.core_conflict, 'en', 1800),
    individuation_path: ensureMultilangText(parsed?.individuation_path, 'en', 1800),
    symbolic_reading: ensureMultilangText(parsed?.symbolic_reading, 'en', 2600),

    persona_profile: {
      name: ensureMultilangText(persona?.name, 'en', 220),
      tagline: ensureMultilangText(persona?.tagline, 'en', 320),
      archetypal_style: ensureMultilangText(persona?.archetypal_style, 'en', 1200),
      public_self: ensureMultilangText(persona?.public_self, 'en', 1200),
      hidden_self: ensureMultilangText(persona?.hidden_self, 'en', 1200),
      strengths: ensureMultilangArray(persona?.strengths, 6),
      shadow_sides: ensureMultilangArray(persona?.shadow_sides, 6),
      core_fears: ensureMultilangArray(persona?.core_fears, 6),
      emotional_needs: ensureMultilangArray(persona?.emotional_needs, 6),
      defenses: ensureMultilangArray(persona?.defenses, 6),
    },

    user_pattern_context: {
      pattern_summary: ensureMultilangText(pattern?.pattern_summary, 'en', 1800),
      dominant_archetypes: cleanArray(pattern?.dominant_archetypes, 8),
      recurring_symbols: cleanArray(pattern?.recurring_symbols, 10),
      recurring_emotions: cleanArray(pattern?.recurring_emotions, 8),
      repeated_conflicts: cleanArray(pattern?.repeated_conflicts, 8),
      dream_series_phase: ensureMultilangText(pattern?.dream_series_phase, 'en', 600),
      continuity_notes: ensureMultilangText(pattern?.continuity_notes, 'en', 1200),
    },

    relational_reading: {
      self_pattern: ensureMultilangText(relational?.self_pattern, 'en', 1200),
      shadow_pattern: ensureMultilangText(relational?.shadow_pattern, 'en', 1200),
      adaptive_strategy: ensureMultilangText(relational?.adaptive_strategy, 'en', 1200),
      growth_edge: ensureMultilangText(relational?.growth_edge, 'en', 1200),
    },

    visual_theme: {
      overall_mood: cleanText(visual?.overall_mood, 200),
      aura: cleanText(visual?.aura, 200),
      primary_color: cleanHex(visual?.primary_color, '#312E81'),
      secondary_color: cleanHex(visual?.secondary_color, '#111827'),
      accent_color: cleanHex(visual?.accent_color, '#C084FC'),
      background_color: cleanHex(visual?.background_color, '#050816'),
      text_color: cleanHex(visual?.text_color, '#F9FAFB'),
      gradient_suggestion: cleanText(visual?.gradient_suggestion, 200),
      texture_hint: cleanText(visual?.texture_hint, 120),
      highlight_style: cleanText(visual?.highlight_style, 120),
      card_style: cleanText(visual?.card_style, 120),
    },

    section_themes: {
      persona: {
        aura: cleanText(sectionThemes?.persona?.aura, 120),
        primary_color: cleanHex(sectionThemes?.persona?.primary_color, '#1F3A5F'),
        secondary_color: cleanHex(sectionThemes?.persona?.secondary_color, '#111827'),
        accent_color: cleanHex(sectionThemes?.persona?.accent_color, '#93C5FD'),
        gradient_suggestion: cleanText(sectionThemes?.persona?.gradient_suggestion, 200),
      },
      shadow: {
        aura: cleanText(sectionThemes?.shadow?.aura, 120),
        primary_color: cleanHex(sectionThemes?.shadow?.primary_color, '#3B0764'),
        secondary_color: cleanHex(sectionThemes?.shadow?.secondary_color, '#111827'),
        accent_color: cleanHex(sectionThemes?.shadow?.accent_color, '#C084FC'),
        gradient_suggestion: cleanText(sectionThemes?.shadow?.gradient_suggestion, 200),
      },
      transformation: {
        aura: cleanText(sectionThemes?.transformation?.aura, 120),
        primary_color: cleanHex(sectionThemes?.transformation?.primary_color, '#0F766E'),
        secondary_color: cleanHex(sectionThemes?.transformation?.secondary_color, '#164E63'),
        accent_color: cleanHex(sectionThemes?.transformation?.accent_color, '#99F6E4'),
        gradient_suggestion: cleanText(sectionThemes?.transformation?.gradient_suggestion, 200),
      },
    },

    archetypes: cleanArray(parsed?.archetypes, 5),
    sentiment: cleanEmotion(parsed?.sentiment) || 'Confusion',

    symbols: Array.isArray(parsed?.symbols)
      ? parsed.symbols
          .map((s) => ({
            symbol: cleanText(s?.symbol, 120),
            meaning_tr: cleanText(s?.meaning_tr, 320),
            meaning_en: cleanText(s?.meaning_en, 320),
            emotional_charge: cleanText(s?.emotional_charge, 160),
            intensity: cleanScore(s?.intensity, 0, 100),
            color: cleanHex(s?.color, '#8B5CF6'),
          }))
          .filter((s) => s.symbol && s.meaning_tr && s.meaning_en)
          .slice(0, 8)
      : [],

    emotions: Array.isArray(parsed?.emotions)
      ? parsed.emotions
          .map((e) => ({
            emotion: cleanEmotion(e?.emotion),
            score: cleanScore(e?.score, 0, 100),
          }))
          .filter((e) => e.emotion)
          .slice(0, 5)
      : [],

    reflection_questions: ensureMultilangArray(parsed?.reflection_questions, 6),
  }

  if (!pickLocalized(normalized.summary, 'en', 'en')) throw new Error('Missing summary')
  if (!pickLocalized(normalized.title, 'en', 'en')) throw new Error('Missing title')
  if (!normalized.archetypes.length) throw new Error('Missing archetypes')
  if (!normalized.symbols.length) throw new Error('Missing symbols')

  return normalized
}

function parseAiResponse(rawContent) {
  const json = extractJsonString(rawContent)
  const parsed = JSON.parse(json)
  return normalizeAnalysis(parsed)
}

async function callGroq(prompt, userId) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7,
      max_completion_tokens: 5500,
      user: userId ? String(userId) : undefined,
      messages: [
        {
          role: 'system',
          content:
            'Return only valid raw JSON. No markdown. No commentary. Produce a deep, multilingual, history-aware Jungian dream analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: buildJsonSchema(),
      },
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq error ${response.status}`)
  }

  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new Error('Groq returned empty content')

  return parseAiResponse(raw)
}

async function callOpenRouter(prompt, userId) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lunosfer.com',
      'X-OpenRouter-Title': 'Lunosfer',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.7,
      max_tokens: 5500,
      user: userId ? String(userId) : undefined,
      messages: [
        {
          role: 'system',
          content:
            'Return only valid raw JSON. No markdown. No commentary. Produce a deep, multilingual, history-aware Jungian dream analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: buildJsonSchema(),
      },
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenRouter error ${response.status}`)
  }

  const raw = data?.choices?.[0]?.message?.content
  if (!raw) throw new Error('OpenRouter returned empty content')

  return parseAiResponse(raw)
}

async function generateAnalysis({ dream, historyDigest, history, shares }) {
  const prompt = buildPrompt(dream, historyDigest, history, shares)
  const userId = dream?.user_id || null
  const errors = []

  if (groqKey) {
    try {
      const result = await callGroq(prompt, userId)
      return { provider: 'groq', model: GROQ_MODEL, result }
    } catch (err) {
      errors.push(`Groq: ${err.message}`)
    }
  }

  if (openRouterKey) {
    try {
      const result = await callOpenRouter(prompt, userId)
      return { provider: 'openrouter', model: OPENROUTER_MODEL, result }
    } catch (err) {
      errors.push(`OpenRouter: ${err.message}`)
    }
  }

  throw new Error(errors.join(' | ') || 'All AI providers failed')
}

function buildLocalizedColumns(result, baseLang = 'en') {
  const patch = {
    ai_title: pickLocalized(result.title, baseLang, 'en'),
    ai_summary: pickLocalized(result.summary, baseLang, 'en'),
    ai_motiv: pickLocalized(result.motiv, baseLang, 'en'),
    ai_image_prompt: pickLocalized(result.image_prompt, baseLang, 'en'),
  }

  for (const lang of SUPPORTED_LANGS) {
    patch[`ai_title_${lang}`] = pickLocalized(result.title, lang, 'en')
    patch[`ai_summary_${lang}`] = pickLocalized(result.summary, lang, 'en')
    patch[`ai_motiv_${lang}`] = pickLocalized(result.motiv, lang, 'en')
  }

  return patch
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const dreamId = req.body?.dreamId
    if (!dreamId) {
      return res.status(400).json({ error: 'dreamId is required' })
    }

    const dream = await fetchDream(dreamId)

    // TODO: burada kendi auth/session doğrulamanı ekle.
    // Service role RLS bypass ettiği için user ownership kontrolü zorunlu.

    await supabase
      .from('dreams')
      .update({
        analysis_status: 'processing',
        analysis_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dreamId)

    const history = await fetchUserDreamHistory(dream.user_id, dream.id)
    const shares = await fetchUserShares(dream.user_id)
    const historyDigest = buildHistoryDigest(history, shares)

    const { provider, model, result } = await generateAnalysis({
      dream,
      historyDigest,
      history,
      shares,
    })

    const baseLang = cleanText(dream?.original_language, 16) || 'en'

    const aiJungianAnalysis = {
      ...result,
      meta: {
        provider,
        model,
        version: ANALYSIS_VERSION,
        history_dream_count: history.length,
        share_c