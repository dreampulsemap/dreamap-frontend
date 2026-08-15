import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// GUVENLIK DUZELTMESI: userId daha once body'den okunuyordu, dogrulanmiyordu -
// yani herkes baskasi adina begeni ekleyip kaldirabiliyordu.
// Artik kimlik Bearer token'dan dogrulaniyor.
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })
  const userId = user.id

  const { dreamId } = req.body

  if (!dreamId) {
    return res.status(400).json({ error: 'Missing parameters' })
  }

  try {
    if (req.method === 'POST') {
      // Add like - rely on database trigger to update count
      const { error } = await supabaseAdmin
        .from('likes')
        .insert([{ user_id: userId, dream_id: dreamId }])

      if (error) {
        if (error.code === '23505') {
          return res.status(400).json({ error: 'Already liked' })
        }
        throw error
      }

      // Get updated count - single query instead of two
      const { data: countResult, error: countError } = await supabaseAdmin
        .from('dreams')
        .select('likes_count')
        .eq('id', dreamId)
        .single()

      if (countError) throw countError

      return res.status(200).json({
        success: true,
        liked: true,
        count: countResult?.likes_count || 0
      })
    } else {
      // Remove like
      const { error } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('dream_id', dreamId)

      if (error) throw error

      const { data: countResult, error: countError } = await supabaseAdmin
        .from('dreams')
        .select('likes_count')
        .eq('id', dreamId)
        .single()

      if (countError) throw countError

      return res.status(200).json({
        success: true,
        liked: false,
        count: countResult?.likes_count || 0
      })
    }
  } catch (error) {
    console.error('Like error:', error)
    return res.status(500).json({ error: error.message })
  }
}
