import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getAuthedUser(req)
    const userId = user?.id
    const dreamId = Number(req.body?.dreamId)

    if (!userId || !UUID_PATTERN.test(userId)) {
      return res.status(401).json({
        error: 'Invalid authenticated user',
        userIdType: typeof userId,
      })
    }

    if (!Number.isSafeInteger(dreamId) || dreamId <= 0) {
      return res.status(400).json({
        error: 'Invalid dreamId',
        receivedDreamId: req.body?.dreamId ?? null,
      })
    }

    if (req.method === 'POST') {
      const { error } = await supabaseAdmin
        .from('likes')
        .insert([{ user_id: userId, dream_id: dreamId }])

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Already liked' })
        }
        throw error
      }

      const { data: countResult, error: countError } = await supabaseAdmin
        .from('dreams')
        .select('likes_count')
        .eq('id', dreamId)
        .single()

      if (countError) throw countError

      return res.status(200).json({
        success: true,
        liked: true,
        count: countResult?.likes_count || 0,
      })
    }

    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('dream_id', dreamId)

    if (error) throw error

    const { data: countResult, error: countError } = await supabaseAdmin
      .from('dreams')
      .select('likes_count')
      .eq('id', dreamId)
      .single()

    if (countError) throw countError

    return res.status(200).json({
      success: true,
      liked: false,
      count: countResult?.likes_count || 0,
    })
  } catch (error) {
    console.error('Like error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to update like',
      code: error?.code || null,
    })
  }
}
