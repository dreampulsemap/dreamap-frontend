import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*, actor:actor_id(id, username, display_name, avatar_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error

      const { count: unreadCount } = await supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      return res.status(200).json({ notifications: data || [], unreadCount: unreadCount || 0 })
    }

    if (req.method === 'POST') {
      // Body'de notificationId verilirse tek bildirimi, verilmezse HEPSİNİ okundu yapar.
      const { notificationId } = req.body || {}

      let query = supabaseAdmin.from('notifications').update({ is_read: true }).eq('user_id', user.id)
      if (notificationId) query = query.eq('id', notificationId)
      else query = query.eq('is_read', false)

      const { error } = await query
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (error) {
    console.error('notifications error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
