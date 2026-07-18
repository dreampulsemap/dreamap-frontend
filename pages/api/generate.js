import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const getGeminiClient = () => {
  const key = process.env.GEMINI_FREE_KEY || process.env.GEMINI_KEY
  if (!key) return null
  return new GoogleGenAI({ apiKey: key })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAME = { en: 'English', tr: 'Turkish' }

function todayDateString() {
  return new Date().toISOString().split('T')[0]
}

function buildPrompt({ goalTitle, goalDescription, roadmapTitles, langName }) {
  return `You are a warm, grounded manifestation coach — not overly mystical, practical and specific.
The user's goal (their "North Star") is: "${goalTitle}".
${goalDescription ? `Extra context: "${goalDescription}".` : ''}
${roadmapTitles.length ? `Their roadmap steps so far: ${roadmapTitles.join(', ')}.` : ''}

Write ONE small, concrete, doable-today action ("Daily Seed") that moves them 1% closer to this goal.
It must be specific (not "believe in yourself"), achievable in under 30 minutes, and written in ${langName}.
Return ONLY valid JSON, no markdown fences: {"seed": "..."}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, lang = 'en' } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'goalId_required' })

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id, title, description, status, micro_goals(title)')
      .eq('id', goalId)
      .single()

    if (goalError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })
    if (goal.status !== 'active') return res.status(400).json({ error: 'goal_not_active' })

    const today = todayDateString()

    // Bugün için zaten üretilmiş mi? (unique(goal_id, seed_date) veritabanında da garanti,
    // ama burada erken dönerek gereksiz AI çağrısından kaçınıyoruz)
    const { data: existingSeed } = await supabaseAdmin
      .from('daily_seeds')
      .select('*')
      .eq('goal_id', goalId)
      .eq('seed_date', today)
      .maybeSingle()

    if (existingSeed) {
      return res.status(200).json({ seed: existingSeed, alreadyExisted: true })
    }

    const langName = LANG_NAME[lang] || LANG_NAME.en
    const roadmapTitles = (goal.micro_goals || []).map((m) => m.title).slice(0, 10)
    const prompt = buildPrompt({
      goalTitle: goal.title,
      goalDescription: goal.description,
      roadmapTitles,
      langName,
    })

    let seedText

    try {
      const genAI = getGeminiClient()
      if (!genAI) throw new Error('No Gemini Keys')
      const interaction = await genAI.interactions.create({
        model: 'gemini-3.5-flash',
        input: prompt,
      })
      const parsed = JSON.parse(interaction.output_text.replace(/```json|```/g, '').trim())
      seedText = parsed.seed
    } catch (e) {
      console.error('Daily Seed: Gemini failed, trying OpenAI...', e)
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      })
      const parsed = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, '').trim())
      seedText = parsed.seed
    }

    if (!seedText || typeof seedText !== 'string') {
      throw new Error('empty_seed_generated')
    }

    const { data: seed, error: insertError } = await supabaseAdmin
      .from('daily_seeds')
      .insert({ goal_id: goalId, user_id: user.id, seed_date: today, content: seedText.trim() })
      .select('*')
      .single()

    if (insertError) {
      // unique(goal_id, seed_date) çakışması: yarış durumunda başka bir istek
      // aynı anda üretmiş olabilir — o kaydı döndür.
      if (insertError.code === '23505') {
        const { data: raceSeed } = await supabaseAdmin
          .from('daily_seeds')
          .select('*')
          .eq('goal_id', goalId)
          .eq('seed_date', today)
          .maybeSingle()
        if (raceSeed) return res.status(200).json({ seed: raceSeed, alreadyExisted: true })
      }
      throw insertError
    }

    return res.status(200).json({ seed, alreadyExisted: false })
  } catch (error) {
    console.error('daily-seeds/generate error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
