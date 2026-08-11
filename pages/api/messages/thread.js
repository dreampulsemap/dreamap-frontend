import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const PAGE_SIZE = 50

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { with: otherId, before, after } = req.query
    if (!otherId) return res.status(400).json({ error: 'with_required' })
    if (otherId === user.id) return res.status(400).json({ error: 'cannot_message_self' })

    const { data: otherUser, error: otherUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', otherId)
      .maybeSingle()

    if (otherUserError || !otherUser) return res.status(404).json({ error: 'user_not_found' })

    let query = supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id, content, is_read, created_at, attachment_url, attachment_type, attachment_name, attachment_mime, attachment_size, reaction')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)

    if (after) {
      query = query.gt('created_at', after).order('created_at', { ascending: true }).limit(PAGE_SIZE)
    } else if (before) {
      query = query.lt('created_at', before).order('created_at', { ascending: false }).limit(PAGE_SIZE)
    } else {
      query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE)
    }

    const { data: rows, error } = await query
    if (error) throw error

    const messages = after ? (rows || []) : (rows || []).slice().reverse()

    const { error: markReadError } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', otherId)
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (markReadError) console.error('messages/thread mark-read error:', markReadError)

    return res.status(200).json({
      messages,
      otherUser,
      hasMore: !after && messages.length === PAGE_SIZE,
    })
  } catch (error) {
    console.error('messages/thread error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
