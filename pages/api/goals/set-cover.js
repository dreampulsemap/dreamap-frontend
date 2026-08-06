import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

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

    const { data: updatedGoal, error: updateError } = await supabaseAdmin
      .from('goals')
      .update({
        cover_image_url: coverImageUrl.trim(),
        cover_image_source: VALID_COVER_SOURCES.includes(coverImageSource) ? coverImageSource : 'user_upload',
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
