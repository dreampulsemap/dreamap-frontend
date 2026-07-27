// Database Query Optimization Helpers
import { supabaseAdmin } from './supabaseAdmin'

/**
 * Get user's friend IDs efficiently in single query
 * Returns only accepted friendships for a user
 */
export async function getUserFriendIds(userId) {
  if (!userId) return []

  try {
    const { data, error } = await supabaseAdmin
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)

    if (error) throw error

    return data.map(f => f.user_id === userId ? f.friend_id : f.user_id)
  } catch (err) {
    console.error('getUserFriendIds error:', err)
    return []
  }
}

/**
 * Get dreams with optimized column selection
 * Avoids fetching unnecessary large fields
 */
export async function getDreamsOptimized(userId, options = {}) {
  const { limit = 12, offset = 0, selectOnly = true } = options

  const columns = selectOnly
    ? 'id,user_id,content,title,created_at,likes_count,in_feed,visibility,ai_archetypes,ai_sentiment'
    : '*'

  const { data, error, count } = await supabaseAdmin
    .from('dreams')
    .select(columns, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return { data, count }
}

/**
 * Update like count atomically via trigger/RPC
 * Single database operation instead of 2
 */
export async function updateLikeCountAtomic(dreamId, userId, action = 'add') {
  // This should ideally use an RPC function at the DB level
  // For now, we'll use a transaction pattern
  try {
    if (action === 'add') {
      const { error } = await supabaseAdmin
        .from('likes')
        .insert([{ user_id: userId, dream_id: dreamId }])

      if (error) {
        if (error.code === '23505') {
          throw new Error('Already liked')
        }
        throw error
      }
    } else {
      const { error } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('dream_id', dreamId)

      if (error) throw error
    }

    // Database trigger should handle count update automatically
    return { success: true }
  } catch (err) {
    console.error('updateLikeCountAtomic error:', err)
    throw err
  }
}
