import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Mesaj ikonunun üzerindeki rozet için TEK amaçlı, hafif bir endpoint.
// conversations.js gibi tüm konuşma listesini/son mesajları çekmek yerine
// sadece sayıyı döner — Navbar/BottomNav bunu sık aralıklarla (poll)
// sorgulayabilsin diye maliyeti mümkün olduğunca düşük tutuyoruz.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { count, error } = await supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (error) throw error

    return res.status(200).json({ unreadCount: count || 0 })
  } catch (error) {
    console.error('messages/unread-count error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
