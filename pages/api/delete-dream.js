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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase yapılandırması eksik' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  try {
    // Kullanıcının kendi rüyası mı kontrol et
    const { data: dream, error: fetchError } = await supabase
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return res.status(404).json({ error: 'Rüya bulunamadı: ' + fetchError.message })
    }

    if (!dream || dream.user_id !== userId) {
      return res.status(403).json({ error: 'Bu rüyayı silme yetkiniz yok' })
    }

    if (softDelete) {
      // Soft delete: Sadece feed'den kaldır, içerik silinsin ama arketipler kalsın
      const { data, error: updateError } = await supabase
        .from('dreams')
        .update({
          content: null,
          in_feed: false,
          map_detail: 'summary'
        })
        .eq('id', dreamId)
        .select()

      if (updateError) {
        console.error('Soft delete error:', updateError)
        return res.status(500).json({ error: 'Soft delete hatası: ' + updateError.message })
      }

      return res.status(200).json({ success: true, data })
    } else {
      // Hard delete: Tamamen sil
      const { error: deleteError } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)

      if (deleteError) {
        console.error('Hard delete error:', deleteError)
        return res.status(500).json({ error: 'Hard delete hatası: ' + deleteError.message })
      }

      return res.status(200).json({ success: true })
    }
  } catch (error) {
    console.error('Delete dream error:', error)
    return res.status(500).json({ error: 'Sunucu hatası: ' + error.message })
  }
}
