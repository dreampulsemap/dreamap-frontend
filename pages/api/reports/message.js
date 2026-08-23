// pages/api/reports/message.js
// Yalnızca mesajın ALICISI bildirebilir (kendi gönderdiğin mesajı
// bildiremezsin). Mesajın içeriği (content) DB'den o an çekilip
// content_reports.note içine kısaca eklenir — mesaj daha sonra
// silinir/düzenlenirse admin yine de neyin bildirildiğini görebilsin diye.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const VALID_REASONS = ['spam', 'inappropriate', 'harassment', 'misinformation', 'hate_speech', 'other']
const MAX_NOTE_LENGTH = 500

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { messageId, reason, note } = req.body || {}
    if (!messageId || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'invalid_params' })
    }
    const cleanNote = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE_LENGTH) : null

    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, recipient_id, content')
      .eq('id', messageId)
      .maybeSingle()

    if (messageError) throw messageError
    if (!message) return res.status(404).json({ error: 'message_not_found' })
    if (message.recipient_id !== user.id) {
      return res.status(403).json({ error: 'can_only_report_received_messages' })
    }

    const snippet = typeof message.content === 'string' ? message.content.slice(0, 200) : null
    const combinedNote = [cleanNote, snippet ? `[mesaj içeriği]: ${snippet}` : null]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_NOTE_LENGTH)

    const { error } = await supabaseAdmin.from('content_reports').insert({
      content_type: 'message',
      content_id: messageId,
      reporter_id: user.id,
      reason,
      note: combinedNote || null,
    })

    if (error) {
      if (error.code === '23505') return res.status(200).json({ success: true, already_reported: true })
      throw error
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('reports/message error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
