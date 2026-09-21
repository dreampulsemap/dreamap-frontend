import { createClient } from '@supabase/supabase-js'
import { translateFieldsWithRetry } from '@/lib/translator'

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
const SUPPORTED_LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja', 'hi', 'zh', 'ar']

const LANG_LABELS = {
  en: 'English', tr: 'Turkish', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', hi: 'Hindi',
  zh: 'Simplified Chinese', ar: 'Arabic',
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
 * Tek dilde uretilen alanlari desteklenen TUM dillere yayar.
 *
 * Model 11 dili birden uretemiyordu (bkz. buildTeaserPrompt notu): yalnizca
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

  // Ingilizce PIVOT. Ceviri modeli (Groq gpt-oss-20b) Turkce -> Cince/Japonca
  // gibi ciftlerde metni bazen cevirmeden aynen geri veriyordu; Ingilizce'den
  // cevirmek her hedef dil icin belirgin sekilde daha guvenilir.
  let pivot = fields
  let pivotLang = srcLang
  if (srcLang !== 'en') {
    const en = await translateFieldsWithRetry(fields, 'en', { sourceLang: srcLang })
    for (const key of keys) maps[key].en = en[key] || fields[key]
    pivot = Object.fromEntries(keys.map((k) => [k, maps[k].en]))
    pivotLang = 'en'
  }

  const targets = SUPPORTED_LANGS.filter((l) => l !== srcLang && l !== 'en')
  const results = await Promise.all(
    targets.map(async (lang) => [lang, await translateFieldsWithRetry(pivot, lang, { sourceLang: pivotLang })])
  )

  for (const [lang, translated] of results) {
    for (const key of keys) {
      maps[key][lang] = translated[key] || pivot[key]
    }
  }

  return maps
}

function emptyLangMap() {
  return SUPPORTED_LANGS.reduce((acc, l) => {
    acc[l] = ''
    return acc
  }, {})
}

function buildTeaserPrompt(params) {
  const content = params && params.content ? params.content : ''
  const lang = params && params.lang ? params.lang : 'en'
  const LANG_NAMES = LANG_LABELS

  return `
Analyze the following dream from a profound Jungian perspective. 

This is a free preview analysis, but it must provide a genuine, high-quality, and deeply resonant psychological insight (about 10-15% of a full reading). It must never feel like cheap marketing or empty clickbait. Instead, it should offer a real, substantive key to the dreamer's unconscious—revealing an authentic psychic dynamic (such as an archetypal tension, a shadow reflection, or an anima/animus movement) that triggers immediate psychological curiosity and intellectual excitement (dopamine).

Deliver an emotionally intelligent, intellectually rich, and poetic interpretation that leaves the dreamer with a profound realization, while naturally revealing that this is just the outer threshold of a much deeper, unresolved psychic pattern waiting to be explored in full.

Return only valid JSON.
Do not wrap the answer in markdown.
Do not include any explanation outside JSON.

Rules:
- simple is a SEPARATE, plain-language section shown BEFORE the Jungian analysis. 120-180 words, 2-3 short paragraphs.
- simple is the ONE part of this response that must NOT be poetic, evocative or literary. Every other instruction below about beauty, resonance and poetic language DOES NOT APPLY to simple. Write it the way you would explain the dream out loud to a friend who knows nothing about psychology: everyday words, short plain sentences, no metaphors, no jargon (never "archetype", "shadow", "anima", "unconscious", "psyche", "threshold", "psychic"). If a sentence sounds like literature, rewrite it plainer.
- simple MUST be grounded in THIS dream: name the concrete people, places, objects and actions the dreamer actually wrote. Never generic filler that would fit any dream, and never a reworded copy of "summary".
- simple must EXPLAIN, not retell. Do not open by summarising what happened — the dreamer already knows. Take each concrete image they wrote and say, in plain words, what it might be about in an ordinary life: what the feeling underneath it could be, where it might come from, what it might be asking of them. At least 120 words; a short retelling of the dream is a failed answer.
- simple MUST NOT predict the future, claim anything about real events or real people, or give a medical/psychiatric diagnosis or advice. Phrase interpretations as possibilities ("this may reflect...", "it could be about..."), never as certainties.
- summary must be at least 3-4 sentences of high-density Jungian insight. Provide genuine substance, identifying an actual unconscious tension or archetype.
- keep it beautiful, evocative, and psychologically substantive (avoid sounding clinical or generic).
- focus on triggering intellectual excitement and emotional resonance (curiosity-inducing).
- suggest that this threshold leads into a deeper, highly personal psychic territory that can be fully mapped in a premium analysis.
- motiv must be one short poetic, striking sentence.
- symbol must be ONE concrete image or object actually present in the dream (e.g. "a foggy lighthouse", "a locked door", "the flooded staircase") — 2-5 words, not an abstract concept. This is shown on its own as the dream's "key symbol", so it must be identifiable and evocative on its own, without the rest of the analysis around it.
- archetypes should contain 1 to 3 items max, always written in English (e.g. "The Shadow", "The Wanderer").
- sentiment should be a short lowercase word like: hopeful, anxious, mysterious, tender, restless, heavy, luminous.

Write "title", "summary", "motiv", "symbol" and "simple" in ONE language only:
${LANG_NAMES[lang] || 'English'}. Return each of them as a plain string, not an object.
"archetypes" stays in English. "sentiment" stays a lowercase English word.

Earlier versions of this prompt asked for all eleven languages at once. The model
produced two and the rest were silently filled with the English text, so most
users read an English analysis. Translation is now a separate step; put all your
effort into this one language.

Dream:
"""
${content}
"""

JSON shape (keep exactly these keys):
${JSON.stringify(
  {
    simple: emptyLangMap(),
    title: emptyLangMap(),
    summary: emptyLangMap(),
    motiv: emptyLangMap(),
    symbol: emptyLangMap(),
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

    const srcLang = normalizeLang(dream.original_language || lang)

    const sourceFields = {
      simple: asText(analysis.simple, srcLang),
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
