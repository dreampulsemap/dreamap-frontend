import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

// =====================================================================
// GÜNLÜK KOLEKTİF ÖNGÖRÜ ÜRETİMİ — Vercel Cron (vercel.json: her gün 06:00 UTC)
//
// ÖNCEKİ HALİ NEDEN HİÇ ÇALIŞMIYORDU (iki bağımsız sebep):
//  1. `daily_prophecy` tablosuna yazıyordu, ama DreamGlobe.jsx `collective_predictions`
//     tablosunu okuyor — yazan ve okuyan hiç buluşmuyordu.
//  2. Vercel Cron isteği GET olarak gönderir, ama handler `req.method !== 'POST'`
//     kontrolüyle her çağrıyı 405 ile reddediyordu.
//
// Bu sürüm: doğru tabloya (collective_predictions) yazıyor, GET kabul ediyor,
// Groq yerine Gemini kullanıyor (diğer AI route'larıyla tutarlı), tek uzun
// "kehanet" yerine son 3 günün rüyalarından birkaç KISA öngörü üretiyor.
// =====================================================================

const getGeminiClient = () => {
  const key = process.env.GEMINI_FREE_KEY || process.env.GEMINI_KEY
  if (!key) return null
  return new GoogleGenAI({ apiKey: key })
}

// DreamGlobe.jsx / lib/translations.js ile aynı 8 dil (title_{lang}/content_{lang} şeması)
const LANGS = ['en', 'tr', 'es', 'fr', 'de', 'pt', 'ru', 'ja']
const DAYS_WINDOW = 3
const MAX_PREDICTIONS = 5

function buildPrompt(dreamExcerpts, archetypeCounts, emotionCounts) {
  const langList = LANGS.join(', ')
  return `You are analyzing ${dreamExcerpts.length} real anonymized dreams shared in the
last ${DAYS_WINDOW} days on a collective dream-journaling platform.

Dream excerpts (may be partial):
${dreamExcerpts.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Archetype frequency: ${JSON.stringify(archetypeCounts)}
Emotion frequency: ${JSON.stringify(emotionCounts)}

Task: Identify up to ${MAX_PREDICTIONS} distinct recurring patterns/themes across these
dreams (e.g. a dominant archetype, a shared emotional undercurrent, a recurring symbol).
For EACH pattern, write a SHORT "collective prediction" — a brief, evocative 2-3 sentence
insight about what this pattern might suggest about the collective unconscious right now.
Keep each one SHORT (30-50 words), not a long prophecy.

Return ONLY valid JSON, no markdown fences, in this exact shape:
{
  "predictions": [
    {
      "themes": ["short-tag-1", "short-tag-2"],
      "title": { ${LANGS.map((l) => `"${l}": "short title in that language"`).join(', ')} },
      "content": { ${LANGS.map((l) => `"${l}": "2-3 sentence insight in that language"`).join(', ')} }
    }
  ]
}
Write native, natural text in each of these ${LANGS.length} languages (${langList}) —
do not machine-translate word-for-word, adapt naturally.`
}

export default async function handler(req, res) {
  // Vercel Cron GET ile çağırır. Manuel test için POST da kabul ediyoruz.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  // Vercel, CRON_SECRET tanımlıysa isteğe otomatik olarak
  // `Authorization: Bearer <CRON_SECRET>` ekler. Tanımlıysa doğruluyoruz;
  // tanımlı değilse (henüz kurulmadıysa) engellemiyoruz.
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'unauthorized' })
    }
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'missing_env_vars' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const today = new Date().toISOString().split('T')[0]

  try {
    // Bugün için zaten üretilmiş mi? (idempotent — cron yanlışlıkla iki kez
    // tetiklenirse veya manuel tekrar çalıştırılırsa duplike kayıt oluşmasın)
    const { data: existing } = await supabase
      .from('collective_predictions')
      .select('id')
      .eq('prediction_date', today)
      .limit(1)

    if (existing && existing.length > 0) {
      return res.status(200).json({ success: true, message: 'already_exists_for_today' })
    }

    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - DAYS_WINDOW)

    const { data: recentDreams, error: dreamsError } = await supabase
      .from('dreams')
      .select('content, ai_archetypes, ai_sentiment')
      .eq('in_feed', true)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(150)

    if (dreamsError) throw dreamsError

    if (!recentDreams || recentDreams.length < 5) {
      // Çok az veri varken zorla öngörü üretmek anlamsız/uydurma olur —
      // sessizce atla, ertesi gün tekrar dener.
      return res.status(200).json({ success: false, message: 'not_enough_dreams', count: recentDreams?.length || 0 })
    }

    const archetypeCounts = {}
    const emotionCounts = {}
    for (const dream of recentDreams) {
      if (Array.isArray(dream.ai_archetypes)) {
        for (const a of dream.ai_archetypes) archetypeCounts[a] = (archetypeCounts[a] || 0) + 1
      }
      if (dream.ai_sentiment) emotionCounts[dream.ai_sentiment] = (emotionCounts[dream.ai_sentiment] || 0) + 1
    }

    const dreamExcerpts = recentDreams
      .filter((d) => d.content)
      .slice(0, 60)
      .map((d) => String(d.content).slice(0, 300))

    const genAI = getGeminiClient()
    if (!genAI) return res.status(500).json({ error: 'no_gemini_key' })

    const prompt = buildPrompt(dreamExcerpts, archetypeCounts, emotionCounts)
    const interaction = await genAI.interactions.create({ model: 'gemini-3.5-flash', input: prompt })
    const parsed = JSON.parse(interaction.output_text.replace(/```json|```/g, '').trim())

    const predictions = Array.isArray(parsed.predictions) ? parsed.predictions.slice(0, MAX_PREDICTIONS) : []
    if (predictions.length === 0) {
      return res.status(502).json({ error: 'no_predictions_generated' })
    }

    const rows = predictions.map((p) => {
      const row = {
        prediction_date: today,
        dream_count: recentDreams.length,
        themes: Array.isArray(p.themes) ? p.themes : [],
      }
      for (const l of LANGS) {
        row[`title_${l}`] = p.title?.[l] || p.title?.en || null
        row[`content_${l}`] = p.content?.[l] || p.content?.en || null
      }
      return row
    })

    const { data: inserted, error: insertError } = await supabase
      .from('collective_predictions')
      .insert(rows)
      .select('id')

    if (insertError) throw insertError

    return res.status(200).json({ success: true, count: inserted?.length || 0 })
  } catch (error) {
    console.error('generate-prophecy cron error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
