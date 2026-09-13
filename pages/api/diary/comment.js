import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { notifyDiaryComment } from '@/lib/notify'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_COMMENT_LENGTH = 1000

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    if (req.method === 'GET') {
      const diaryEntryId = String(req.query?.diaryEntryId ?? req.query?.diary_entry_id ?? '')
      if (!UUID_PATTERN.test(diaryEntryId)) {
        return res.status(400).json({ error: 'invalid_diary_entry_id' })
      }

      // comment.js (dream) ile aynı desen: comments/user_profiles arasında
      // PostgREST'in tanıyacağı bir FK ilişkisi olmasa bile çalışsın diye
      // ayrı sorgularla birleştiriyoruz.
      const { data: rows, error } = await supabaseAdmin
        .from('diary_comments')
        .select('id, content, created_at, user_id')
        .eq('diary_entry_id', diaryEntryId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const userIds = [...new Set((rows || []).map((r) => r.user_id))]
      let profilesById = {}
      if (userIds.length) {
        const { data: profiles } = await supabaseAdmin
          .from('user_profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds)
        profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
      }

      const comments = (rows || []).map((r) => ({ ...r, user_profiles: profilesById[r.user_id] || null }))
      return res.status(200).json({ comments })
    }

    const user = await getAuthedUser(req)
    const userId = user?.id
    if (!userId || !UUID_PATTERN.test(userId)) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    if (req.method === 'POST') {
      const diaryEntryId = String(req.body?.diaryEntryId ?? req.body?.diary_entry_id ?? '')
      const content = String(req.body?.content || '').trim()

      if (!UUID_PATTERN.test(diaryEntryId)) {
        return res.status(400).json({ error: 'invalid_diary_entry_id' })
      }
      if (!content) return res.status(400).json({ error: 'empty_comment' })
      if (content.length > MAX_COMMENT_LENGTH) {
        return res.status(413).json({ error: 'comment_too_long', max: MAX_COMMENT_LENGTH })
      }

      const { data: entry } = await supabaseAdmin
        .from('diary_entries')
        .select('user_id')
        .eq('id', diaryEntryId)
        .maybeSingle()
      if (!entry) return res.status(404).json({ error: 'diary_entry_not_found' })

      const { data: inserted, error } = await supabaseAdmin
        .from('diary_comments')
        .insert([{ user_id: userId, diary_entry_id: diaryEntryId, content }])
        .select('id, content, created_at, user_id')
        .single()

      if (error) throw error

      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      await notifyDiaryComment(supabaseAdmin, { entryOwnerId: entry.user_id, actorId: userId, diaryEntryId })

      return res.status(200).json({
        success: true,
        comment: { ...inserted, user_profiles: profile || null },
      })
    }

    // DELETE
    const commentId = String(req.body?.commentId ?? req.body?.comment_id ?? '')
    if (!UUID_PATTERN.test(commentId)) {
      return res.status(400).json({ error: 'invalid_comment_id' })
    }

    const { error } = await supabaseAdmin
      .from('diary_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('diary/comment error:', error)
    return res.status(500).json({ error: error?.message || 'internal_error' })
  }
}
