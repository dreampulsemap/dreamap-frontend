import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// VisionVideoEditor'da dışa aktarılıp Supabase Storage'a ('goal-videos'
// bucket) yüklenen videonun public URL'ini goals.vision_video_url alanına
// kaydeder. "Vizyon Slaytlarını Düzenle" (eski SlideEditor) akışının
// yerini aldı — goal_slides tablosuna dokunulmadı, henüz video
// oluşturmamış eski hedefler için SlidesViewer hâlâ çalışıyor (bkz.
// GoalDetailModal.jsx). Bkz. MIGRATION_NOTES_vision_video.md — yeni
// kolonların ve bucket'ın elle oluşturulması gerekiyor.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, videoUrl } = req.body || {}
    if (!goalId || typeof videoUrl !== 'string' || !videoUrl.trim()) {
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
      .update({ vision_video_url: videoUrl, vision_video_updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ goal: updatedGoal, vision_video_url: videoUrl })
  } catch (error) {
    console.error('goals/save-vision-video error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
