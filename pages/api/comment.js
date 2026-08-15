import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// GUVENLIK DUZELTMESI: POST ve DELETE'de userId daha once body'den
// okunuyordu, dogrulanmiyordu - yani herkes baskasi adina yorum atabiliyor
// veya baskasinin yorumunu (kendi user_id'sini vererek) silebiliyordu.
// Artik kimlik Bearer token'dan dogrulaniyor.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (req.method === 'GET') {
      const { dreamId } = req.query

      if (!dreamId) {
        return res.status(400).json({ error: 'dreamId required' })
      }

      // Optimized: select only needed columns
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user_profiles(
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
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { dreamId, content } = req.body
      if (!dreamId || !content) {
        return res.status(400).json({ error: 'Missing parameters' })
      }

      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert([{ user_id: user.id, dream_id: dreamId, content }])
        .select(`
          id,
          content,
          created_at,
          user_id,
          user_profiles(
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
      const user = await getAuthedUser(req)
      if (!user) return res.status(401).json({ error: 'unauthorized' })

      const { commentId } = req.body
      if (!commentId) {
        return res.status(400).json({ error: 'Missing parameters' })
      }

      const { error } = await supabaseAdmin
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error

      return res.status(200).json({ success: true })
    }
  } catch (error) {
    console.error('Comment error:', error)
    return res.status(500).json({ error: error.message })
  }
}
