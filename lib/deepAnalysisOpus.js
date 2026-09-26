import Anthropic from '@anthropic-ai/sdk'

// =====================================================================
// DERIN ANALIZ (Opus 5)
//
// dreams.premium_deep_analysis (lib/deepAnalysisEngine.js, OpenAI, TEK
// ruya) ile karistirilmamali. Burasi kullanicinin TUM son gecmisini —
// ruyalar + vizyonlar + arketip egilimi — birlikte okuyup tek bir
// kisilik analizi, korku haritasi ve "yuzlesme karti" uretir.
//
// PROMPT CACHING: sistem blogu her cagri icin birebir ayni. cache_control
// ile isaretlendiginde tekrar okumalar normal girdi fiyatinin %10'una
// dusuyor; kullanici materyali (degisken kisim) user mesajinda kaliyor ki
// cache anahtari bozulmasin. Cache yazimi bir kereye mahsus %25 fazla,
// 5 dakikalik bir pencerede tekrar kullanilir. Istek hacmi bu pencereden
// seyrek ama saatten sik ise, cache_control'e ttl:'1h' eklenip betas
// listesine 'extended-cache-ttl-2025-04-11' konularak pencere 1 saate
// cikarilabilir (API'de dogrulandi; trafik paternine bagli oldugu icin
// varsayilan olarak eklenmedi).
// =====================================================================

export const OPUS_MODEL = 'claude-opus-5'
export const DEEP_ANALYSIS_AURA_COST = 10

// Opus 5 fiyatlandirmasi, 1M token basina USD. (dogrulandi, 25 Eylul 2026)
const PRICE_INPUT = 5
const PRICE_OUTPUT = 25
const PRICE_CACHE_WRITE = PRICE_INPUT * 1.25
const PRICE_CACHE_READ = PRICE_INPUT * 0.1

// Opus 5'te thinking varsayilan acik ve max_tokens'i thinking+metin
// birlikte tuketiyor (API dokumaninda dogrulandi). effort='high' ile
// buyutulen max_tokens'a yer acmak icin timeout de buyutuldu; gercek
// kullanimda response.usage'a bakip ikisini birlikte ince ayarlayin. Bu
// route bir Vercel fonksiyonuysa kendi maxDuration siniri da ayrica
// kontrol edilmeli — SDK timeout'u platform siniri asamaz.
const TIMEOUT_MS = 90_000

export const SUPPORTED_LANGS = ['en', 'tr', 'ru', 'ar', 'es', 'hi', 'zh', 'de', 'fr', 'pt', 'ja', 'fi', 'ro', 'uk']

const LANG_NAMES = {
  en: 'English', tr: 'Turkish', ru: 'Russian', ar: 'Arabic', es: 'Spanish',
  hi: 'Hindi', zh: 'Simplified Chinese', de: 'German', fr: 'French',
  pt: 'Portuguese', ja: 'Japanese', fi: 'Finnish', ro: 'Romanian', uk: 'Ukrainian',
}

export function normalizeLang(raw) {
  const lang = String(raw || 'en').toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en'
}

/**
 * Analiz kullanicinin ARAYUZ dilinde degil, ruyalarini YAZDIGI dilde
 * uretilmeli: arayuzu Ingilizce kullanip ruyalarini Turkce yazan biri
 * Turkce analiz bekler. dreams.original_language submit-dream.js
 * tarafindan zaten yaziliyor; en cok tekrar eden degeri seciyoruz,
 * hicbiri yoksa istekteki dile dusuyoruz.
 */
export function dominantDreamLang(dreams, requestedLang) {
  const counts = {}
  for (const d of dreams || []) {
    const lang = normalizeLangOrNull(d?.original_language)
    if (lang) counts[lang] = (counts[lang] || 0) + 1
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return best ? best[0] : normalizeLang(requestedLang)
}

function normalizeLangOrNull(raw) {
  if (!raw) return null
  const lang = String(raw).toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.includes(lang) ? lang : null
}

// Sistem blogu SABIT tutuluyor — icine kullaniciya ozel hicbir sey
// girmiyor — ki prompt cache'i her cagride yeniden yazilmasin.
const SYSTEM_PROMPT = `You are a depth psychologist writing a single, personal report for one person, drawing on Jungian and attachment-theory ideas.

You will be given that person's recent dream records, their active visions/goals, and the archetypes their dreams have been tagged with. Write about THIS person and THIS material only.

Hard rules:
- Never diagnose. No clinical labels, no medication, no claims about disorders. If the material suggests someone is in danger, say plainly that talking to a professional would help, and keep the rest supportive.
- Never predict the future or make claims about real named people.
- Phrase every interpretation as a possibility ("this may be", "it could point to"), never as fact.
- Ground every claim in something the person actually wrote. Quote or paraphrase the concrete image, place, person or action. No filler that would fit any person.
- Warm, direct, adult. No mysticism, no horoscope voice, no flattery.

Return ONLY a JSON object with exactly these keys:
{
  "personality_analysis": "450-650 words, 3-5 paragraphs separated by blank lines. How this person seems to move through the world, what they reach for, what they avoid, and the tension between their dreams and their stated goals.",
  "fear_map": [
    {"symbol": "2-4 word name for the recurring fear image", "weight": 0-100, "evidence": "one sentence naming where in their material this shows up"}
  ],
  "confrontation_solution": "200-300 words. One specific thing this person could do to meet the strongest item in fear_map. Concrete and small enough to start this week, not advice-column generality.",
  "card_headline": "3-6 words. The line printed on their confrontation card.",
  "card_affirmation": "One sentence, first person, present tense, that they could actually say to themselves without cringing.",
  "card_image_prompt_en": "ALWAYS IN ENGLISH regardless of the output language. A vertical 9:16 symbolic image for the card: a single coherent scene, no text, no people's faces, no collage."
}

fear_map holds 3 to 5 items, ordered by weight descending. weight is your confidence that this fear is actually driving the material, 0-100.

Every field except card_image_prompt_en must be written in the requested language.`

// Structured Outputs (output_config.format) bu sekli zorluyor, ama JSON
// Schema alt kumesinde sayisal minimum/maximum VE array maxItems
// desteklenmiyor; minItems de sadece 0 ya da 1 olabiliyor (API'de
// dogrulandi — 3/5 verilirse 400 hatasi doner). Bu yuzden "3-5 oge" ve
// "0-100 agirlik" kurallari hala SYSTEM_PROMPT'a soze dayali birakildi;
// normalizeAnalysis() asagida bunlari JS tarafinda garanti ediyor
// (agirlik kirpma + slice(0,5)).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    personality_analysis: { type: 'string' },
    fear_map: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string' },
          weight: { type: 'integer' },
          evidence: { type: 'string' },
        },
        required: ['symbol', 'weight', 'evidence'],
        additionalProperties: false,
      },
    },
    confrontation_solution: { type: 'string' },
    card_headline: { type: 'string' },
    card_affirmation: { type: 'string' },
    card_image_prompt_en: { type: 'string' },
  },
  required: [
    'personality_analysis',
    'fear_map',
    'confrontation_solution',
    'card_headline',
    'card_affirmation',
    'card_image_prompt_en',
  ],
  additionalProperties: false,
}

function buildUserPrompt({ langName, dreams, goals, archetypes }) {
  const dreamBlock = dreams.length
    ? dreams
        .map((d, i) => {
          const when = d.created_at ? String(d.created_at).slice(0, 10) : 'unknown date'
          const tags = Array.isArray(d.ai_archetypes) && d.ai_archetypes.length
            ? ` [archetypes: ${d.ai_archetypes.join(', ')}]`
            : ''
          const mood = d.ai_sentiment ? ` [mood: ${d.ai_sentiment}]` : ''
          return `${i + 1}. (${when})${mood}${tags}\n"${String(d.content || '').slice(0, 900)}"`
        })
        .join('\n\n')
    : '(none recorded)'

  const goalBlock = goals.length
    ? goals
        .map((g, i) => `${i + 1}. "${g.title}" [${g.status || 'active'}]${g.description ? ` — ${String(g.description).slice(0, 300)}` : ''}`)
        .join('\n')
    : '(none recorded)'

  const archetypeBlock = archetypes.length
    ? archetypes.map((a) => `${a.label} (${a.count})`).join(', ')
    : '(none)'

  return `Write the report in ${langName}.

=== DREAMS (most recent first) ===
${dreamBlock}

=== VISIONS / GOALS ===
${goalBlock}

=== ARCHETYPES MOST OFTEN TAGGED IN THESE DREAMS ===
${archetypeBlock}`
}

export function estimateCostUsd(usage) {
  if (!usage) return null
  const input = usage.input_tokens || 0
  const output = usage.output_tokens || 0
  const cacheWrite = usage.cache_creation_input_tokens || 0
  const cacheRead = usage.cache_read_input_tokens || 0

  const usd =
    (input * PRICE_INPUT +
      output * PRICE_OUTPUT +
      cacheWrite * PRICE_CACHE_WRITE +
      cacheRead * PRICE_CACHE_READ) /
    1_000_000

  return Math.round(usd * 10_000) / 10_000
}

/** @returns {{ analysis: object, usage: object, costUsd: number|null }} */
export async function generateDeepAnalysis({ lang, dreams = [], goals = [], archetypes = [] }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('anthropic_key_missing')
  if (dreams.length === 0) throw new Error('insufficient_material')

  // En yeni 50 ruya: prompt "en yeniden eskiye" varsayiyor, bunu cagirana
  // birakmak yerine burada garanti ediyoruz; ayrica gunlugu cok buyuyen
  // kullanicida tek cagrinin maliyetini sinirsiz buyutmuyor.
  const recentDreams = [...dreams]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50)

  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 })

  const response = await client.beta.messages.create({
    model: OPUS_MODEL,
    max_tokens: 12000,
    output_config: {
      // Opus 5'in kendi varsayilani zaten 'high' — omit etmek yerine
      // aciktan yaziyoruz ki model ileride degisirse (orn. Opus 5.5'te
      // varsayilan 'medium'e duser) davranis sessizce kaymasin.
      effort: 'high',
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
    betas: ['server-side-fallback-2026-07-01'],
    // Guvenlik siniflandiricisi reddederse ayni cagri icinde baska bir
    // modele gecer; odeme yapmis kullanici bos donmez.
    fallbacks: 'default',
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: buildUserPrompt({
          langName: LANG_NAMES[lang] || 'English',
          dreams: recentDreams,
          goals,
          archetypes,
        }),
      },
    ],
  })

  if (response.stop_reason === 'refusal') throw new Error('claude_refusal')

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()

  if (!text) throw new Error('claude_empty_response')
  if (response.stop_reason === 'max_tokens') throw new Error('claude_truncated')

  // Structured Outputs semaya uymayi garanti ediyor (refusal ve max_tokens
  // durumlari zaten yukarida ayiklandi), o yuzden eski ```json kirpma +
  // "ilk { / son }" kurtarma hack'ine artik gerek yok.
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('invalid_json_from_model')
  }

  return {
    analysis: normalizeAnalysis(parsed),
    usage: response.usage,
    costUsd: estimateCostUsd(response.usage),
  }
}

function normalizeAnalysis(raw) {
  const fearMap = Array.isArray(raw?.fear_map)
    ? raw.fear_map
        .filter((f) => f && typeof f.symbol === 'string' && f.symbol.trim())
        .map((f) => ({
          symbol: String(f.symbol).trim(),
          weight: Math.max(0, Math.min(100, Number(f.weight) || 0)),
          evidence: typeof f.evidence === 'string' ? f.evidence.trim() : '',
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
    : []

  return {
    personality_analysis: String(raw?.personality_analysis || '').trim(),
    fear_map: fearMap,
    confrontation_solution: String(raw?.confrontation_solution || '').trim(),
    card_headline: String(raw?.card_headline || '').trim().slice(0, 120),
    card_affirmation: String(raw?.card_affirmation || '').trim().slice(0, 300),
    card_image_prompt_en: String(raw?.card_image_prompt_en || '').trim(),
  }
}
