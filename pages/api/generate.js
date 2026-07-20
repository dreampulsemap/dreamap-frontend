import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const AURA_COST = 8 // generate-deep-analysis.js ile aynı fiyat noktası (ürün tutarlılığı)
const MAX_DREAMS_CONSIDERED = 15

const getGeminiClient = () => {
  const key = process.env.GEMINI_FREE_KEY || process.env.GEMINI_KEY
  if (!key) return null
  return new GoogleGenAI({ apiKey: key })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const LANG_NAME = { en: 'English', tr: 'Turkish' }

function buildPrompt({ dreamExcerpts, goalTitles, langName }) {
  return `You are a Jungian-informed shadow-work analyst — grounded, compassionate, never
mystical-vague. You will cross-reference a person's DREAMS (subconscious material)
against their CONSCIOUS GOALS to find a specific psychological block.

Their recent dreams (excerpts):
${dreamExcerpts.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Their conscious goals:
${goalTitles.map((g, i) => `${i + 1}. "${g}"`).join('\n')}

Task: Identify ONE specific recurring psychological pattern in the dreams that appears
to be in tension with one or more of the goals (e.g. dreams of drowning/falling/being
chased vs. a goal like "start my own business" might suggest a fear of failure or loss
of control). Be specific to THEIR actual content, not generic. Do not invent details
not present in the input.

Return ONLY valid JSON, no markdown fences:
{"detected_block": "a short 3-6 word label in ${langName}", "report_content": "a warm, specific, 150-250 word report in ${langName} explaining the pattern and one concrete reflection question for them to sit with"}`
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { data, error } = await supabaseAdmin
        .from('mental_wall_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return res.status(200).json({ reports: data || [] })
    } catch (error) {
      console.error('mental-wall/generate GET error:', error)
      return res.status(500).json({ error: error.message || 'internal_error' })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, lang = 'en' } = req.body || {}

    // Kullanıcının son rüyaları (bilinçaltı malzeme)
    const { data: dreams } = await supabaseAdmin
      .from('dreams')
      .select('id, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_DREAMS_CONSIDERED)

    if (!dreams || dreams.length < 3) {
      return res.status(400).json({ error: 'not_enough_dreams', minimum: 3 })
    }

    // Karşılaştırılacak hedefler: belirli bir goalId verildiyse ona odaklan,
    // yoksa tüm aktif hedefleri kullan.
    let goalsQuery = supabaseAdmin
      .from('goals')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (goalId) goalsQuery = goalsQuery.eq('id', goalId)

    const { data: goals } = await goalsQuery
    if (!goals || goals.length === 0) {
      return res.status(400).json({ error: 'no_active_goals' })
    }

    // ATOMİK aura düşüşü — SELECT-sonra-UPDATE yerine tek RPC çağrısı,
    // aynı TOCTOU yarış durumunu (bkz. migration 004/005) tekrar etmiyoruz.
    const { data: spendResult, error: spendError } = await supabaseAdmin.rpc('spend_auras', {
      p_user_id: user.id,
      p_amount: AURA_COST,
    })
    if (spendError) throw spendError
    const spend = spendResult?.[0]
    if (!spend?.success) {
      return res.status(402).json({ error: 'insufficient_auras', cost: AURA_COST })
    }

    const langName = LANG_NAME[lang] || LANG_NAME.en
    const dreamExcerpts = dreams.map((d) => String(d.content || '').slice(0, 400))
    const goalTitles = goals.map((g) => g.title)
    const prompt = buildPrompt({ dreamExcerpts, goalTitles, langName })

    let parsed
    try {
      const genAI = getGeminiClient()
      if (!genAI) throw new Error('No Gemini Keys')
      const interaction = await genAI.interactions.create({ model: 'gemini-3.5-flash', input: prompt })
      parsed = JSON.parse(interaction.output_text.replace(/```json|```/g, '').trim())
    } catch (e) {
      console.error('Mental Wall: Gemini failed, trying OpenAI...', e)
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
        })
        parsed = JSON.parse(completion.choices[0].message.content.replace(/```json|```/g, '').trim())
      } catch (fallbackError) {
        // AI üretimi tamamen başarısız oldu — kullanıcının aurasını GERİ VER.
        // Harcanmış ama karşılığında hiçbir şey alamamış olmasın.
        await supabaseAdmin
          .from('user_profiles')
          .update({ premium_analysis_auras: spend.remaining + AURA_COST })
          .eq('id', user.id)
        throw fallbackError
      }
    }

    const { data: report, error: insertError } = await supabaseAdmin
      .from('mental_wall_reports')
      .insert({
        user_id: user.id,
        goal_id: goalId || goals[0].id,
        dream_ids: dreams.map((d) => d.id),
        detected_block: parsed.detected_block,
        report_content: parsed.report_content,
        aura_cost: AURA_COST,
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    return res.status(200).json({ report, aurasLeft: spend.remaining })
  } catch (error) {
    console.error('mental-wall/generate error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
