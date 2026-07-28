import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// Görsel istemci tarafında 'goal-images' bucket'ına yükleniyor (ya da
// kullanıcının kendi galerisinden seçiliyor); bu endpoint sadece elde edilen
// public URL'i goal_slides satırı olarak kaydediyor. sourceSlideId veriliyorsa
// (Explore'dan "kendi vizyonuna ekle"), handle_slide_save trigger'ı orijinal
// slaytın saves_count'unu otomatik artırır.

const MAX_SLIDES = 20
const MIN_DURATION = 1
const MAX_DURATION = 15
const DEFAULT_DURATION = 4

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, imageUrl, caption, durationSeconds, sourceSlideId } = req.body || {}
    if (!goalId || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const { count, error: countError } = await supabaseAdmin
      .from('goal_slides')
      .select('id', { count: 'exact', head: true })
      .eq('goal_id', goalId)

    if (countError) throw countError
    if ((count || 0) >= MAX_SLIDES) {
      return res.status(400).json({ error: 'slide_limit_reached', max: MAX_SLIDES })
    }

    const cleanDuration = Math.min(
      Math.max(parseInt(durationSeconds, 10) || DEFAULT_DURATION, MIN_DURATION),
      MAX_DURATION
    )

    // sourceSlideId sadece var olup olmadığı doğrulanarak kabul edilir —
    // başka bir kullanıcının slaytına işaret edebilir, bu normaldir (Explore).
    let validSourceId = null
    if (sourceSlideId) {
      const { data: sourceSlide } = await supabaseAdmin
        .from('goal_slides')
        .select('id')
        .eq('id', sourceSlideId)
        .maybeSingle()
      if (sourceSlide) validSourceId = sourceSlide.id
    }

    const { data: slide, error: insertError } = await supabaseAdmin
      .from('goal_slides')
      .insert({
        goal_id: goalId,
        image_url: imageUrl.trim(),
        caption: typeof caption === 'string' ? caption.slice(0, 200) : null,
        duration_seconds: cleanDuration,
        order_index: count || 0,
        source_slide_id: validSourceId,
      })
      .select('*')
      .single()

    if (insertError) throw insertError

    return res.status(200).json({ slide })
  } catch (error) {
    console.error('goals/slides/create error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
