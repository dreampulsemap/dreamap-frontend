import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, userId, softDelete } = req.body

  if (!dreamId || !userId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    if (softDelete) {
      // Soft delete: Feed'den kaldır
      const { data, error } = await supabase
        .from('dreams')
        .update({ in_feed: false })
        .eq('id', dreamId)
        .eq('user_id', userId)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ success: true, data })
    } else {
      // Hard delete: Tamamen sil
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)
        .eq('user_id', userId)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ success: true })
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
