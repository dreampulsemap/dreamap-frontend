import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { notifyFollowAccepted } from '@/lib/notify'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GÜVENLİK DÜZELTMESİ: yanıt veren kişinin kimliği artık body'den değil,
  // doğrulanmış Bearer token'dan geliyor — aksi halde biri BAŞKASINA gelen
  // bir takip isteğini onaylayıp/reddedebiliyordu.
  const authedUser = await getAuthedUser(req)
  if (!authedUser) return res.status(401).json({ error: 'unauthorized' })
  const userId = authedUser.id

  const { friendshipId, action } = req.body

  if (!friendshipId || !action) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  if (!['accepted', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Geçersiz işlem' })
  }

  const supabase = supabaseAdmin

  try {
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single()

    if (fetchError || !friendship) {
      return res.status(404).json({ error: 'Arkadaşlık isteği bulunamadı' })
    }

    if (friendship.friend_id !== userId) {
      return res.status(403).json({ error: 'Bu isteği kabul/red etme yetkiniz yok' })
    }

    const { data, error } = await supabase
      .from('friendships')
      .update({ status: action })
      .eq('id', friendshipId)
      .select()

    if (error) throw error

    // İsteği kabul ettiysek, isteği gönderen tarafa haber ver. Red ise sessiz kalıyoruz
    // (çoğu sosyal uygulamada reddedilme bildirimi gösterilmez).
    if (action === 'accepted') {
      await notifyFollowAccepted(supabase, { userId: friendship.user_id, actorId: userId })
    }

    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
