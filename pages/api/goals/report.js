import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

// İçerik bildirimi — üç nokta menüsündeki "Bildir" sheet'i. Kendi hedefini
// bildiremezsin; aynı hedefi ikinci kez bildirmeye çalışırsan (unique
// (goal_id, reporter_id), bkz. 009_goal_saves_and_reports.sql) hata değil,
// nazikçe "zaten bildirildi" dönüyoruz — kullanıcı arayüzde yine de bir
// teşekkür/onay görsün istiyoruz.
const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'misinformation', 'hate_speech', 'other']
const MAX_NOTE_LENGTH = 500

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, reason, note } = req.body || {}
    if (!goalId || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'invalid_params' })
    }
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : null

    const { allowed, goal } = await canViewGoal(goalId, user.id)
    if (!goal) return res.status(404).json({ error: 'goal_not_found' })
    if (!allowed) return res.status(403).json({ error: 'not_visible' })
    if (goal.user_id === user.id) return res.status(400).json({ error: 'cannot_report_own_goal' })

    const { error } = await supabaseAdmin
      .from('goal_reports')
      .insert({ goal_id: goalId, reporter_id: user.id, reason, note: cleanNote || null })

    if (error) {
      if (error.code === '23505') {
        return res.status(200).json({ success: true, already_reported: true })
      }
      throw error
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('goals/report error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
