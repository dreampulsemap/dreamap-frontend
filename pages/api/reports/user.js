// pages/api/reports/user.js
import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'misinformation', 'hate_speech', 'other']
const MAX_NOTE_LENGTH = 500

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { userId, reason, note } = req.body || {}
    if (!userId || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'invalid_params' })
    }
    if (userId === user.id) return res.status(400).json({ error: 'cannot_report_self' })
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : null

    const { data: target, error: targetError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return res.status(404).json({ error: 'user_not_found' })

    const { error } = await supabaseAdmin.from('content_reports').insert({
      content_type: 'user',
      content_id: userId,
      reporter_id: user.id,
      reason,
      note: cleanNote || null,
    })

    if (error) {
      if (error.code === '23505') return res.status(200).json({ success: true, already_reported: true })
      throw error
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('reports/user error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
