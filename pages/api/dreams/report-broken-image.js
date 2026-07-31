import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { repairDreamImage } from '@/lib/repairDreamImage'

// Grid'de ya da DreamCard'da bir <Image> onError verdiğinde istemci bu
// endpoint'i fire-and-forget çağırır (yanıtı beklemeden). Burada isteği
// AWAIT ile sonuna kadar işliyoruz — Vercel serverless fonksiyonları yanıt
// döndükten sonra arka planda çalışmaya devam etmeyi GARANTİ ETMEZ (bkz.
// önceki oturumda bulunan "missing await" bildirim hatasıyla aynı tuzak),
// bu yüzden onarımı burada, fonksiyon canlıyken bitiriyoruz. İstemci
// tarafında bu zaten beklenmeden çağrıldığı için kullanıcı arayüzünü bloklamaz.
export const config = { maxDuration: 30 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const { dreamId } = req.body || {}
  if (!dreamId) return res.status(400).json({ error: 'dream_id_required' })

  try {
    const { data: dream, error } = await supabaseAdmin
      .from('dreams')
      .select('id, content, ai_image_url, ai_image_prompt, ai_archetypes, image_status, image_repair_attempts')
      .eq('id', dreamId)
      .single()

    if (error || !dream) return res.status(404).json({ error: 'dream_not_found' })

    // Zaten kalıcı depoda + sağlıklıysa (ör. client tarafında geçici bir CDN
    // hıçkırığı yaşandıysa) boşuna yeniden üretmeye kalkma — repairDreamImage
    // zaten önce ucuz bir HEAD kontrolü yapıyor, doğrudan ona bırakıyoruz.
    const result = await repairDreamImage(dream)
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error('report-broken-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
