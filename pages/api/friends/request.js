import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { notifyFollow } from '@/lib/notify'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GÜVENLİK DÜZELTMESİ: "kimin adına" istek gönderileceği (userId) artık
  // body'den değil, doğrulanmış Bearer token'dan geliyor — aksi halde biri
  // başka bir kullanıcı adına sahte takip isteği oluşturabilirdi.
  const authedUser = await getAuthedUser(req)
  if (!authedUser) return res.status(401).json({ error: 'unauthorized' })
  const userId = authedUser.id

  const { friendId } = req.body

  if (!friendId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  if (userId === friendId) {
    return res.status(400).json({ error: 'Kendine rezonans kuramazsın' })
  }

  const supabase = supabaseAdmin

  try {
    // 1. Zaten takip edilip edilmediğini kontrol et (Takip sistemi tek yönlüdür: user_id takip eder friend_id)
    const { data: existing } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Zaten rezonans kurdunuz' })
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Bekleyen bir rezonans talebiniz var' })
      }
    }

    // 2. Hedef kullanıcının profil durumunu çek (Gizli mi Açık mı?)
    const { data: targetProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, is_private')
      .eq('id', friendId)
      .maybeSingle()

    if (profileError || !targetProfile) {
      return res.status(404).json({ error: 'Hedef profil bulunamadı' })
    }

    // Google Play UGC politikası: engellenen kullanıcılar birbirine
    // rezonans/takip isteği gönderemez.
    const { data: blockRows, error: blockError } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${friendId}),and(blocker_id.eq.${friendId},blocked_id.eq.${userId})`)
    if (blockError) throw blockError
    if (blockRows && blockRows.length > 0) {
      return res.status(403).json({ error: 'blocked' })
    }

    // Açık profil ise anında 'accepted', gizli profil ise onay için 'pending'
    const status = targetProfile.is_private === true ? 'pending' : 'accepted'

    const { data, error } = await supabase
      .from('friendships')
      .insert([{ user_id: userId, friend_id: friendId, status }])
      .select()

    if (error) throw error

    // Takip eden kişiye değil, takip EDİLEN kişiye bildirim gider.
    // await ediyoruz ki serverless fonksiyon yanıtı döner dönmez
    // yarım kalmış bir bildirim isteği kesilmesin; notifyFollow içindeki
    // try/catch'ler zaten bir bildirim hatasının takip işlemini
    // başarısız göstermesini engelliyor.
    await notifyFollow(supabase, { userId: friendId, actorId: userId, accepted: status === 'accepted' })

    return res.status(200).json({ success: true, status, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}