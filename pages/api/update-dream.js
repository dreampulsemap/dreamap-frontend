import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { dreamId, userId, content, location_name, visibility, map_detail, in_feed } = req.body

  if (!dreamId || !userId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Service role key eksik' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const { data: dream, error: fetchError } = await supabase
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single()

    if (fetchError || !dream) {
      return res.status(404).json({ error: 'Rüya bulunamadı' })
    }

    if (dream.user_id !== userId) {
      return res.status(403).json({ error: 'Bu rüyayı düzenleme yetkiniz yok' })
    }

    const updates = {}
    if (content !== undefined) updates.content = content
    if (location_name !== undefined) updates.location_name = location_name
    if (visibility !== undefined) updates.visibility = visibility
    if (map_detail !== undefined) updates.map_detail = map_detail
    if (in_feed !== undefined) updates.in_feed = in_feed

    const { error } = await supabase
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
