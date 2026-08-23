// pages/api/blocks/block.js
//
// Google Play "User Generated Content" politikası (1:1 mesajlaşma olan
// uygulamalar için ZORUNLU): kullanıcı engelleme. Bir kullanıcıyı
// engellemek: (1) user_blocks'a satır ekler, (2) aradaki takip/rezonans
// bağını (friendships, her iki yön) kaldırır — engellenen kişi artık
// seni takip ediyor görünmemeli. Mesaj gönderme engeli (her iki yönde)
// messages/send.js içinde ayrıca kontrol ediliyor.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { blockedUserId } = req.body || {}
  if (!blockedUserId) return res.status(400).json({ error: 'invalid_params' })
  if (blockedUserId === user.id) return res.status(400).json({ error: 'cannot_block_self' })

  try {
    const { error } = await supabaseAdmin
      .from('user_blocks')
      .insert({ blocker_id: user.id, blocked_id: blockedUserId })

    // 23505 = zaten engellenmiş (unique constraint) — hata değil, no-op.
    if (error && error.code !== '23505') throw error

    // Aradaki takip bağını her iki yönde de temizle.
    await supabaseAdmin
      .from('friendships')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},friend_id.eq.${user.id})`)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('blocks/block error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
