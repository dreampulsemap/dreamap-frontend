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
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Service role key eksik' })
  }

  // Service role key ile RLS bypass et
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Kullanıcının kendi rüyası mı kontrol et
    const { data: dream, error: fetchError } = await supabase
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single()

    if (fetchError || !dream) {
      return res.status(404).json({ error: 'Rüya bulunamadı' })
    }

    if (dream.user_id !== userId) {
      return res.status(403).json({ error: 'Bu rüyayı silme yetkiniz yok' })
    }

    if (softDelete) {
      // Soft delete: Feed'den kaldır
      const { error } = await supabase
        .from('dreams')
        .update({ in_feed: false })
        .eq('id', dreamId)

      if (error) {
        return res.status(500).json({ error: error.message })
      }
    } else {
      // Hard delete: Tamamen sil
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)

      if (error) {
        return res.status(500).json({ error: error.message })
      }
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
