import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { slideId } = req.body || {}
    if (!slideId) return res.status(400).json({ error: 'invalid_params' })

    const { data: slide, error: fetchError } = await supabaseAdmin
      .from('goal_slides')
      .select('id, goal_id, goals!inner(user_id)')
      .eq('id', slideId)
      .single()

    if (fetchError || !slide) return res.status(404).json({ error: 'slide_not_found' })
    if (slide.goals.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const { error: deleteError } = await supabaseAdmin
      .from('goal_slides')
      .delete()
      .eq('id', slideId)

    if (deleteError) throw deleteError

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('goals/slides/delete error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
