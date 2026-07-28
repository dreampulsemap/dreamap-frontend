import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId, orderedSlideIds } = req.body || {}
    if (!goalId || !Array.isArray(orderedSlideIds) || orderedSlideIds.length === 0) {
      return res.status(400).json({ error: 'invalid_params' })
    }

    const { data: goal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select('id, user_id')
      .eq('id', goalId)
      .single()

    if (fetchError || !goal) return res.status(404).json({ error: 'goal_not_found' })
    if (goal.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    // Gönderilen id kümesinin gerçekten bu goal'e ait tüm slaytlarla birebir
    // eşleştiğini doğrula — başka bir goal'ün slaytını sızdırmayı engeller.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('goal_slides')
      .select('id')
      .eq('goal_id', goalId)

    if (existingError) throw existingError
    const existingIds = new Set((existing || []).map((s) => s.id))
    const allBelong = orderedSlideIds.every((id) => existingIds.has(id))
    if (!allBelong || orderedSlideIds.length !== existingIds.size) {
      return res.status(400).json({ error: 'slide_set_mismatch' })
    }

    await Promise.all(
      orderedSlideIds.map((id, index) =>
        supabaseAdmin.from('goal_slides').update({ order_index: index }).eq('id', id)
      )
    )

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('goals/slides/reorder error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
