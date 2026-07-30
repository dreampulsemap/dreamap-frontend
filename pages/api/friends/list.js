import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, type } = req.query

  if (!userId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // requester = takibi başlatan taraf (user_id), target = takip edilen taraf (friend_id).
    // Her ikisi de user_profiles'a farklı bir FK üzerinden bağlanıyor; aynı alias'sız
    // isimle (user_profiles) iki kez embed etmek PostgREST'te ya hataya ya da ikinci
    // embed'in birinciyi sessizce ezmesine yol açıyordu.
    let query = supabase
      .from('friendships')
      .select('*, requester:user_profiles!friendships_user_id_fkey(id, username, display_name, avatar_url), target:user_profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url)')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (type === 'accepted') {
      query = query.eq('status', 'accepted')
    } else if (type === 'pending') {
      query = query.eq('status', 'pending').eq('friend_id', userId)
    }

    const { data, error } = await query

    if (error) throw error

    return res.status(200).json({ friendships: data || [] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
