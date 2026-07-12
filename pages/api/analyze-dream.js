import { createClient } from '@supabase/supabase-js'

const GROQ_MODEL = 'llama-3.1-8b-instant'
const OPENROUTER_MODEL = 'meta-llama/llama-3.1-8b-instruct'
const ANALYSIS_VERSION = 'jung-v9-view-aligned-structured'

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

function normalizeText(value, maxLen = 4000) {
  if (typeof value !== 'string') return null
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLen)
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
  return ALLOWED_EMOTIONS.includes(cleaned) ? cleaned : null
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

function ensureMultilangText(value, fallbackLang = 'en') {
  const out = {}
  const source = value && typeof value === 'object' ? value : {}
  for (const lang of SUPPORTED_LANGS) {
    out[lang] =
      normalizeText(source[lang]) ||
      normalizeText(source[fallbackLang]) ||
      normalizeText(source.en) ||
      normalizeText(source.tr) ||
      null
  }
  return out
}

function ensureBilingualArray(value, max = 6) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    tr: normalizeArray(source.tr, max),
    en: normalizeArray(source.en, max),
  }
}

function ensureThemeBlock(value, fallback = {}) {
  const src = value && typeof value === 'object' ? value : {}
  return {
    aura: normalizeText(src.aura, 200) || fallback.aura || null,
    primary_color: normalizeHex(src.primary_color, fallback.primary_color || '#1F2937'),
    secondary_color: normalizeHex(src.secondary_color, fallback.secondary_color || '#374151'),
    accent_color: normalizeHex(src.accent_color, fallback.accent_color || '#C084FC'),
    gradient_suggestion:
      normalizeText(src.gradient_suggestion, 200) || fallback.gradient_suggestion || null,
  }
}

function buildMultilangSpec(shortRule) {
  return Object.fromEntries(SUPPORTED_LANGS.map((lang) => [lang, shortRule]))
}

function buildSchemaGuide() {
  return {
    title: buildMultilangSpec('short evocative title'),
    summary: buildMultilangSpec(
      '90-170 words, deep Jungian summary with symbolic and emotional richness'
    ),
    motiv: buildMultilangSpec(
      '40-80 words, reflective integration guidance, psychologically grounded'
    ),
    shadow_focus: {
      tr: '1-3 sentences on disowned psychic material',
      en: '1-3 sentences on disowned psychic material',
    },
    core_conflict: {
      tr: '1-2 sentences naming the central inner tension',
      en: '1-2 sentences naming the central inner tension',
    },
    individuation_path: {
      tr: '1-3 sentences suggesting movement toward wholeness',
      en: '1-3 sentences suggesting movement toward wholeness',
    },
    symbolic_reading: {
      tr: '60-120 words symbolic reading',
      en: '60-120 words symbolic reading',
    },
    persona_profile: {
      name: buildMultilangSpec('premium evocative Jungian persona name'),
      tagline: buildMultilangSpec('short emotionally striking one-line persona tagline'),
      archetypal_style: {
        tr: '1-2 sentences',
        en: '1-2 sentences',
      },
      public_self: {
        tr: '1-2 sentences about social mask',
        en: '1-2 sentences about social mask',
      },
      hidden_self: {
        tr: '1-2 sentences about hidden self',
        en: '1-2 sentences about hidden self',
      },
      strengths: { tr: ['string'], en: ['string'] },
      shadow_sides: { tr: ['string'], en: ['string'] },
      core_fears: { tr: ['string'], en: ['string'] },
      emotional_needs: { tr: ['string'], en: ['string'] },
      defenses: { tr: ['string'], en: ['string'] },
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
    reflection_questions: {
      tr: ['string'],
      en: ['string'],
    },
  }
}

function buildJsonSchema() {
  return {
    name: 'dream_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'object' },
        summary: { type: 'object' },
        motiv: { type: 'object' },
        shadow_focus: { type: 'object' },
        core_conflict: { type: 'object' },
        individuation_path: { type: 'object' },
        symbolic_reading: { type: 'object' },
        persona_profile: { type: 'object' },
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
        'shadow_focus',
        'core_conflict',
        'individuation_path',
        'symbolic_reading',
        'persona_profile',
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

function buildPrompt(content, language) {
  return `
You are an elite Jungian dream analyst generating structured output for the Lunosfer premium dream analysis experience.

Return ONLY valid JSON. No markdown. No explanation. No code fences.

Dream language hint: ${language}

Dream text:
${content}

Frontend contract:
The response will be rendered directly in a visual DreamAnalysisView screen with these sections:
1. Header: title, persona_profile.name, persona_profile.tagline, sentiment, archetypes
2. Genel Yorum: summary, motiv
3. Persona Profili: persona_profile.archetypal_style, public_self, hidden_self, strengths, shadow_sides, core_fears, emotional_needs
4. Gölge Analizi: shadow_focus, core_conflict
5. Sembolik Okuma: symbolic_reading, symbols
6. Dönüşüm Yolu: individuation_path
7. Düşündürmesi Gereken Sorular: reflection_questions
8. Visual theming: visual_theme and section_themes for premium cinematic UI styling

Return exactly this JSON shape:
${JSON.stringify(buildSchemaGuide(), null, 2)}

Interpretation rules:
- Use Jungian depth psychology, not generic inspiration.
- Treat the dream as symbolic communication from the unconscious.
- Consider persona, shadow, compensation, anima/animus tension, defensive structure, blocked vitality, fear, and individuation.
- Do not diagnose disorders.
- Do not use deterministic certainty.
- Be psychologically deep, elegant, emotionally intelligent, and symbolically coherent.
- summary must be rich and premium, not shallow.
- motiv must be integration guidance, not self-help cheerleading.
- shadow_focus must identify rejected/disowned psychic material.
- core_conflict must name the central psychic tension.
- symbolic_reading must explain dream logic and symbolic movement.
- individuation_path must suggest the next psychologically meaningful step.

Persona profile rules:
- persona_profile.name must feel distinctive, premium, memorable, and psychologically specific.
- tagline should feel elegant and shareable.
- public_self and hidden_self should be meaningfully contrasted.
- strengths, shadow_sides, core_fears, emotional_needs, defenses must be coherent with the same psyche.

Visual theme rules:
- visual_theme and section_themes must be tightly linked to the psychology of the dream.
- Use elegant premium palettes suitable for a dark immersive interface.
- Avoid childish, neon, comedic, random, or muddy palettes.
- All color fields must be valid 6-digit HEX values.
- section_themes must include persona, shadow, and transformation.
- gradient_suggestion must be short and visual.
- texture_hint, highlight_style, and card_style must be UI-friendly and aesthetically refined.

Coverage rules:
- title, summary, motiv must be present in all of: tr, en, es, fr, de, pt, ru, ja.
- shadow_focus, core_conflict, individuation_path, symbolic_reading should at least contain tr and en.
- persona_profile.name and persona_profile.tagline should be present in all 8 languages.
- persona_profile.archetypal_style, public_self, hidden_self should at least contain tr and en.
- strengths, shadow_sides, core_fears, emotional_needs, defenses should at least contain tr and en arrays.
- archetypes: 1 to 5 items.
- symbols: 3 to 8 items.
- emotions: 1 to 5 items.
- reflection_questions: 3 to 6 items in tr and en.
- sentiment must be exactly one of: ${ALLOWED_EMOTIONS.join(', ')}
- All intensity and score fields must be integers 0-100.

Quality bar:
This must feel like a premium psychological mirror, not an AI template.

Output ONLY JSON.
`.trim()
}

function extractJsonString(rawContent) {
  if (typeof rawContent !== 'string') {
    throw new Error('AI çıktısı metin değil')
  }

  const trimmed = rawContent.trim()

  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    const candidate = fenced[1].trim()
    JSON.parse(candidate)
    return candidate
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1)
    JSON.parse(candidate)
    return candidate
  }

  throw new Error('AI çıktısı JSON parse edilemedi')
}

function parseAnalysis(rawContent) {
  let parsed
  try {
    parsed = JSON.parse(extractJsonString(rawContent))
  } catch {
    throw new Error('AI çıktısı JSON parse edilemedi')
  }

  const archetypes = normalizeArray(parsed.archetypes, 5)
  const sentiment = normalizeEmotionLabel(parsed.sentiment) || 'Confusion'

  const symbols = Array.isArray(parsed.symbols)
    ? parsed.symbols
        .map((item) => ({
          symbol: normalizeText(item?.symbol, 120),
          meaning_tr: normalizeText(item?.meaning_tr, 300),
          meaning_en: normalizeText(item?.meaning_en, 300),
          emotional_charge: normalizeText(item?.emotional_charge, 160),
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
    name: ensureMultilangText(parsed?.persona_profile?.name),
    tagline: ensureMultilangText(parsed?.persona_profile?.tagline),
    archetypal_style: {
      tr: normalizeText(parsed?.persona_profile?.archetypal_style?.tr, 600),
      en: normalizeText(parsed?.persona_profile?.archetypal_style?.en, 600),
    },
    public_self: {
      tr: normalizeText(parsed?.persona_profile?.public_self?.tr, 600),
      en: normalizeText(parsed?.persona_profile?.public_self?.en, 600),
    },
    hidden_self: {
      tr: normalizeText(parsed?.persona_profile?.hidden_self?.tr, 600),
      en: normalizeText(parsed?.persona_profile?.hidden_self?.en, 600),
    },
    strengths: ensureBilingualArray(parsed?.persona_profile?.strengths, 6),
    shadow_sides: ensureBilingualArray(parsed?.persona_profile?.shadow_sides, 6),
    core_fears: ensureBilingualArray(parsed?.persona_profile?.core_fears, 6),
    emotional_needs: ensureBilingualArray(parsed?.persona_profile?.emotional_needs, 6),
    defenses: ensureBilingualArray(parsed?.persona_profile?.defenses, 6),
  }

  const visualTheme = {
    overall_mood: normalizeText(parsed?.visual_theme?.overall_mood, 200),
    aura: normalizeText(parsed?.visual_theme?.aura, 200),
    primary_color: normalizeHex(parsed?.visual_theme?.primary_color, '#1F2937'),
    secondary_color: normalizeHex(parsed?.visual_theme?.secondary_color, '#374151'),
    accent_color: normalizeHex(parsed?.visual_theme?.accent_color, '#C084FC'),
    background_color: normalizeHex(parsed?.visual_theme?.background_color, '#0B1020'),
    text_color: normalizeHex(parsed?.visual_theme?.text_color, '#F9FAFB'),
    gradient_suggestion: normalizeText(parsed?.visual_theme?.gradient_suggestion, 200),
    texture_hint: normalizeText(parsed?.visual_theme?.texture_hint, 120),
    highlight_style: normalizeText(parsed?.visual_theme?.highlight_style, 120),
    card_style: normalizeText(parsed?.visual_theme?.card_style, 120),
  }

  const sectionThemes = {
    persona: ensureThemeBlock(parsed?.section_themes?.persona, {
      aura: visualTheme.aura,
      primary_color: visualTheme.primary_color,
      secondary_color: visualTheme.secondary_color,
      accent_color: visualTheme.accent_color,
      gradient_suggestion: visualTheme.gradient_suggestion,
    }),
    shadow: ensureThemeBlock(parsed?.section_themes?.shadow, {
      aura: 'shadowed, introspective, dense',
      primary_color: '#241833',
      secondary_color: '#0F172A',
      accent_color: '#7C3AED',
      gradient_suggestion: 'deep plum into midnight blue',
    }),
    transformation: ensureThemeBlock(parsed?.section_themes?.transformation, {
      aura: 'renewal, integration, emergence',
      primary_color: '#0F766E',
      secondary_color: '#164E63',
      accent_color: '#99F6E4',
      gradient_suggestion: 'deep teal into silver-blue light',
    }),
  }

  const result = {
    raw: parsed,
    title: ensureMultilangText(parsed.title),
    summary: ensureMultilangText(parsed.summary),
    motiv: ensureMultilangText(parsed.motiv),
    shadow_focus: {
      tr: normalizeText(parsed?.shadow_focus?.tr, 1000),
      en: normalizeText(parsed?.shadow_focus?.en, 1000),
    },
    core_conflict: {
      tr: normalizeText(parsed?.core_conflict?.tr, 1000),
      en: normalizeText(parsed?.core_conflict?.en, 1000),
    },
    individuation_path: {
      tr: normalizeText(parsed?.individuation_path?.tr, 1000),
      en: normalizeText(parsed?.individuation_path?.en, 1000),
    },
    symbolic_reading: {
      tr: normalizeText(parsed?.symbolic_reading?.tr, 1500),
      en: normalizeText(parsed?.symbolic_reading?.en, 1500),
    },
    persona_profile: personaProfile,
    visual_theme: visualTheme,
    section_themes: sectionThemes,
    reflection_questions: ensureBilingualArray(parsed?.reflection_questions, 6),
    archetypes,
    sentiment,
    symbols,
    emotions,
  }

  if (!result.archetypes.length) throw new Error('Arketip üretilemedi')
  if (!result.symbols.length) throw new Error('Sembol üretilemedi')
  if (!pickLocalized(result.summary, 'en', 'en')) throw new Error('Özet üretilemedi')
  if (!pickLocalized(result.persona_profile.name, 'en', 'en')) {
    throw new Error('Persona adı üretilemedi')
  }

  return result
}

async function analyzeWithGroq({ content, language, groqKey, userId }) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7,
      max_completion_tokens: 3200,
      user: userId ? String(userId) : undefined,
      messages: [
        {
          role: 'system',
          content:
            'You return only valid JSON. No markdown. No commentary. Produce a premium Jungian structured dream analysis for Lunosfer.',
        },
        {
          role: 'user',
          content: buildPrompt(content, language),
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

  const rawContent = data?.choices?.[0]?.message?.content
  if (!rawContent) {
    throw new Error('Groq boş içerik döndürdü')
  }

  return parseAnalysis(rawContent)
}

async function analyzeWithOpenRouter({ content, language, apiKey, userId }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lunosfer.com',
      'X-OpenRouter-Title': 'Lunosfer',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.7,
      max_tokens: 3200,
      user: userId ? String(userId) : undefined,
      messages: [
        {
          role: 'system',
          content:
            'You return only valid JSON. No markdown. No commentary. Produce a premium Jungian structured dream analysis for Lunosfer.',
        },
        {
          role: 'user',
          content: buildPrompt(content, language),
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

  const 