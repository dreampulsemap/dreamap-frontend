import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, userId } = req.body

  if (!dreamId || !userId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    if (req.method === 'POST') {
      // Beğeni ekle
      const { data, error } = await supabase
        .from('likes')
        .insert([{ user_id: userId, dream_id: dreamId }])
        .select()

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Zaten beğenilmiş' })
        }
        throw error
      }

      return res.status(200).json({ success: true, liked: true })
    } else {
      // Beğeniyi kaldır
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('dream_id', dreamId)

      if (error) throw error

      return res.status(200).json({ success: true, liked: false })
    }
  } catch (error) {
    console.error('Like error:', error)
    return res.status(500).json({ error: error.message })
  }
}
