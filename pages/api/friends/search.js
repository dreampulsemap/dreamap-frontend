import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GÜVENLİK DÜZELTMESİ: friendshipStatus artık query'deki HERHANGİ BİR
  // userId'ye göre değil, doğrulanmış Bearer token'a göre hesaplanıyor —
  // aksi halde biri başka bir kullanıcının kiminle takip ilişkisi olduğunu
  // (üçüncü taraflar için) sorgulayabiliyordu.
  const authedUser = await getAuthedUser(req)
  if (!authedUser) return res.status(401).json({ error: 'unauthorized' })
  const userId = authedUser.id

  const { query } = req.query

  if (!query) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const supabase = supabaseAdmin

  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', userId)
      .limit(10)

    if (error) throw error

    // ÖNCEDEN: her sonuç için ayrı bir friendships sorgusu atılıyordu
    // (10 sonuç = 11 DB round-trip). Ölçekte (yüksek trafik, yavaş ağ)
    // bu gecikmeyi katlıyor. Şimdi TEK sorguda, kullanıcının bu sonuç
    // listesindeki herkesle olan tüm arkadaşlık kayıtlarını çekip
    // bellekte eşliyoruz.
    //
    // DÜZELTME: Sorgu önceden HER İKİ yönü de (ben->o VE o->ben) tek bir
    // duruma eşliyordu. Bu yüzden biri seni takip ettiğinde (ama sen onu
    // henüz takip etmediğinde), arama sonucunda "Takipte/Bekliyor" gibi
    // yanlış bir durum görünüyor ve buton tıklanamaz hale geliyordu —
    // kullanıcı o kişiyi hiçbir zaman gerçekten takip edemiyordu.
    // friendshipStatus, sadece "Takip Et" butonunun durumunu yansıtmalı,
    // yani yalnızca BENİM bu kişiye doğru olan takibim önemli.
    const resultIds = users.map((u) => u.id)
    let friendshipMap = new Map()

    if (resultIds.length > 0) {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, status')
        .eq('user_id', userId)
        .in('friend_id', resultIds)

      for (const f of friendships || []) {
        friendshipMap.set(f.friend_id, f.status)
      }
    }

    const usersWithStatus = users.map((user) => ({
      ...user,
      friendshipStatus: friendshipMap.get(user.id) || null,
    }))

    return res.status(200).json({ users: usersWithStatus })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
