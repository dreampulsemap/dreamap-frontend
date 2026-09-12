import { supabaseAdmin, getAuthedUser, getAcceptedFriendIds } from '@/lib/supabaseAdmin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (req.method === 'GET') {
      const dreamId = Number(req.query?.dreamId)

      if (!Number.isSafeInteger(dreamId) || dreamId <= 0) {
        return res.status(400).json({ error: 'Invalid dreamId' })
      }

      const { data: dream, error: dreamError } = await supabaseAdmin
        .from('dreams')
        .select('user_id, visibility')
        .eq('id', dreamId)
        .maybeSingle()

      if (dreamError) throw dreamError
      if (!dream) return res.status(404).json({ error: 'dream_not_found' })

      if (dream.visibility && dream.visibility !== 'public') {
        const user = await getAuthedUser(req)
        const isOwner = !!user && user.id === dream.user_id

        let isAcceptedFriend = false
        if (!isOwner && user && dream.visibility === 'friends') {
          const friendIds = await getAcceptedFriendIds(dream.user_id)
          isAcceptedFriend = friendIds.includes(user.id)
        }

        if (!isOwner && !isAcceptedFriend) {
          return res.status(403).json({ error: 'not_visible' })
        }
      }

      const { data, error } = await supabaseAdmin
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          user_profiles(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('dream_id', dreamId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return res.status(200).json({ comments: data || [] })
    }

    const user = await getAuthedUser(req)
    const userId = user?.id

    if (!userId || !UUID_PATTERN.test(userId)) {
      return res.status(401).json({
        error: 'Invalid authenticated user',
        userIdType: typeof userId,
      })
    }

    if (req.method === 'POST') {
      const dreamId = Number(req.body?.dreamId)
      const content = String(req.body?.content || '').trim()

      if (!Number.isSafeInteger(dreamId) || dreamId <= 0) {
        return res.status(400).json({
          error: 'Invalid dreamId',
          receivedDreamId: req.body?.dreamId ?? null,
        })
      }

      if (!content) {
        return res.status(400).json({ error: 'Comment cannot be empty' })
      }

      if (content.length > 500) {
        return res.status(400).json({ error: 'Comment is too long' })
      }

      const { data, error } = await supabaseAdmin
        .from('comments')
        .insert([{ user_id: userId, dream_id: dreamId, content }])
        .select(`
          id,
          content,
          created_at,
          user_id,
          user_profiles(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      return res.status(200).json({ success: true, comment: data })
    }

    const commentId = Number(req.body?.commentId)
    if (!Number.isSafeInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ error: 'Invalid commentId' })
    }

    const { error } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)

    if (error) throw error

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Comment error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to update comment',
      code: error?.code || null,
    })
  }
}
