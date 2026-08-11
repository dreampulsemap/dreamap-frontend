import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'
import { sendPushToUser } from '@/lib/webPush'

const MAX_LEN = 4000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { recipientId, content, lang, attachmentUrl, attachmentType, attachmentName, attachmentMime, attachmentSize } = req.body || {}
    if (!recipientId) return res.status(400).json({ error: 'recipientId_required' })
    if (recipientId === user.id) return res.status(400).json({ error: 'cannot_message_self' })

    const cleanContent = String(content || '').trim()
    if (cleanContent.length > MAX_LEN) return res.status(400).json({ error: 'content_too_long' })

    let attachment = null
    if (attachmentUrl) {
      if (!['image', 'video', 'file'].includes(attachmentType)) {
        return res.status(400).json({ error: 'invalid_attachment_type' })
      }
      const expectedPrefix = `/storage/v1/object/public/message-attachments/${user.id}/`
      let isOwnAttachment = false
      try {
        isOwnAttachment = new URL(attachmentUrl).pathname.includes(expectedPrefix)
      } catch {
        isOwnAttachment = false
      }
      if (!isOwnAttachment) return res.status(400).json({ error: 'invalid_attachment_url' })

      attachment = {
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        attachment_name: attachmentName ? String(attachmentName).slice(0, 255) : null,
        attachment_mime: attachmentMime ? String(attachmentMime).slice(0, 120) : null,
        attachment_size: Number.isFinite(Number(attachmentSize)) ? Number(attachmentSize) : null,
      }
    }

    if (!cleanContent && !attachment) return res.status(400).json({ error: 'content_required' })

    const { data: recipientProfile, error: recipientError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', recipientId)
      .maybeSingle()

    if (recipientError || !recipientProfile) return res.status(404).json({ error: 'recipient_not_found' })

    const { data: message, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({ sender_id: user.id, recipient_id: recipientId, content: cleanContent, ...attachment })
      .select('id, sender_id, recipient_id, content, is_read, created_at, attachment_url, attachment_type, attachment_name, attachment_mime, attachment_size, reaction')
      .single()

    if (insertError) throw insertError

    const isTr = (lang || 'tr') === 'tr'
    const { data: senderProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle()
    const senderName = senderProfile?.display_name || senderProfile?.username || (isTr ? 'Biri' : 'Someone')

    const attachmentLabel = attachment?.attachment_type === 'image'
      ? (isTr ? '📷 Fotoğraf' : '📷 Photo')
      : attachment?.attachment_type === 'video'
      ? (isTr ? '🎥 Video' : '🎥 Video')
      : attachment?.attachment_type === 'file'
      ? (isTr ? '📎 Dosya' : '📎 File')
      : null
    const pushBody = cleanContent
      ? (cleanContent.length > 120 ? `${cleanContent.slice(0, 117)}...` : cleanContent)
      : attachmentLabel || ''

    try {
      await sendPushToUser(supabaseAdmin, recipientId, {
        title: isTr ? `${senderName} 💬` : `${senderName} 💬`,
        body: pushBody,
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
