import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const MAX_REACTION_LEN = 16

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { messageId, reaction } = req.body || {}
    if (!messageId) return res.status(400).json({ error: 'messageId_required' })

    const cleanReaction = reaction ? String(reaction).slice(0, MAX_REACTION_LEN) : null

    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id')
      .eq('id', messageId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!message) return res.status(404).json({ error: 'message_not_found' })
    if (message.sender_id !== user.id && message.recipient_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ reaction: cleanReaction })
      .eq('id', messageId)
      .select('id, sender_id, recipient_id, content, is_read, created_at, attachment_url, attachment_type, attachment_name, attachment_mime, attachment_size, reaction')
      .single()

    if (updateError) throw updateError

    return res.status(200).json({ message: updated })
  } catch (error) {
    console.error('messages/react error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
