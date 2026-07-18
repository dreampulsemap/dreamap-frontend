import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query, userId } = req.query

  if (!query || !userId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', userId)
      .limit(10)

    if (error) throw error

    const usersWithStatus = await Promise.all(users.map(async (user) => {
      // NOT: Supabase/PostgREST'te iç içe grup filtresi `and(...)` anahtar kelimesi
      // olmadan geçersizdir. Eski hâli `(a,b),(c,d)` şeklindeydi ve bu sorgu
      // sessizce başarısız oluyordu — sonuç olarak arkadaşlık durumu asla doğru
      // gelmiyordu (herkes "takip et" olarak görünüyordu).
      const { data: friendship } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId})`)
        .maybeSingle()

      return {
        ...user,
        friendshipStatus: friendship?.status || null
      }
    }))

    return res.status(200).json({ users: usersWithStatus })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
