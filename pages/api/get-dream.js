import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'id zorunlu' })
  }

  // goals(title) — dreams.goal_id FK'sine dayanan bir PostgREST embed'i
  // (Faz 10). Sonucu düz alanlara (goal_title) indiriyoruz ki istemci
  // tarafında iç içe bir nesneyle uğraşmaya gerek kalmasın.
  const { data, error } = await supabaseAdmin
    .from('dreams')
    .select('*, goals(title)')
    .eq('id', id)
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const { goals, ...dream } = data
  dream.goal_title = goals?.title || null

  return res.status(200).json({ dream })
}
