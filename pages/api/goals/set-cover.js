import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { persistRemoteImage } from '@/lib/persistRemoteImage'
import { isPersistedImageUrl } from '@/lib/imageUrlUtils'

// Vizyon oluşturma akışında artık kapak, kullanıcının videoya eklediği
// GÖRSELLER arasından SONRADAN seçiliyor (bkz. CreateGoalModal.jsx +
// CoverPickerModal.jsx) — create.js sırasında henüz kapak belli olmadığı
// için goal cover_image_url=null ile oluşuyor, bu endpoint onu tamamlıyor.
// save-vision-video.js ile birebir aynı sahiplik kontrolü deseni.

const VALID_COVER_SOURCES = ['user_upload', 'ai_generated', 'pinterest', 'pixabay']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, coverImageUrl, coverImageSource } = req.body || {}
    if (!goalId || typeof coverImageUrl !== 'string' || !coverImageUrl.trim()) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    // GÜVENLİK AĞI: bu endpoint önceden gelen URL'in zaten kalıcı olduğunu
    // varsayıyordu (yorum: "Pixabay'den gelenler zaten kalıcı (https:),
    // dokunmuyoruz") — bu varsayım yanlıştı, CoverPickerModal'a farklı bir
    // yoldan (ör. ileride eklenecek bir akış, ya da doğrudan API çağrısı)
    // henüz cache'lenmemiş bir Pixabay linki gelirse burada yakalanmıyordu.
    // Artık kalıcı değilse burada indirip image-library'e kaydediyoruz.
    let finalCoverUrl = coverImageUrl.trim()
    if (!isPersistedImageUrl(finalCoverUrl) && !finalCoverUrl.startsWith('blob:')) {
      finalCoverUrl = await persistRemoteImage(finalCoverUrl, {
        bucket: 'image-library',
        path: `pixabay/legacy-goal-${goalId}-${Date.now()}.jpg`,
      })
    }
    const stillTemp = !isPersistedImageUrl(finalCoverUrl) && !finalCoverUrl.startsWith('blob:')

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({
        cover_image_url: finalCoverUrl,
        cover_image_source: VALID_COVER_SOURCES.includes(coverImageSource) ? coverImageSource : 'user_upload',
        image_status: stillTemp ? 'needs_persist' : 'ok',
        image_checked_at: stillTemp ? null : new Date().toISOString(),
      })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ goal: updatedGoal })
  } catch (error) {
    console.error('goals/set-cover error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
