import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const user = await getAuthedUser(req)
    const userId = user?.id
    // like.js (dream) ile aynı desen: Android snake_case (diary_entry_id)
    // gönderir, olası bir web istemcisi camelCase (diaryEntryId) gönderebilir.
    const diaryEntryId = String(req.body?.diaryEntryId ?? req.body?.diary_entry_id ?? '')

    if (!userId || !UUID_PATTERN.test(userId)) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    if (!UUID_PATTERN.test(diaryEntryId)) {
      return res.status(400).json({ error: 'invalid_diary_entry_id' })
    }

    if (req.method === 'POST') {
      const { error } = await supabaseAdmin
        .from('diary_likes')
        .insert([{ user_id: userId, diary_entry_id: diaryEntryId }])

      if (error && error.code !== '23505') throw error
    } else {
      const { error } = await supabaseAdmin
        .from('diary_likes')
        .delete()
        .eq('user_id', userId)
        .eq('diary_entry_id', diaryEntryId)

      if (error) throw error
    }

    // trg_update_diary_likes_count trigger'ı likes_count'u zaten güncel
    // tuttuğu için burada sadece güncel değeri okuyoruz.
    const { data: entry, error: readError } = await supabaseAdmin
      .from('diary_entries')
      .select('likes_count')
      .eq('id', diaryEntryId)
      .maybeSingle()

    if (readError) throw readError
    if (!entry) return res.status(404).json({ error: 'diary_entry_not_found' })

    return res.status(200).json({
      success: true,
      liked: req.method === 'POST',
      count: entry.likes_count,
    })
  } catch (error) {
    console.error('diary/like error:', error)
    return res.status(500).json({ error: error?.message || 'internal_error' })
  }
}
