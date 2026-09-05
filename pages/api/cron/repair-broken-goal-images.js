import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { repairGoalImage } from '@/lib/repairGoalImage'

// dreams/repair-broken-images.js ile aynı desen — bkz. o dosyadaki yorum.
// Burayı besleyen kaynak: flag_goal_image_for_persist DB trigger'ı (migration
// goals_image_repair_columns_and_trigger), cover_image_url veya
// gallery_image_urls kalıcı depoda değilse 'needs_persist' işaretliyor.
export const config = { maxDuration: 60 }

const DEFAULT_BATCH_SIZE = 12
const MAX_BATCH_SIZE = 40

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'unauthorized' })
    }
  }

  const requestedLimit = parseInt(req.query.limit, 10)
  const batchSize = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_BATCH_SIZE)
    : DEFAULT_BATCH_SIZE

  try {
    const { data: goals, error } = await supabaseAdmin
      .from('goals')
      .select('id, cover_image_url, gallery_image_urls, image_status, image_repair_attempts')
      .in('image_status', ['needs_persist', 'broken'])
      .lt('image_repair_attempts', 5)
      .order('image_checked_at', { ascending: true, nullsFirst: true })
      .limit(batchSize)

    if (error) throw error

    if (!goals || goals.length === 0) {
      return res.status(200).json({ ok: true, processed: 0, results: [] })
    }

    const results = []
    for (const goal of goals) {
      try {
        const result = await repairGoalImage(goal)
        results.push(result)
      } catch (err) {
        results.push({ goalId: goal.id, result: 'error', error: err.message })
      }
    }

    const { count: remaining } = await supabaseAdmin
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .in('image_status', ['needs_persist', 'broken'])
      .lt('image_repair_attempts', 5)

    return res.status(200).json({ ok: true, processed: results.length, remaining: remaining ?? null, results })
  } catch (error) {
    console.error('cron/repair-broken-goal-images error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
