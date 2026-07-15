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
    return res.status(400).json({ error: 'Kendine rezonans kuramazsın' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

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

    // Açık profil ise anında 'accepted', gizli profil ise onay için 'pending'
    const status = targetProfile.is_private === true ? 'pending' : 'accepted'

    const { data, error } = await supabase
      .from('friendships')
      .insert([{ user_id: userId, friend_id: friendId, status }])
      .select()

    if (error) throw error

    return res.status(200).json({ success: true, status, data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}