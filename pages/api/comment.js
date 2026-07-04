import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    if (req.method === 'GET') {
      // Yorumları listele
      const { dreamId } = req.query
      
      if (!dreamId) {
        return res.status(400).json({ error: 'dreamId gerekli' })
      }

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user_profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('dream_id', dreamId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return res.status(200).json({ comments: data || [] })
    }

    if (req.method === 'POST') {
      // Yorum ekle
      const { dreamId, userId, content } = req.body

      if (!dreamId || !userId || !content) {
        return res.status(400).json({ error: 'Eksik parametreler' })
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([{ user_id: userId, dream_id: dreamId, content }])
        .select(`
          *,
          user_profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, comment: data })
    }

    if (req.method === 'DELETE') {
      // Yorum sil
      const { commentId, userId } = req.body

      if (!commentId || !userId) {
        return res.status(400).json({ error: 'Eksik parametreler' })
      }

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)

      if (error) throw error

      return res.status(200).json({ success: true })
    }
  } catch (error) {
    console.error('Comment error:', error)
    return res.status(500).json({ error: error.message })
  }
                                 }
