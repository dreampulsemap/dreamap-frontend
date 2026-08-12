import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const MAX_REACTION_LEN = 16

// Bir mesaja tek bir emoji tepkisi ekler/değiştirir/kaldırır (WhatsApp/
// iMessage tarzı — mesaj başına tek tepki, çoklu/çok-kullanıcılı tepki
// değil). like.js/comment.js gibi bu seviyedeki hafif etkileşimler bu kod
// tabanında push bildirimi üretmiyor — tutarlılık için burada da eklemedik.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { messageId, reaction } = req.body || {}
    if (!messageId) return res.status(400).json({ error: 'messageId_required' })

    const cleanReaction = String(reaction ?? '').trim()
    if (cleanReaction.length > MAX_REACTION_LEN) {
      return res.status(400).json({ error: 'invalid_reaction' })
    }

    const { data: message, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id')
      .eq('id', messageId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!message) return res.status(404).json({ error: 'message_not_found' })

    // Yalnızca konuşmanın iki tarafından biri (gönderen VEYA alıcı) bir
    // mesaja tepki verebilir — üçüncü bir kullanıcı messageId'yi tahmin edip
    // ilgisiz bir konuşmaya tepki ekleyemesin.
    if (message.sender_id !== user.id && message.recipient_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' })
    }

    // Boş string = tepkiyi kaldır (aynı tepkiye tekrar dokununca "toggle off").
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ reaction: cleanReaction || null })
      .eq('id', messageId)

    if (updateError) throw updateError

    return res.status(200).json({ success: true, reaction: cleanReaction || null })
  } catch (error) {
    console.error('messages/react error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
