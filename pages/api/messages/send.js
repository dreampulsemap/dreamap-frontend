import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { sendPushToUser } from '@/lib/webPush'

const MAX_LEN = 4000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { recipientId, content, lang } = req.body || {}
    if (!recipientId) return res.status(400).json({ error: 'recipientId_required' })
    if (recipientId === user.id) return res.status(400).json({ error: 'cannot_message_self' })

    const cleanContent = String(content || '').trim()
    if (!cleanContent) return res.status(400).json({ error: 'content_required' })
    if (cleanContent.length > MAX_LEN) return res.status(400).json({ error: 'content_too_long' })

    const { data: recipientProfile, error: recipientError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', recipientId)
      .maybeSingle()

    if (recipientError || !recipientProfile) return res.status(404).json({ error: 'recipient_not_found' })

    const { data: message, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({ sender_id: user.id, recipient_id: recipientId, content: cleanContent })
      .select('id, sender_id, recipient_id, content, is_read, created_at')
      .single()

    if (insertError) throw insertError

    // Zile ayrıca "yeni mesaj" girdisi EKLEMİYORUZ. Okunmamış mesaj sayısı
    // zaten messages.is_read üzerinden tek kaynaktan hesaplanıp Mesaj
    // ikonunun rozetinde gösteriliyor (bkz. /api/messages/unread-count).
    // Aynı bilgiyi iki farklı ikonda tekrarlamak yerine, her ikonun tek ve
    // net bir anlamı olması kullanıcının rozetlere güvenini korur.

    const isTr = (lang || 'tr') === 'tr'
    const { data: senderProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle()
    const senderName = senderProfile?.display_name || senderProfile?.username || (isTr ? 'Biri' : 'Someone')

    try {
      await sendPushToUser(supabaseAdmin, recipientId, {
        title: isTr ? `${senderName} 💬` : `${senderName} 💬`,
        body: cleanContent.length > 120 ? `${cleanContent.slice(0, 117)}...` : cleanContent,
        url: `/messages?with=${user.id}`,
        tag: `message-${user.id}`,
      })
    } catch (err) {
      console.error('push notification error (message):', err)
    }

    return res.status(200).json({ message })
  } catch (error) {
    console.error('messages/send error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
