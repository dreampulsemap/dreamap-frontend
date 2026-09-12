import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GUVENLIK DUZELTMESI: bu route daha once query'deki HERHANGI BIR userId
  // icin sonuc donuyordu — Authorization kontrolu yoktu, yani herkesin
  // arkadas listesi VE bekleyen (henuz kabul edilmemis) istekleri
  // gorulebiliyordu. Artik yalnizca giris yapmis kullanicinin kendi listesi
  // donuyor; query'deki userId artik kullanilmiyor.
  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  const userId = user.id

  const { type } = req.query

  const supabase = supabaseAdmin

  try {
    // BUG DUZELTMESI: friendships.user_id / friend_id, auth.users(id)'ye FK
    // ile bagli — user_profiles'a DEGIL. Bu yuzden onceki
    // "user_profiles!friendships_user_id_fkey" embed hint'i PostgREST'te
    // hicbir zaman cozulemiyordu (iliski bulunamiyor hatasi veriyordu) ve
    // bu route her zaman 500 donup on yuzde sessizce bos listeye
    // dusuruluyordu — kabul edilmis arkadasliklar veritabaninda olsa bile
    // ekranda hic gorunmuyordu. Cozum: embed kullanmadan iki adimda
    // sorgulamak — once friendships satirlarini, sonra ilgili
    // user_profiles kayitlarini ayri cekip JS'te birlestirmek.
    let query = supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (type === 'accepted') {
      query = query.eq('status', 'accepted')
    } else if (type === 'pending') {
      query = query.eq('status', 'pending').eq('friend_id', userId)
    }

    const { data: friendships, error } = await query

    if (error) throw error

    const rows = friendships || []

    const otherUserIds = Array.from(
      new Set(
        rows.map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
      )
    )

    let profilesById = {}

    if (otherUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherUserIds)

      if (profilesError) throw profilesError

      profilesById = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
      )
    }

    const enriched = rows.map((f) => ({
      ...f,
      requester: profilesById[f.user_id] || null,
      target: profilesById[f.friend_id] || null,
    }))

    return res.status(200).json({ friendships: enriched })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
