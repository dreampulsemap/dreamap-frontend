import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // GÜVENLİK DÜZELTMESİ: update-dream.js ile aynı sorun — kimlik artık
  // body'deki userId yerine Bearer token'dan doğrulanıyor.
  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { dreamId, softDelete } = req.body

  if (!dreamId) {
    return res.status(400).json({ error: 'Eksik parametreler' })
  }

  try {
    // Kullanıcının kendi rüyası mı kontrol et
    const { data: dream, error: fetchError } = await supabaseAdmin
      .from('dreams')
      .select('user_id')
      .eq('id', dreamId)
      .single()

    if (fetchError || !dream) {
      return res.status(404).json({ error: 'Rüya bulunamadı' })
    }

    if (dream.user_id !== user.id) {
      return res.status(403).json({ error: 'Bu rüyayı silme yetkiniz yok' })
    }

    if (softDelete) {
      // Soft delete: Feed'den kaldır
      const { error } = await supabaseAdmin
        .from('dreams')
        .update({ in_feed: false })
        .eq('id', dreamId)

      if (error) {
        return res.status(500).json({ error: error.message })
      }
    } else {
      // Hard delete: Tamamen sil
      const { error } = await supabaseAdmin
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
