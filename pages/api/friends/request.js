import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, friendId } = req.body

  if (!userId || !friendId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  if (userId === friendId) {
    return res.status(400).json({ error: 'Kendine arkadaşlık isteği gönderemezsin' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`(user_id.eq.${userId},friend_id.eq.${friendId}),(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .single()

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Zaten arkadaşsınız' })
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Zaten bekleyen istek var' })
      }
      if (existing.status === 'blocked') {
        return res.status(400).json({ error: 'Bu kullanıcı seni engelledi' })
      }
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert([{ user_id: userId, friend_id: friendId, status: 'pending' }])
      .select()

    if (error) throw error

    return res.status(200).json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
