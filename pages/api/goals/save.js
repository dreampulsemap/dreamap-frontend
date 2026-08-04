import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

// Vizyon (goal) seviyesinde "Kaydet" — VisionVideoPlayer/SlidesViewer'daki
// Bookmark butonu. goal_slides/slides/save.js ile birebir aynı desen, ama
// slayt değil doğrudan goal'e bağlı (video oynatıcıda slayt kavramı yok).
// saves_count trigger ile otomatik güncelleniyor (bkz.
// 009_goal_saves_and_reports.sql).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'invalid_params' })

    const { allowed, goal } = await canViewGoal(goalId, user.id)
    if (!goal) return res.status(404).json({ error: 'goal_not_found' })
    if (!allowed) return res.status(403).json({ error: 'not_visible' })

    const { data: existing } = await supabaseAdmin
      .from('goal_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('goal_id', goalId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin.from('goal_saves').delete().eq('id', existing.id)
      if (error) throw error
      return res.status(200).json({ saved: false })
    }

    const { error } = await supabaseAdmin.from('goal_saves').insert({ user_id: user.id, goal_id: goalId })
    if (error) {
      // 23505 = unique_violation (user_id, goal_id) — çift tıklama/yarış
      // durumunda başka bir istek araya girip zaten eklemiş demektir,
      // sonuç itibarıyla istenen durumdayız (kaydedilmiş), hataya gerek yok.
      if (error.code === '23505') return res.status(200).json({ saved: true })
      throw error
    }
    return res.status(200).json({ saved: true })
  } catch (error) {
    console.error('goals/save error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
