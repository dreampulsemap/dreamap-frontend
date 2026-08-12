import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GÜVENLİK DÜZELTMESİ: bu route daha önce query'deki HERHANGİ BİR userId
  // için sonuç dönüyordu — Authorization kontrolü yoktu, yani herkesin
  // arkadaş listesi VE bekleyen (henüz kabul edilmemiş) istekleri
  // görülebiliyordu. Artık yalnızca giriş yapmış kullanıcının kendi listesi
  // dönüyor; query'deki userId artık kullanılmıyor.
  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  const userId = user.id

  const { type } = req.query

  const supabase = supabaseAdmin

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
