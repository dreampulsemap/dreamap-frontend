import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const MIN_DURATION = 1
const MAX_DURATION = 15
const ALLOWED_FONTS = ['sans', 'serif', 'mono', 'elegant', 'display', 'handwritten']
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function clampNum(v, min, max) {
  const n = parseFloat(v)
  if (Number.isNaN(n)) return null
  return Math.min(Math.max(n, min), max)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { slideId, caption, durationSeconds, captionFont, captionColor, captionX, captionY, captionSize } = req.body || {}
    if (!slideId) return res.status(400).json({ error: 'invalid_params' })

    const { data: slide, error: fetchError } = await supabaseAdmin
      .from('goal_slides')
      .select('id, goal_id, goals!inner(user_id)')
      .eq('id', slideId)
      .single()

    if (fetchError || !slide) return res.status(404).json({ error: 'slide_not_found' })
    if (slide.goals.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const updates = {}
    if (typeof caption === 'string') updates.caption = caption.slice(0, 200)
    if (durationSeconds !== undefined) {
      updates.duration_seconds = Math.min(
        Math.max(parseInt(durationSeconds, 10) || 4, MIN_DURATION),
        MAX_DURATION
      )
    }
    if (typeof captionFont === 'string' && ALLOWED_FONTS.includes(captionFont)) updates.caption_font = captionFont
    if (typeof captionColor === 'string' && HEX_COLOR.test(captionColor)) updates.caption_color = captionColor
    if (captionX !== undefined) { const v = clampNum(captionX, 0, 100); if (v !== null) updates.caption_x = v }
    if (captionY !== undefined) { const v = clampNum(captionY, 0, 100); if (v !== null) updates.caption_y = v }
    if (captionSize !== undefined) { const v = clampNum(captionSize, 0.4, 3.5); if (v !== null) updates.caption_size = v }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'nothing_to_update' })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('goal_slides')
      .update(updates)
      .eq('id', slideId)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ slide: updated })
  } catch (error) {
    console.error('goals/slides/update error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}

