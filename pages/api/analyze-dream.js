import { createClient } from '@supabase/supabase-js'
import { getAuthedUser } from '@/lib/supabaseAdmin'
import { translateFieldsWithRetry } from '@/lib/translator'
import { FREUD_GUIDE } from '@/lib/freudGuide'
import { JUNG_GUIDE } from '@/lib/jungGuide'
import { matchDreamSymbols } from '@/lib/dreamSymbols'

// Vercel fonksiyonunun 10 saniyede zaman aşımına uğramasını engeller (Max 60'a kadar izin verir)
export const config = {
  maxDuration: 60,
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Uygulama 11 dile hizmet veriyor (res/values-*). Burasi 8'de kalmisti:
// hi/zh/ar kullanicilari title/summary/motiv/symbol alanlarinda her zaman
// Ingilizce goruyordu, cunku normalizeMultiLangField eksik dilleri en'e
// dusuruyor ve model bu uc dili hic uretmiyordu.
const SUPPORTED_LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'hi', 'zh', 'ar', 'fi', 'ro', 'uk']

const LANG_LABELS = {
  en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', hi: 'Hindi',
  zh: 'Simplified Chinese', ar: 'Arabic', fi: 'Finnish', ro: 'Romanian', uk: 'Ukrainian',
}

function normalizeLang(raw) {
  const lang = String(raw || 'en').toLowerCase().split('-')[0]
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en'
}

// Modelden gelen alan hem duz string hem de (eski istemciler/eski cevaplar
// icin) {lang: text} haritasi olabilir; ikisini de tek bir stringe indirger.
function asText(value, lang) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    const pick = value[lang] || value.en || Object.values(value).find((v) => typeof v === 'string')
    return typeof pick === 'string' ? pick.trim() : ''
  }
  return ''
}

/**
 * Tek dilde uretilen alanlari ruyanin diline + Ingilizce'ye yayar
 * (eskiden TUM dillere yayiyordu; bkz. fonksiyon sonundaki not).
 *
 * Model 11 dili birden uretemiyordu (bkz. STATIC_INSTRUCTIONS notu): yalnizca
 * Ingilizce + rüya dilini donduruyor, geri kalani normalizeMultiLangField
 * sessizce Ingilizce'ye dolduruyordu. Artik tek dilde uretip Groq ile
 * ceviriyoruz — dil basina TEK istek, hepsi paralel.
 *
 * Ceviri basarisiz olursa o dil kaynak metinle kaliyor: eskisiyle ayni
 * davranis, yani hicbir regresyon yok.
 */
async function expandToAllLanguages(fields, srcLang) {
  const keys = Object.keys(fields)
  const maps = {}
  for (const key of keys) maps[key] = { [srcLang]: fields[key] }

  // Yalnizca ruyanin dili + Ingilizce. Diger 12 dile ceviri kaldirildi: her
  // ruya icin 12 ek istek yapiliyordu, ama ruya sahibi analizi zaten kendi
  // dilinde okuyor. Diger diller normalizeMultiLangField ile Ingilizce'ye
  // dusuyor (Kesfet'te baska dildeki kullanici Ingilizce gorur). Ileride:
  // kullaniciya sadece kendi dili + Ingilizce ruyalar gosterilecek.
  if (srcLang !== 'en') {
    const en = await translateFieldsWithRetry(fields, 'en', { sourceLang: srcLang })
    for (const key of keys) maps[key].en = en[key] || fields[key]
  }

  return maps
}

// SABIT TALIMATLAR — her istekte birebir ayni. OpenAI, 1024 token'i asan ve
// istekler arasinda degismeyen on ekleri otomatik cache'liyor (gpt-4o-mini'de
// cache'ten okunan girdi yarim fiyat). Bu yuzden dile/ruyaya ozel hicbir sey
// buraya girmiyor; Freud/Jung rehberleri burada ucuza geliyor.
const STATIC_INSTRUCTIONS = `Analyze the dream in the user message using BOTH Freud's and Jung's methods (reference frameworks below), with roughly equal weight.

This is a free preview analysis, but it must provide a genuine, high-quality, and deeply resonant psychological insight (about 10-15% of a full reading). It must never feel like cheap marketing or empty clickbait. Instead, it should offer a real, substantive key to the dreamer's unconscious—revealing an authentic psychic dynamic (such as an archetypal tension, a shadow reflection, or an anima/animus movement) that triggers immediate psychological curiosity and intellectual excitement (dopamine).

Deliver an emotionally intelligent, intellectually rich, and poetic interpretation that leaves the dreamer with a profound realization, while naturally revealing that this is just the outer threshold of a much deeper, unresolved psychic pattern waiting to be explored in full.

Return only valid JSON.
Do not wrap the answer in markdown.
Do not include any explanation outside JSON.

Rules:
- simple is a SEPARATE, plain-language section shown BEFORE the Jungian analysis. Keep it SHORT: 60-90 words, one or two short paragraphs. Brevity matters more than completeness — pick the one or two things that matter most and leave the rest to the deeper analysis.
- simple is the ONE part of this response that must NOT be poetic, evocative or literary. Every other instruction below about beauty, resonance and poetic language DOES NOT APPLY to simple. Write it the way you would explain the dream out loud to a friend who knows nothing about psychology: everyday words, short plain sentences, no metaphors, no jargon (never "archetype", "shadow", "anima", "unconscious", "psyche", "threshold", "psychic"). If a sentence sounds like literature, rewrite it plainer.
- simple MUST be grounded in THIS dream: name the concrete people, places, objects and actions the dreamer actually wrote. Never generic filler that would fit any dream, and never a reworded copy of "summary".
- simple must EXPLAIN, not retell. Do not open by summarising what happened — the dreamer already knows. Take the one or two strongest images they wrote and say, in plain words, what they might be about in an ordinary life: what the feeling underneath could be, and what it might be asking of them. A retelling of the dream is a failed answer, and so is a wall of text.
- simple MUST NOT predict the future, claim anything about real events or real people, or give a medical/psychiatric diagnosis or advice. Phrase interpretations as possibilities ("this may reflect...", "it could be about..."), never as certainties.
- summary must be at least 3-4 sentences of high-density insight that combines one Freudian reading (the hidden wish, day residue, condensation or displacement in a concrete image) and one Jungian reading (compensation, shadow, anima/animus or another archetype). Name the concrete dream image each reading rests on. Provide genuine substance, identifying an actual unconscious tension.
- keep it beautiful, evocative, and psychologically substantive (avoid sounding clinical or generic).
- focus on triggering intellectual excitement and emotional resonance (curiosity-inducing).
- suggest that this threshold leads into a deeper, highly personal psychic territory that can be fully mapped in a premium analysis.
- motiv must be one short poetic, striking sentence.
- symbol must be ONE concrete image or object actually present in the dream (e.g. "a foggy lighthouse", "a locked door", "the flooded staircase") — 2-5 words, not an abstract concept. This is shown on its own as the dream's "key symbol", so it must be identifiable and evocative on its own, without the rest of the analysis around it.
- archetypes should contain 1 to 3 items max, always written in English (e.g. "The Shadow", "The Wanderer").
- sentiment should be a short lowercase word like: hopeful, anxious, mysterious, tender, restless, heavy, luminous.

Write "title", "summary", "motiv", "symbol" and "simple" in the ONE language named in the user message. Return each of them as a plain string, not an object.
"archetypes" stays in English. "sentiment" stays a lowercase English word.

Address the dreamer directly and informally in every field (Turkish: "sen", never "siz"; e.g. "rüyan", "hissettin"). In Turkish the dream is "rüya", never "hayal".
Language quality: in a non-English output use correct spelling and diacritics, natural idiomatic phrasing, and no English words (write "Gölge", not "The Shadow"; archetypes field excepted). When you mention something from the dream, fix the dreamer's typos and missing diacritics.

SHORT DREAMS: if the dream is very short or has almost no detail (for example "I saw a snake", "yılan gördüm"), do NOT pad it with a generic symbol-dictionary reading. Instead:
- Keep summary to 2-3 sentences: one Freudian and one Jungian possibility, each clearly marked as one of several possibilities.
- In simple, say plainly that a single image can mean very different things, then ask 2-3 short, concrete questions as real questions ending with a question mark, each on its own line (e.g. in Turkish: "Yılan neredeydi?", "Sana ne yaptı?", "Korktun mu, merak mı ettin?"). End by inviting the dreamer to add these details to the dream to get a personal reading.
- Never invent details that were not written.

If the user message contains SYMBOL NOTES, use them as background knowledge only: never copy them, never treat them as fixed meanings, and always tie them to what THIS dream actually shows.

JSON shape (keep exactly these keys):
{
  "simple": "",
  "title": "",
  "summary": "",
  "motiv": "",
  "symbol": "",
  "sentiment": "",
  "archetypes": []
}

The reference frameworks below were written for multi-dream reports. Apply their METHOD to this ONE dream and ignore anything they say about report structure, dream series or naming limits.

${FREUD_GUIDE}

${JUNG_GUIDE}

FINAL REMINDERS (these override anything above):
- Turkish output: address the dreamer as "sen" everywhere; the dream is "rüya" (never "hayal"); spell carefully ("rüyanda", never "rüyanında").
- No English words in a non-English output: write "Jung'a göre", "Freud'a göre", never "Jungian", "Freudian", "perspektif".
- Never write a symbol-dictionary reading that would fit any dream; tie every sentence to what THIS dream says.`

function buildUserMessage(params) {
  const content = params && params.content ? params.content : ''
  const lang = params && params.lang ? params.lang : 'en'
  const notes = matchDreamSymbols(content)
  const noteBlock = notes.length
    ? `\n\nSYMBOL NOTES (background only):\n${notes.map((n) => `- ${n.id}: ${n.note}`).join('\n')}`
    : ''

  return `Output language: ${LANG_LABELS[lang] || 'English'}

Dream:
"""
${content}
"""${noteBlock}`
}

// Cok kisa ruyalarda (or. "yilan gordum") gpt-4o-mini soru sorma kuralini
// guvenilir uygulamiyor; sorulari koddan ekliyoruz ki her seferinde ciksin.
const SHORT_DREAM_WORDS = 8
const SHORT_DREAM_QUESTIONS = {
  tr: 'Rüyanı biraz açarsan yorum sana özel olur:\n• Neredeydin, rüyada başka kim vardı?\n• Ne oldu, sen ne yaptın?\n• Uyandığında nasıl hissettin?\nBu ayrıntıları rüyana ekleyebilirsin.',
  en: 'Add a little more and the reading becomes personal:\n• Where were you, and who else was there?\n• What happened, and what did you do?\n• How did you feel when you woke up?\nYou can add these details to your dream.',
}

function isShortDream(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length < SHORT_DREAM_WORDS
}

function withShortDreamQuestions(simple, lang) {
  const q = SHORT_DREAM_QUESTIONS[lang] || SHORT_DREAM_QUESTIONS.en
  const base = String(simple || '').trim()
  return base ? `${base}\n\n${q}` : q
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
  const userMessage = buildUserMessage(params)
  // Vercel iç limiti 60, fetch işlemine de 50 saniye verelim ki patlamasın.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 50000)

  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY
    // gpt-4o-mini sonuclari zayif kaliyordu (1.000 ruyada ~2$ fark). FREE_ANALYSIS_MODEL ile geri alinabilir.
    const model = process.env.FREE_ANALYSIS_MODEL || 'gpt-4.1-mini'
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
              'You are an expert dream analyst trained in both Freudian and Jungian methods. Write short, emotionally resonant, and psychologically rich analyses that offer genuine, high-quality insights while naturally inviting the dreamer to explore the deeper layers of their unconscious. Always return valid JSON only.\n\n' +
              STATIC_INSTRUCTIONS,
          },
          {
            role: 'user',
            content: userMessage,
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

    // GUVENLIK: Onceden kimlik hic sorulmuyordu; ruya id'sini bilen herkes
    // baskasinin ruyasini tekrar tekrar analiz ettirip OpenAI maliyeti
    // olusturabiliyordu. Artik yalnizca ruyanin sahibi (Bearer token).
    // Cagiranlar: add-dream.js, DreamFeedCard.jsx, submit-dream.js (token'i
    // iletir), Android (AuthInterceptor her istege ekler).
    const user = await getAuthedUser(req)
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    if (dreamId) {
      const result = await supabaseAdmin
        .from('dreams')
        .select('id, user_id, content, original_language')
        .eq('id', dreamId)
        .single()

      if (result.error || !result.data) {
        return res.status(404).json({ error: 'dream_not_found' })
      }

      if (result.data.user_id !== user.id) {
        return res.status(403).json({ error: 'forbidden' })
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

    const srcLang = normalizeLang(dream.original_language || lang)

    const sourceFields = {
      simple: isShortDream(dream.content)
        ? withShortDreamQuestions(asText(analysis.simple, srcLang), srcLang)
        : asText(analysis.simple, srcLang),
      title: asText(analysis.title, srcLang),
      summary: asText(analysis.summary, srcLang),
      motiv: asText(analysis.motiv, srcLang),
      symbol: asText(analysis.symbol, srcLang),
    }

    const expanded = await expandToAllLanguages(sourceFields, srcLang)

    const normalized = {
      simple: normalizeMultiLangField(expanded.simple),
      title: normalizeMultiLangField(expanded.title),
      summary: normalizeMultiLangField(expanded.summary),
      motiv: normalizeMultiLangField(expanded.motiv),
      symbol: normalizeMultiLangField(expanded.symbol),
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

      ai_symbol: normalized.symbol.en || null,
      ai_symbol_en: normalized.symbol.en || null,
      ai_symbol_tr: normalized.symbol.tr || null,

      ai_sentiment: normalized.sentiment || null,
      ai_archetypes: normalized.archetypes,

      ai_jungian_analysis: {
        // `simple` yukarida normalize ediliyordu ama bu jsonb'ye HIC
        // yazilmiyordu; Android DreamSimpleCardPage `simple[locale]`
        // okudugu icin "Basitce ne anlama geliyor" sayfasi her ruyada
        // bos gorunuyordu (prod'da simple iceren ruya sayisi: 0).
        simple: normalized.simple,
        title: normalized.title,
        summary: normalized.summary,
        motiv: normalized.motiv,
        symbol: normalized.symbol,
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
