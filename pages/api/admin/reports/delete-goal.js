import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

// Bildirilen vizyonu kalıcı olarak siler — geri alınamaz. goals/delete.js
// (kullanıcının kendi silmesi) ile aynı silme mekaniği: micro_goals /
// goal_reactions / goal_comments / goal_slides / goal_saves / goal_reports
// FK'leri on delete cascade, tek silme yeterli. Rapor(lar) da bu cascade ile
// otomatik silinir — admin ayrıca update-status çağırmasına gerek yok,
// vizyon zaten ortadan kalkınca bildirim listesinde de görünmez olur
// (goal join'i null döner, UI "vizyon silinmiş" filtreler).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  const { goalId } = req.body || {}
  if (!goalId) return res.status(400).json({ error: 'invalid_params' })

  try {
    const { error } = await supabaseAdmin.from('goals').delete().eq('id', goalId)
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('admin/reports/delete-goal error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
