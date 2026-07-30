import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Kaç mesajı geriye tarayarak konuşma listesi çıkaracağımızın üst sınırı.
// Gerçek bir "conversations" tablosu/view'ı olmadığı için mesajları
// çekip bellekte kişi bazında grupluyoruz (friends/search.js'deki 2-adımlı
// fetch-then-map desenine benzer şekilde — schema üzerinde ekstra bir
// view/RPC oluşturmadan basit ve güvenli tutuyoruz).
const SCAN_LIMIT = 500

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { data: rows, error } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id, content, is_read, created_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(SCAN_LIMIT)

    if (error) throw error

    const byOther = new Map() // otherId -> { lastMessage, unreadCount }
    for (const row of rows || []) {
      const otherId = row.sender_id === user.id ? row.recipient_id : row.sender_id
      if (!byOther.has(otherId)) {
        byOther.set(otherId, { lastMessage: row, unreadCount: 0 })
      }
      if (row.recipient_id === user.id && !row.is_read) {
        byOther.get(otherId).unreadCount += 1
      }
    }

    const otherIds = Array.from(byOther.keys())
    let profileMap = new Map()
    if (otherIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds)
      for (const p of profiles || []) profileMap.set(p.id, p)
    }

    // rows zaten created_at DESC sıralı olduğu için Map'e ekleniş sırası
    // en son konuşulan kişiden en eskiye doğru korunuyor.
    const conversations = otherIds.map((otherId) => {
      const entry = byOther.get(otherId)
      return {
        otherUser: profileMap.get(otherId) || { id: otherId },
        lastMessage: entry.lastMessage,
        unreadCount: entry.unreadCount,
      }
    })

    return res.status(200).json({ conversations })
  } catch (error) {
    console.error('messages/conversations error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
