import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// goals/slides/delete.js ile aynı desen: sahiplik doğrulanır, satır
// silinir. Storage'daki dosya temizlenmiyor — kodun geri kalanında da
// (slides, dream kapakları) tutarlı olarak aynı basit tercih yapılmış.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { entryId } = req.body || {}
    if (!entryId) return res.status(400).json({ error: 'invalid_params' })

    const { data: entry } = await supabaseAdmin.from('diary_entries').select('id, user_id').eq('id', entryId).maybeSingle()
    if (!entry) return res.status(404).json({ error: 'not_found' })
    if (entry.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const { error } = await supabaseAdmin.from('diary_entries').delete().eq('id', entryId)
    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('diary/delete error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
