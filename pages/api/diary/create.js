import { supabaseAdmin, getAuthedUser, clampVisibilityToProfile } from '@/lib/supabaseAdmin'

// goal_slides/create.js ve goals/create.js ile aynı desen: medya zaten
// istemci tarafında Storage'a yüklenmiş oluyor (bkz. lib/uploadDiaryMedia.js),
// bu endpoint sadece sonucu diary_entries satırı olarak kaydediyor.
const VALID_TYPES = ['photo', 'video', 'text']
const VALID_VISIBILITY = ['public', 'friends', 'private']
const MAX_CAPTION_LENGTH = 1000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { mediaType, mediaUrl, posterUrl, caption, visibility = 'private', goalId } = req.body || {}

    if (!VALID_TYPES.includes(mediaType)) return res.status(400).json({ error: 'invalid_media_type' })
    if (!VALID_VISIBILITY.includes(visibility)) return res.status(400).json({ error: 'invalid_visibility' })

    const cleanCaption = typeof caption === 'string' ? caption.trim().slice(0, MAX_CAPTION_LENGTH) : null

    // diary_entries_media_or_text CHECK'iyle aynı kural: metin girdisi
    // caption'sız olamaz, foto/video mediaUrl'siz olamaz.
    if (mediaType === 'text' && !cleanCaption) {
      return res.status(400).json({ error: 'text_entry_needs_caption' })
    }
    if (mediaType !== 'text' && (typeof mediaUrl !== 'string' || !mediaUrl.trim())) {
      return res.status(400).json({ error: 'media_entry_needs_url' })
    }

    // Bir hedefe bağlanıyorsa, gerçekten kendi hedefi olduğunu doğrula —
    // başkasının vizyonuna sessizce günce iliştirilmesin.
    if (goalId) {
      const { data: goal } = await supabaseAdmin.from('goals').select('id, user_id').eq('id', goalId).maybeSingle()
      if (!goal || goal.user_id !== user.id) return res.status(403).json({ error: 'goal_not_owned' })
    }

    const { data: entry, error } = await supabaseAdmin
      .from('diary_entries')
      .insert({
        user_id: user.id,
        media_type: mediaType,
        media_url: mediaType === 'text' ? null : mediaUrl.trim(),
        poster_url: mediaType === 'video' && posterUrl ? posterUrl : null,
        caption: cleanCaption,
        // 013 migration: profil gizliliği "friends"/"private" ise DB trigger'ı
        // zaten aynı kısıtlamayı uygular; API'de de uyguluyoruz ki dönen
        // satırda istemci net/tutarlı bir değer görsün.
        visibility: await clampVisibilityToProfile(user.id, visibility),
        goal_id: goalId || null,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(200).json({ entry })
  } catch (error) {
    console.error('diary/create error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
