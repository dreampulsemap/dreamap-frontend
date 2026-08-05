import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Bir kullanıcının story halkası açıldığında çağrılır — diary_views'e
// upsert. Girdi başına değil KİŞİ başına tek satır tuttuğumuz için
// (bkz. lib/supabaseAdmin.js), bu tek upsert o kişinin o ana kadarki tüm
// girdilerini "görüldü" işaretlemiş olur.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { ownerId } = req.body || {}
    if (!ownerId) return res.status(400).json({ error: 'invalid_params' })

    const { error } = await supabaseAdmin
      .from('diary_views')
      .upsert({ viewer_id: user.id, owner_id: ownerId, last_viewed_at: new Date().toISOString() }, { onConflict: 'viewer_id,owner_id' })

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('diary/mark-seen error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
