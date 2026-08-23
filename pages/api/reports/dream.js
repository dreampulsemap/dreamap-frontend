// pages/api/reports/dream.js
// pages/api/goals/report.js ile AYNI desen — content_reports tablosuna
// content_type='dream' olarak yazar. goal_reports'a dokunulmuyor.
//
// NOT: canViewGoal'ın dream karşılığı (görünürlük/gizlilik kontrolü) bu
// export'ta yoktu, bu yüzden burada sadece "rüya var mı" ve "kendi rüyan
// değil mi" kontrolü yapılıyor. dreams tablosunda bir is_private/
// visibility alanı varsa, canViewGoal'daki mantığın aynısını buraya da
// eklemen önerilir.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'misinformation', 'hate_speech', 'other']
const MAX_NOTE_LENGTH = 500

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { dreamId, reason, note } = req.body || {}
    // dreams.id bigint'tir (uuid DEĞİL) — content_reports.content_id text
    // olarak tutuluyor, bu yüzden burada number'a çevirip doğruluyoruz.
    const dreamIdNum = Number(dreamId)
    if (!dreamId || !Number.isInteger(dreamIdNum) || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'invalid_params' })
    }
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : null

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id')
      .eq('id', dreamIdNum)
      .maybeSingle()

    if (dreamError) throw dreamError
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })
    if (dream.user_id === user.id) return res.status(400).json({ error: 'cannot_report_own_dream' })

    const { error } = await supabaseAdmin.from('content_reports').insert({
      content_type: 'dream',
      content_id: String(dreamIdNum),
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
    console.error('reports/dream error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
