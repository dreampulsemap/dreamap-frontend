import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30
const VALID_VISIBILITY = ['public', 'friends', 'private']

// pages/api/update-dream.js'nin admin sürümü — aynı temizleme mantığı
// (dreams_tags_max10 CHECK'iyle uyumlu), ama "bu rüya sana mı ait"
// kontrolü yok: admin herhangi bir kullanıcının rüyasını düzenleyebilir.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  const { dreamId, content, location_name, visibility, in_feed, tags } = req.body || {}
  if (!dreamId) return res.status(400).json({ error: 'invalid_params' })

  if (visibility !== undefined && !VALID_VISIBILITY.includes(visibility)) {
    return res.status(400).json({ error: 'invalid_visibility' })
  }

  let cleanTags
  if (tags !== undefined) {
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags_must_be_array' })
    cleanTags = [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
      .slice(0, MAX_TAGS)
      .map((t) => t.slice(0, MAX_TAG_LENGTH))
  }

  const updates = {}
  if (content !== undefined) updates.content = content
  if (location_name !== undefined) updates.location_name = location_name
  if (visibility !== undefined) updates.visibility = visibility
  if (in_feed !== undefined) updates.in_feed = in_feed
  if (cleanTags !== undefined) updates.tags = cleanTags

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no_updates' })

  try {
    const { data, error } = await supabaseAdmin
      .from('dreams')
      .update(updates)
      .eq('id', dreamId)
      .select('id, content, location_name, visibility, in_feed, tags')
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: 'dream_not_found' })
    return res.status(200).json({ ok: true, dream: data })
  } catch (error) {
    console.error('admin/dreams/update error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
