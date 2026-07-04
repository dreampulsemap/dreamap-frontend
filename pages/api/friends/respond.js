import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { friendshipId, userId, action } = req.body

  if (!friendshipId || !userId || !action) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  if (!['accepted', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Geçersiz işlem' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

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

    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
