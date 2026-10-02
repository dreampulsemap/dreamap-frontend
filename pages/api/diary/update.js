import { supabaseAdmin, getAuthedUser, clampVisibilityToProfile } from '@/lib/supabaseAdmin'

// Günce girdisini düzenle (yalnızca sahibi): açıklama ve görünürlük.
// Medya değiştirilmez — fotoğraf/video yeni bir girdi olarak eklenir.
// create.js ile aynı kurallar: metin girdisi açıklamasız kalamaz,
// görünürlük profilin görünürlüğünü aşamaz.
const VALID_VISIBILITY = ['public', 'friends', 'private']
const MAX_CAPTION_LENGTH = 1000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { entryId, caption, visibility } = req.body || {}
    if (!entryId) return res.status(400).json({ error: 'invalid_params' })
    if (visibility !== undefined && !VALID_VISIBILITY.includes(visibility)) {
      return res.status(400).json({ error: 'invalid_visibility' })
    }

    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('diary_entries')
      .select('id, user_id, media_type')
      .eq('id', entryId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!entry) return res.status(404).json({ error: 'not_found' })
    if (entry.user_id !== user.id) return res.status(403).json({ error: 'not_owner' })

    const patch = {}
    if (caption !== undefined) {
      const clean = typeof caption === 'string' ? caption.trim().slice(0, MAX_CAPTION_LENGTH) : ''
      if (entry.media_type === 'text' && !clean) return res.status(400).json({ error: 'text_entry_needs_caption' })
      patch.caption = clean || null
    }
    if (visibility !== undefined) patch.visibility = await clampVisibilityToProfile(user.id, visibility)
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'nothing_to_update' })

    const { data: updated, error } = await supabaseAdmin
      .from('diary_entries')
      .update(patch)
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select('id, caption, visibility')
      .single()
    if (error) throw error

    return res.status(200).json({ success: true, entry: updated })
  } catch (error) {
    console.error('diary/update error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
