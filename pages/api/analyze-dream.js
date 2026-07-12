import { createClient } from '@supabase/supabase-js'

const GROQ_MODEL = 'llama-3.1-8b-instant'
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct'
const ANALYSIS_VERSION = 'jung-v8-persona-color-structured'

function normalizeText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function normalizeArray(value, max = 8) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, max)
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

function normalizeHex(value, fallback = '#6B7280') {
  if (typeof value !== 'string') return fallback
  const v = value.trim()
  return /^#([0-9A-Fa-f]{6})$/.test(v) ? v : fallback
}

function pickLocalized(map, lang, fallback = 'en') {
  if (!map || typeof map !== 'object') return null
  return normalizeText(map[lang]) || normalizeText(map[fallback]) || null
}

function buildMultilangSpec(shortRule) {
  return {
    tr: shortRule,
    en: shortRule,
    es: shortRule,
    fr: shortRule,
    de: shortRule,
    pt: shortRule,
    ru: shortRule,
    ja: shortRule,
  }
}

function buildSchemaGuide() {
  return {
    title: buildMultilangSpec('short evocative title'),
    summary: buildMultilangSpec(
      '90-170 words, deep Jungian summary with symbolic and emotional richness'
    ),
    motiv: buildMultilangSpec(
      '40-80 words, integration guidance, reflective not generic'
    ),
    shadow_focus: buildMultilangSpec(
      '1-3 sentences identifying disowned/rejected psychic material'
    ),
    core_conflict: buildMultilangSpec(
      '1-2 sentences naming the central inner tension'
    ),
    individuation_path: buildMultilangSpec(
      '1-3 sentences suggesting the next inner movement toward wholeness'
    ),
    symbolic_reading: buildMultilangSpec(
      '60-120 words deep symbolic reading of dream logic'
    ),
    persona_profile: {
      name: buildMultilangSpec('creative, shareable Jungian persona name'),
      archetypal_style: buildMultilangSpec(
        '1-2 sentences describing the persona style'
      ),
      public_self: buildMultilangSpec(
        '1-2 sentences about outward identity or social mask'
      ),
      hidden_self: buildMultilangSpec(
        '1-2 sentences about hidden or disowned side'
      ),
      strengths: {
        tr: ['string'],
        en: ['string'],
      },
      shadow_sides: {
        tr: ['string'],
        en: ['string'],
      },
      core_fears: {
        tr: ['string'],
        en: ['string'],
      },
      emotional_needs: {
        tr: ['string'],
        en: ['string'],
      },
      defenses: {
        tr: ['string'],
        en: ['string'],
      },
      tagline: buildMultilangSpec('short emotionally striking one-line persona tagline'),
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
      anima_animus: {
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
    reflection_questions: {
      tr: ['string'],
      en: ['string'],
    },
  }
}

function buildPrompt(content, language) {
  return `
You are an elite Jungian dream analyst generating structured output for a premium dream interpretation product.

Your task:
Analyze the dream as a symbolic communication from the unconscious using Jungian depth psychology.
Treat the dream as potentially expressing persona dynamics, shadow material, anima/animus tension, blocked vitality, hidden fear, compensation, or an individuation movement.

Return ONLY a valid JSON object.

Dream language hint: ${language}

Dream text:
${content}

Return exactly this JSON shape:
${JSON.stringify(buildSchemaGuide(), null, 2)}

Core interpretation rules:
- Be psychologically deep, symbolically rich, aesthetically compelling, and introspective.
- Do NOT sound like generic self-help, astrology, fortune telling, or shallow motivation.
- Do NOT diagnose psychiatric disorders.
- Do NOT use absolute certainty. Use interpretive probability.
- The summary must feel like a refined Jungian reading of the psyche.
- The motiv field must offer integration guidance, not cheerleading.
- symbolic_reading must explain the symbolic logic and psychic movement of the dream.
- shadow_focus must identify what disowned or rejected part may be appearing.
- core_conflict must name the central inner tension.
- individuation_path must suggest the next movement toward inner wholeness.

Persona profile rules:
- Create a distinctive, emotionally resonant, shareable Jungian persona name.
- The persona name should feel premium, psychologically evocative, and specific to the dream.
- Avoid cliché labels.
- public_self should describe the outward adaptation or social mask.
- hidden_self should describe what may be concealed, repressed, or unowned.
- strengths, shadow_sides, core_fears, emotional_needs, and defenses should be psychologically coherent and not generic.

Color and visual theme rules:
- The output must support a visually rich frontend.
- visual_theme and section_themes are required and must be meaningfully tied to the psychology of the dream.
- Use elegant, premium, emotionally intelligent color logic.
- Avoid childish, neon, comedic, or chaotic palettes.
- Good references:
  - persona: gold, champagne, amber, ivory
  - shadow: plum, indigo, midnight blue, black cherry
  - anima/animus: silver, dusty rose, mist blue, pale emerald
  - fear: cold gray, muted violet, ice blue
  - transformation: emerald, deep teal, petrol blue, silver light
- All color fields must be valid 6-digit HEX values.
- gradient_suggestion should be short but visual, like "deep indigo to plum with soft silver edge glow".
- texture_hint can suggest velvet, mist, moonlight haze, obsidian gloss, brushed gold, soft grain, etc.
- highlight_style and card_style should be UI-friendly phrases.

Output coverage rules:
- Identify 1 to 5 Jungian archetypes.
- sentiment must be exactly one of: Fear, Joy, Sadness, Peace, Anxiety, Awe, Confusion, Surprise
- title, summary, motiv, shadow_focus, core_conflict, individuation_path, symbolic_reading, and persona_profile.name/tagline must be natural and strong.
- Write natural text for all 8 languages in title, summary, and motiv.
- For deeper sections, at minimum provide high-quality tr and en values where applicable.
- symbols should include 3 to 8 psychologically meaningful elements.
- emotions should contain 1 to 5 items.
- reflection_questions should contain 3 to 6 meaningful questions in tr and en.
- All scores and intensity values must be integers from 0 to 100.

Important quality bar:
This should feel like a premium psychological insight experience, not a generic AI summary.

Output ONLY JSON.
`.trim()
}

function parseAnalysis(rawContent) {
  let parsed
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw new Error('AI çıktısı JSON parse edilemedi')
  }

  const archetypes = normalizeArray(parsed.archetypes, 5)
  const sentiment = normalizeEmotionLabel(parsed.sentiment) || 'Confusion'

  const symbols = Array.isArray(parsed.symbols)
    ? parsed.symbols
        .map((item) => ({
          symbol: normalizeText(item?.symbol),
          meaning_tr: normalizeText(item?.meaning_tr),
          meaning_en: normalizeText(item?.meaning_en),
          emotional_charge: normalizeText(item?.emotional_charge),
          intensity: normalizeScore(item?.intensity, 0, 100),
          color: normalizeHex(item?.color, '#6B7280'),
        }))
        .filter((item) => item.symbol && item.meaning_tr && item.meaning_en)
        .slice(0, 8)
    : []

  const emotions = Array.isArray(parsed.emotions)
    ? parsed.emotions
        .map((item) => ({
          emotion: normalizeEmotionLabel(item?.emotion),
          score: normalizeScore(item?.score, 0, 100),
        }))
        .filter((item) => item.emotion)
        .slice(0, 5)
    : []

  const personaProfile = {
    name: parsed?.persona_profile?.name || {},
    archetypal_style: parsed?.persona_profile?.archetypal_style || {},
    public_self: parsed?.persona_profile?.public_self || {},
    hidden_self: parsed?.persona_profile?.hidden_self || {},
    strengths: parsed?.persona_profile?.strengths || {},
    shadow_sides: parsed?.persona_profile?.shadow_sides || {},
    core_fears: parsed?.persona_profile?.core_fears || {},
    emotional_needs: parsed?.persona_profile?.emotional_needs || {},
    defenses: parsed?.persona_profile?.defenses || {},
    tagline: parsed?.persona_profile?.tagline || {},
  }

  const visualTheme = {
    overall_mood: normalizeText(parsed?.visual_theme?.overall_mood),
    aura: normalizeText(parsed?.visual_theme?.aura),
    primary_color: normalizeHex(parsed?.visual_theme?.primary_color, '#1F2937'),
    secondary_color: normalizeHex(parsed?.visual_theme?.secondary_color, '#374151'),
    accent_color: normalizeHex(parsed?.visual_theme?.accent_color, '#C084FC'),
    background_color: normalizeHex(parsed?.visual_theme?.background_color, '#0B1020'),
    text_color: normalizeHex(parsed?.visual_theme?.text_color, '#F9FAFB'),
    gradient_suggestion: normalizeText(parsed?.visual_theme?.gradient_suggestion),
    texture_hint: normalizeText(parsed?.visual_theme?.texture_hint),
    highlight_style: normalizeText(parsed?.visual_theme?.highlight_style),
    card_style: normalizeText(parsed?.visual_theme?.card_style),
  }

  const sectionThemes = parsed?.section_themes || {}

  if (!archetypes.length) throw new Error('Arketip üretilemedi')
  if (!symbols.length) throw new Error('Sembol üretilemedi')
  if (!pickLocalized(parsed.summary, 'en', 'en')) {
    throw new Error('Özet üretilemedi')
  }
  if (!pickLocalized(personaProfile.name, 'en', 'en')) {
    throw new Error('Persona adı üretilemedi')
  }

  return {
    raw: parsed,
    title: parsed.title || {},
    summary: parsed.summary || {},
    motiv: parsed.motiv || {},
    shadow_focus: parsed.shadow_focus || {},
    core_conflict: parsed.core_conflict || {},
    individuation_path: parsed.individuation_path || {},
    symbolic_reading: parsed.symbolic_reading || {},
    persona_profile: personaProfile,
    visual_theme: visualTheme,
    section_themes: sectionThemes,
    reflection_questions: parsed.reflection_questions || {},
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
      temperature: 0.7,
      max_tokens: 3200,
      messages: [
        {
          role: 'system',
          content:
            'You return only valid JSON. You are a refined Jungian depth analyst producing premium structured dream interpretations for an immersive psychological product.',
        },
        {
          role: 'user',
          content: buildPrompt(content, language),
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
  if (!rawContent) {
    throw new Error('Groq boş içerik döndürdü')
  }

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
      model: OPENROUTER_MODEL,
      temperature: 0.7,
      max_tokens: 3200,
      messages: [
        {
          role: 'system',
          content:
            'You return only valid JSON. You are a refined Jungian depth analyst producing premium structured dream interpretations for an immersive psychological product.',
        },
        {
          role: 'user',
          content: buildPrompt(content, language),
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
  if (!rawContent) {
    throw new Error('OpenRouter boş içerik döndürdü')
  }

  return parseAnalysis(rawContent)
}

function buildImagePrompt({ content, analysis, language }) {
  const localizedSummary =
    pickLocalized(analysis.summary, language, 'en') ||
    pickLocalized(analysis.summary, 'en', 'en') ||
    ''

  const personaName =
    pickLocalized(analysis.persona_profile?.name, language, 'en') ||
    pickLocalized(analysis.persona_profile?.name, 'en', 'en') ||
    ''

  const archetypes = analysis.archetypes.slice(0, 3).join(', ')
  const symbolNames = analysis.symbols
    .slice(0, 4)
    .map((s) => s.symbol)
    .filter(Boolean)
    .join(', ')

  const shortDream = String(content || '')
    .replace(/s+/g, ' ')
    .trim()
    .slice(0, 280)

  const shortSummary = String(localizedSummary || '')
    .replace(/s+/g, ' ')
    .trim()
    .slice(0, 220)

  const palette = [
    analysis.visual_theme?.primary_color,
    analysis.visual_theme?.secondary_color,
    analysis.visual_theme?.accent_color,
  ]
    .filter(Boolean)
    .join(', ')

  return [
    'surreal dreamscape',
    'cinematic Jungian symbolism',
    `dominant emotion: ${analysis.sentiment}`,
    personaName ? `persona archetype: ${personaName}` : null,
    archetypes ? `archetypes: ${archetypes}` : null,
    symbolNames ? `symbols: ${symbolNames}` : null,
    shortSummary ? `psychological atmosphere: ${shortSummary}` : null,
    palette ? `color palette: ${palette}` : null,
    analysis.visual_theme?.aura ? `aura: ${analysis.visual_theme.aura}` : null,
    shortDream ? `dream scene: ${shortDream}` : null,
    'ethereal moonlit lighting',
    'mythic unconscious imagery',
    'high detail, evocative, haunting, symbolic',
  ]
    .filter(Boolean)
    .join(', ')
}

function buildPollinationsImageUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=1280&height=1280&seed=${seed}&model=flux&nologo=true&enhance=true`
}

function buildDreamUpdate({ dreamId, content, language, analysis, provider, model }) {
  const imagePrompt = buildImagePrompt({
    content,
    analysis,
    language,
  })

  const imageUrl = buildPollinationsImageUrl(imagePrompt, dreamId)

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

    ai_image_prompt: imagePrompt,
    ai_image_url: imageUrl,

    ai_jungian_analysis: {
      ...analysis.raw,
      shadow_focus: analysis.shadow_focus,
      core_conflict: analysis.core_conflict,
      individuation_path: analysis.individuation_path,
      symbolic_reading: analysis.symbolic_reading,
      persona_profile: analysis.persona_profile,
      visual_theme: analysis.visual_theme,
      section_themes: analysis.section_themes,
      reflection_questions: analysis.reflection_questions,
      provider,
      model,
      image_prompt: imagePrompt,
      image_url: imageUrl,
    },

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
  const GROQ_KEY = process.env.GROQ_KEY || process.env.GROQ_API_KEY
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
return res.status(200).json({
  debug: true,
  groqModel: GROQ_MODEL,
  openrouterModel: OPENROUTER_MODEL,
})
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
        console.error('Groq analyze failed:', err.message)
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
        model = OPENROUTER_MODEL
      } catch (openRouterErr) {
        const combined = [
          groqError ? `Groq: ${groqError.message}` : null,
          `OpenRouter: ${openRouterErr.message}`,
        ]
          .filter(Boolean)
          .join(' | ')
        throw new Error(combined)
      }
    }

    if (!analysis) {
      throw new Error(
        groqError?.message || 'Ne Groq ne OpenRouter ile analiz alınamadı'
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
      throw new Error(`Supabase update error: ${updateError.message}`)
    }

    return res.status(200).json({
      success: true,
      provider,
      model,
      imageUrl: updates.ai_image_url,
      analysis: {
        title: updates.ai_title,
        summary: updates.ai_summary,
        sentiment: analysis.sentiment,
        archetypes: analysis.archetypes,
        personaName:
          pickLocalized(analysis.persona_profile?.name, language || 'en', 'en') ||
          pickLocalized(analysis.persona_profile?.name, 'en', 'en'),
        colors: analysis.visual_theme,
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
