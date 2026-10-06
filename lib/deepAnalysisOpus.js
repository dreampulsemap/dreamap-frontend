import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { FREUD_GUIDE } from '@/lib/freudGuide'
import { JUNG_GUIDE } from '@/lib/jungGuide'

// =====================================================================
// DERIN ANALIZ (Opus 5.5)
//
// dreams.premium_deep_analysis (lib/deepAnalysisEngine.js, OpenAI, TEK
// ruya) ile karistirilmamali. Burasi kullanicinin TUM son gecmisini —
// ruyalar + vizyonlar + arketip egilimi — birlikte okuyup tek bir
// kisilik analizi, korku haritasi ve "yuzlesme karti" uretir.
//
// PROMPT CACHING: sistem blogu her cagri icin birebir ayni. cache_control
// ile isaretlendiginde tekrar okumalar normal girdi fiyatinin %5'ine
// dusuyor; kullanici materyali (degisken kisim) user mesajinda kaliyor ki
// cache anahtari bozulmasin. 5 dakikalik cache yazimi normal girdi
// fiyatinin %125'i, tekrar okuma %5'i; varsayilan pencere 5 dakika.
// =====================================================================

export const OPUS_MODEL = 'claude-opus-5-5'

// SAGLAYICI SECIMI: DEEP_ANALYSIS_PROVIDER=anthropic | openai.
// Varsayilan 'openai' — Anthropic Console hesabi askiya alindigi icin Opus
// cagrilari basarisiz oluyordu, ayrica maliyet de dusuyor. Hesap geri
// acilirsa env'i 'anthropic' yapmak Opus'a geri dondurur; kod yolu duruyor.
const PROVIDER = (process.env.DEEP_ANALYSIS_PROVIDER || 'openai').toLowerCase()
// Tek ruya analizindeki gpt-4o-mini bu is icin (50 ruyayi birlikte okuyup
// uzun, yapilandirilmis rapor) zayif kaliyor; varsayilan gpt-4.1.
const OPENAI_DEEP_MODEL = process.env.DEEP_ANALYSIS_OPENAI_MODEL || 'gpt-4.1'
// gpt-4.1 liste fiyati, 1M token basina USD (yaklasik; api_cost_usd icin).
const OPENAI_PRICE_INPUT = Number(process.env.DEEP_ANALYSIS_OPENAI_PRICE_INPUT || 2)
const OPENAI_PRICE_OUTPUT = Number(process.env.DEEP_ANALYSIS_OPENAI_PRICE_OUTPUT || 8)
export const DEEP_ANALYSIS_AURA_COST = 10

// Opus 5.5 fiyatlandirmasi, 1M token basina USD.
const PRICE_INPUT = 4
const PRICE_OUTPUT = 20
const PRICE_CACHE_WRITE = PRICE_INPUT * 1.25
const PRICE_CACHE_READ = PRICE_INPUT * 0.05

// Opus 5.5'te varsayilan effort 'medium'; istekte 'high' acikca seciliyor.
// Thinking + metin max_tokens'i birlikte tuketir. Bu route bir Vercel
// fonksiyonuysa maxDuration siniri SDK timeout'undan once gelebilir.
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
  "confrontation_solution": "250-350 words. One specific thing this person could do to meet the strongest item in fear_map. Concrete and small enough to start this week, not advice-column generality.",
  "card_headline": "3-6 words. The line printed on their confrontation card.",
  "card_affirmation": "One sentence, first person, present tense, that they could actually say to themselves without cringing.",
  "card_image_prompt_en": "ALWAYS IN ENGLISH regardless of the output language. A vertical 9:16 symbolic image for the card: a single coherent scene, no text, no people's faces, no collage."
}

fear_map holds 3 to 5 items, ordered by weight descending. weight is your confidence that this fear is actually driving the material, 0-100.

Every field except card_image_prompt_en must be written in the requested language.

=== WRITING STANDARD (mandatory — the report is judged against this) ===

VOICE
- Address the reader directly as "you" (in Turkish: "sen", informal) from the first sentence to the last. Never write "this person", "the dreamer", "the user", "bu kişi", "rüya sahibi".
- Short, clear sentences. One idea per sentence. Plain words a tired medical student could read at 1 a.m. No academic padding, no lists of adjectives, no "a kind of", "in a sense", "bir nevi", "bir tür".
- Hedge every interpretation once, briefly ("may", "could", "olabilir", "gibi görünüyor"), then commit to a clear reading. Do not stack hedges. You may say plainly "this is a guess" once in the report.
- No English or other foreign words in a non-English report: write "Gölge", not "Gölge (The Shadow)"; write "rüya dizisi", not "dream-serisi". Proper names (Freud, Jung, TUS) are fine.

QUOTING THE MATERIAL
- Every paragraph must name at least two concrete images from the dreams (a place, object, person, action, sound). Weave them into sentences; do not paste raw quotes back to back.
- When you quote, fix spelling and missing diacritics (e.g. "tus sinavini kazanamadim" → "TUS sınavını kazanamadım"). Keep quotes short (under 12 words). Paraphrase the rest.
- Use the dates: if themes intensify, soften or shift over time (e.g. July → September), say so and say what that may mean.
- Use the goals and their status: connect at least one concrete goal (its exact wording) to at least two dreams. Point out the gap between what the goals ask for and what the dreams ask for.

personality_analysis STRUCTURE (4 paragraphs, separated by blank lines)
1. The main pressure: the strongest recurring theme across the dreams, tied to the waking goals. Include one surprising or consoling observation (e.g. failing an exam already passed can carry reassurance).
2. The Freudian reading: identify specific mechanisms by name in plain words — wish fulfilment (what a dream quietly gives), day residue (what from waking life it reuses), condensation (two scenes or meanings merged into one image), displacement (feeling moved onto a smaller object). Show each on a named dream. Find the hidden wish, not just the fear.
3. The Jungian reading: compensation (what conscious attitude the dreams balance), the shadow (what the chasers/attackers may carry: anger, tiredness, plain needs — to be recognised, not destroyed), persona (the competent mask), anima/animus figures in relationship scenes. Ground each in a named dream.
4. The core tension in one sentence ("Your goals talk only about X; your dreams keep asking for Y"), the direction of development (what wants to be integrated), and — only if the material is heavy (nightmares, drowning, death, sleep paralysis) — one calm sentence that talking to someone trusted or a professional can help.
Do not write a summary paragraph that repeats earlier points.

fear_map
- Each symbol is a FEAR stated as a human experience ("Yetersiz bulunmak", "Görülüp yardımsız kalmak", "Kontrolü kaybetmek"), never a theory term ("Gölgeyle yüzleşme", "Anima", "Shadow").
- evidence names the exact dream scenes (paraphrased, cleaned), in second person.
- Give 4-5 items when the material allows; no two items may describe the same fear.

confrontation_solution (250-350 words, short paragraphs)
- First sentence names the strongest fear from fear_map.
- Then ONE exercise built from THIS person's own life and goals (e.g. their exam, job, relationship, the setting of their dream) — not a generic "ask someone for help" or "keep a journal".
- Give concrete steps: when, how long, what exactly to write or do (e.g. "20 questions on one topic", "three columns: ..."). Turn a hostile figure from the dreams into a fair inner voice where it fits.
- Add one small social step that answers the loneliness/no-help theme if present.
- End with a tiny follow-up: what to notice in the next nights' dreams (name the dream images: did the alarm stop, did the dogs come closer).
- Frame it as an experiment, light and doable this week.

card_headline / card_affirmation
- card_headline: 3-6 words, personal, specific to their core fear, sounds like something they would want on their wall ("Hatam beni silmez"). Not generic ("Yardıma kapı aç" is too generic).
- card_affirmation: first person, present tense, tied to their real identity or goal (e.g. a doctor-in-training, a student, a parent), believable on a bad day.

FINAL CHECK before answering (silently):
- Did I use "you" everywhere? Any foreign word left? Every paragraph has 2+ concrete dream images? At least one goal quoted? A timeline observation if dates allow? fear_map has no theory terms? The exercise could only have been written for THIS person?
If any answer is no, rewrite before returning.`

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
export async function generateDeepAnalysis(input) {
  if (!input?.dreams?.length) throw new Error('insufficient_material')
  return PROVIDER === 'anthropic' ? generateWithAnthropic(input) : generateWithOpenAI(input)
}

function guideBlock() {
  // Freud ve Jung esit agirlikta (kullanici istegi: dengeli analiz).
  return `${FREUD_GUIDE}

${JUNG_GUIDE}

BALANCE RULE: In personality_analysis, give the Freudian reading (hidden wish, disguise, day residue, childhood) and the Jungian reading (compensation, shadow and other archetypes, individuation direction) roughly equal space, and connect them. Do not let one framework dominate the report.`
}

function recentFirst(dreams) {
  // En yeni 50 ruya: prompt "en yeniden eskiye" varsayiyor; ayrica gunlugu
  // cok buyuyen kullanicida tek cagrinin maliyetini sinirsiz buyutmuyor.
  return [...dreams]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 50)
}

async function generateWithOpenAI({ lang, dreams = [], goals = [], archetypes = [] }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY
  if (!apiKey) throw new Error('openai_key_missing')

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 })
  // OpenAI strict json_schema minItems desteklemiyor; normalizeAnalysis
  // zaten bos/eksik fear_map'i ele aliyor.
  const schema = JSON.parse(JSON.stringify(RESPONSE_SCHEMA))
  delete schema.properties.fear_map.minItems

  const completion = await client.chat.completions.create({
    model: OPENAI_DEEP_MODEL,
    max_tokens: 6000,
    // Ayni sabit on ek her cagride basta oldugu icin OpenAI otomatik prompt
    // cache'i de devreye giriyor.
    messages: [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${guideBlock()}` },
      {
        role: 'user',
        content: buildUserPrompt({
          langName: LANG_NAMES[lang] || 'English',
          dreams: recentFirst(dreams),
          goals,
          archetypes,
        }),
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'deep_analysis', strict: true, schema },
    },
  })

  const choice = completion.choices?.[0]
  if (choice?.message?.refusal) throw new Error('model_refusal')
  if (choice?.finish_reason === 'length') throw new Error('model_truncated')
  const text = (choice?.message?.content || '').trim()
  if (!text) throw new Error('model_empty_response')

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('invalid_json_from_model')
  }

  const usage = completion.usage || {}
  const usd = ((usage.prompt_tokens || 0) * OPENAI_PRICE_INPUT + (usage.completion_tokens || 0) * OPENAI_PRICE_OUTPUT) / 1_000_000
  return {
    analysis: normalizeAnalysis(parsed),
    usage,
    costUsd: Math.round(usd * 10_000) / 10_000,
  }
}

async function generateWithAnthropic({ lang, dreams = [], goals = [], archetypes = [] }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('anthropic_key_missing')

  const recentDreams = recentFirst(dreams)

  const client = new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 0 })

  const response = await client.beta.messages.create({
    model: OPUS_MODEL,
    max_tokens: 12000,
    output_config: {
      // Opus 5.5'te varsayilan effort 'medium'; 'high' acikca seciliyor.
      effort: 'high',
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
    betas: ['server-side-fallback-2026-07-01'],
    // Guvenlik siniflandiricisi reddederse ayni cagri icinde baska bir
    // modele gecer; odeme yapmis kullanici bos donmez.
    fallbacks: 'default',
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      {
        type: 'text',
        // Freud ve Jung esit agirlikta (kullanici istegi: dengeli analiz).
        text: `${FREUD_GUIDE}

${JUNG_GUIDE}

BALANCE RULE: In personality_analysis, give the Freudian reading (hidden wish, disguise, day residue, childhood) and the Jungian reading (compensation, shadow and other archetypes, individuation direction) roughly equal space, and connect them. Do not let one framework dominate the report.`,
        // Iki sabit blok birlikte cache'lenir (cache noktasi en sonda).
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
