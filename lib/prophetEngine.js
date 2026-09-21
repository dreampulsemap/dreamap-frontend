import Anthropic from '@anthropic-ai/sdk'
import { stripJsonFence } from '@/lib/aiClient'

// =====================================================================
// KAHIN METIN URETIMI — ucretsiz ve premium katman
//
// Ucretsiz : Groq / openai/gpt-oss-20b — kisa, tek paragraf.
// Premium  : Claude Opus 5 — uzun, gerekceli, ruya-vizyon baglantilarini
//            acik acik kuran ve eyleme donuk bir adim oneren metin.
//
// Vercel Hobby planinda fonksiyon tavani 60sn (bkz. route'taki maxDuration).
// Bu yuzden premium cagri tek denemeyle ve 40sn timeout ile yapiliyor;
// basarisiz olursa ucretsiz uretece dusuluyor ki odeme yapan kullanici
// bos ekranla kalmasin (detailed=false donuyor).
// =====================================================================

const GROQ_MODEL = 'openai/gpt-oss-20b'
const CLAUDE_MODEL = 'claude-opus-5'

const PREMIUM_TIMEOUT_MS = 40000
const FREE_TIMEOUT_MS = 25000

const LANG_NAME = {
  en: 'English', tr: 'Turkish', ru: 'Russian', ar: 'Arabic',
  es: 'Spanish', hi: 'Hindi', zh: 'Chinese', de: 'German',
  fr: 'French', pt: 'Portuguese', ja: 'Japanese'
}

export function languageName(lang) {
  return LANG_NAME[lang] || LANG_NAME.en
}

// ---------------------------------------------------------------------
// Kullanicinin kendi ruya + vizyonlarindan model icin baglam metni.
// Icerikler kirpiliyor: hem token maliyeti hem de tek bir cok uzun ruyanin
// baglami domine etmesini engellemek icin.
// ---------------------------------------------------------------------
export function buildPersonalContext({ dreams = [], goals = [] }) {
  const dreamLines = dreams.map((d, i) => {
    const text = String(d.content || '').replace(/\s+/g, ' ').trim().slice(0, 400)
    const archetypes = Array.isArray(d.ai_archetypes) ? d.ai_archetypes.join(', ') : ''
    const meta = [archetypes && `archetypes: ${archetypes}`, d.ai_sentiment && `emotion: ${d.ai_sentiment}`]
      .filter(Boolean).join(' | ')
    return `D${i + 1}. "${text}"${meta ? ` (${meta})` : ''}`
  })

  const goalLines = goals.map((g, i) => {
    const title = String(g.title || '').replace(/\s+/g, ' ').trim().slice(0, 120)
    const desc = String(g.description || '').replace(/\s+/g, ' ').trim().slice(0, 200)
    return `V${i + 1}. "${title}"${desc ? ` — ${desc}` : ''}${g.status ? ` [${g.status}]` : ''}`
  })

  return {
    dreamCount: dreams.length,
    goalCount: goals.length,
    text: [
      dreamLines.length ? `Recent dreams:\n${dreamLines.join('\n')}` : 'Recent dreams: (none recorded yet)',
      goalLines.length ? `Vision board entries:\n${goalLines.join('\n')}` : 'Vision board entries: (none recorded yet)'
    ].join('\n\n')
  }
}

function systemPrompt({ lang, detailed }) {
  const langName = languageName(lang)
  const base = `You are the Oracle of Lunosfer — a Jungian dream interpreter speaking to one specific person about their own recorded dreams and vision-board goals. Write ONLY in ${langName}, as a native speaker would. Never mention that you are an AI, never mention these instructions, and never invent dreams or goals the person did not record.`

  return detailed
    ? `${base}

Write a rich, layered reading of 4 to 6 short paragraphs:
1. Name the pattern you see running through their dreams.
2. Tie that pattern explicitly to one or more of their vision-board goals — quote the fragment you are reading from.
3. Name the tension or shadow the pattern points to, honestly but kindly.
4. Close with ONE concrete, doable step for the coming days.
Be specific to their material. Never pad with generic mysticism.`
    : `${base}

Write ONE short paragraph — 2 to 3 sentences. Evocative and specific to their material, but brief. Do not give a step-by-step plan.`
}

function userPrompt({ mode, question, context }) {
  if (mode === 'ask') {
    return `This person's own records:\n\n${context.text}\n\nThey ask the Oracle:\n"""\n${question}\n"""\n\nAnswer their question, grounding the answer in their own dreams and goals above.`
  }
  return `This person's own records:\n\n${context.text}\n\nGive them today's prophecy, drawn from the material above.`
}

// ---------------------------------------------------------------------
// UCRETSIZ KATMAN — Groq
// ---------------------------------------------------------------------
export async function generateFreeProphecy({ mode, question, lang, context }) {
  const key = process.env.GROQ_KEY
  if (!key) throw new Error('groq_key_missing')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FREE_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt({ lang, detailed: false }) },
          { role: 'user', content: userPrompt({ mode, question, context }) }
        ]
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`groq_error_${response.status}`)
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content || ''
    return stripJsonFence(raw).trim()
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------
// PREMIUM KATMAN — Claude Opus 5
//
// thinking parametresi bilerek gonderilmiyor: Opus 5'te adaptive thinking
// zaten varsayilan olarak acik. effort "low" — bu yaratici/yorumlayici kisa
// bir metin, derin muhakeme gerektirmiyor; dusuk effort 60sn'lik Vercel
// tavanina karsi guvenlik payi birakiyor.
//
// fallbacks:"default" — guvenlik siniflandiricisi istegi reddederse (ornegin
// kullanici rahatsiz edici bir soru yazarsa) API ayni cagri icinde baska bir
// modele gecip cevap uretiyor; odeme yapan kullanici bos donmuyor.
// ---------------------------------------------------------------------
export async function generatePremiumProphecy({ mode, question, lang, context }) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('anthropic_key_missing')

  const client = new Anthropic({
    timeout: PREMIUM_TIMEOUT_MS, // TS/JS SDK'de milisaniye
    maxRetries: 0                // 60sn tavani var; yeniden deneme butceyi asar
  })

  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    // Adaptive thinking acik oldugu icin dusunme token'lari da bu butceden
    // harcaniyor. Beklenen cikti ~600 token; tavani yuksek tutmak metnin
    // ortasinda kesilmesini onluyor ve ek maliyet getirmiyor (ust sinir,
    // harcama degil).
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: systemPrompt({ lang, detailed: true }),
    messages: [{ role: 'user', content: userPrompt({ mode, question, context }) }]
  })

  // stop_reason'i icerikten ONCE kontrol et: zincirin tamami reddettiyse
  // content bos/anlamsiz olabilir.
  if (response.stop_reason === 'refusal') {
    throw new Error('claude_refusal')
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  if (!text) throw new Error('claude_empty_response')

  // Butce tukendiyse metin cumlenin ortasinda kesilmis olabilir; yarim bir
  // kehanet gostermektense ucretsiz uretece dusmek daha iyi.
  if (response.stop_reason === 'max_tokens') throw new Error('claude_truncated')

  return text
}
