import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

// Bir bildirimi "incelendi" ya da "reddedildi" olarak işaretler — bildirimi
// silmiyor, yalnızca goal_reports.status'ü günceller (009_goal_saves_and_
// reports.sql'deki check constraint: pending/reviewed/dismissed). Vizyonun
// kendisine dokunmaz; onu silmek istiyorsan ayrı bir işlem
// (admin/reports/delete-goal.js).
const VALID_STATUSES = ['reviewed', 'dismissed', 'pending']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  const { reportId, status } = req.body || {}
  if (!reportId || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'invalid_params' })
  }

  try {
    const { data: updated, error } = await supabaseAdmin
      .from('goal_reports')
      .update({ status })
      .eq('id', reportId)
      .select('id, status')
      .single()

    if (error) throw error
    if (!updated) return res.status(404).json({ error: 'report_not_found' })

    return res.status(200).json({ ok: true, report: updated })
  } catch (error) {
    console.error('admin/reports/update-status error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
