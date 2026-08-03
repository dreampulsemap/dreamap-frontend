import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

// Kalıcı silme — geri alınamaz. dreams -> comments/likes/bounty_claims/
// notifications FK'leri Supabase'de ON DELETE CASCADE olarak doğrulandı,
// bu yüzden burada ayrıca temizlik gerekmiyor. "Feed'den kaldır" (soft) bir
// silme değil — o, düzenleme panelindeki "Feed'de göster" anahtarı ile
// zaten yapılıyor; bu uç nokta sadece geri alınamaz tam silme içindir.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  const { dreamId } = req.body || {}
  if (!dreamId) return res.status(400).json({ error: 'invalid_params' })

  try {
    const { error } = await supabaseAdmin.from('dreams').delete().eq('id', dreamId)
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('admin/dreams/delete error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
