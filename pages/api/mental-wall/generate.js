import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { generateWithAI } from '@/lib/aiClient'

const MAX_DREAMS_CONSIDERED = 20 // Add explicit limit
const MAX_GOALS = 10
const AURA_COST = 5

function buildPrompt({ dreamExcerpts, goalTitles, langName }) {
  return `You are a Jungian shadow-work analyst.

Recent dreams (excerpts):
${dreamExcerpts.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

Conscious goals:
${goalTitles.map((g, i) => `${i + 1}. "${g}"`).join('\n')}

Identify ONE specific psychological pattern. Return ONLY valid JSON:
{"detected_block": "3-6 word label in ${langName}", "report_content": "150-250 word report in ${langName}"}`
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { data, error } = await supabaseAdmin
        .from('mental_wall_reports')
        .select('id, detected_block, report_content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return res.status(200).json({ reports: data || [] })
    } catch (error) {
      console.error('mental-wall/generate GET error:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, lang = 'en' } = req.body || {}

    // OPTIMIZED: Select only needed columns with explicit limit
    const { data: dreams, error: dreamsError } = await supabaseAdmin
      .from('dreams')
      .select('id, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_DREAMS_CONSIDERED)

    if (dreamsError) throw dreamsError
    if (!dreams || dreams.length < 3) {
      return res.status(400).json({ error: 'not_enough_dreams', minimum: 3 })
    }

    // Get comparison goals with explicit limit
    let goalsQuery = supabaseAdmin
      .from('goals')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(MAX_GOALS)

    if (goalId) {
      goalsQuery = goalsQuery.eq('id', goalId)
    }

    const { data: goals, error: goalsError } = await goalsQuery

    if (goalsError) throw goalsError
    if (!goals || goals.length === 0) {
      return res.status(400).json({ error: 'no_active_goals' })
    }

    const dreamExcerpts = dreams.map(d => d.content.substring(0, 200)).filter(Boolean)
    const goalTitles = goals.map(g => g.title).filter(Boolean)

    const prompt = buildPrompt({
      dreamExcerpts,
      goalTitles,
      langName: lang === 'tr' ? 'Turkish' : 'English'
    })

    const aiResult = await generateWithAI(prompt)
    const parsed = typeof aiResult === 'string' ? JSON.parse(aiResult) : aiResult

    const { data: report, error: insertError } = await supabaseAdmin
      .from('mental_wall_reports')
      .insert({
        user_id: user.id,
        detected_block: parsed.detected_block,
        report_content: parsed.report_content,
        dream_ids: dreams.map(d => d.id),
        goal_ids: goals.map(g => g.id)
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    return res.status(200).json({ report })
  } catch (error) {
    console.error('mental-wall/generate POST error:', error)
    return res.status(500).json({ error: error.message })
  }
}
