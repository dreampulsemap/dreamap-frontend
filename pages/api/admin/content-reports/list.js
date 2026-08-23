// pages/api/admin/content-reports/list.js
// admin/reports/list.js (goal_reports) ile AYNI desen — content_reports
// için. content_type filtresi opsiyonel (dream|user|message|all).

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

const PAGE_SIZE_DEFAULT = 24
const PAGE_SIZE_MAX = 50
const VALID_STATUSES = ['pending', 'reviewed', 'dismissed', 'all']
const VALID_TYPES = ['dream', 'user', 'message', 'all']

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  try {
    const { status = 'pending', contentType = 'all' } = req.query
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid_status' })
    if (!VALID_TYPES.includes(contentType)) return res.status(400).json({ error: 'invalid_content_type' })

    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(req.query.pageSize, 10) || PAGE_SIZE_DEFAULT))
    const pageNum = Math.max(0, parseInt(req.query.page, 10) || 0)
    const from = pageNum * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('content_reports')
      .select('id, content_type, content_id, reporter_id, reason, note, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status !== 'all') query = query.eq('status', status)
    if (contentType !== 'all') query = query.eq('content_type', contentType)

    const { data: reports, error, count } = await query
    if (error) throw error

    const reporterIds = [...new Set((reports || []).map((r) => r.reporter_id).filter(Boolean))]
    // dreams.id bigint'tir, content_id text olarak tutuluyor — sorgu için
    // number'a çeviriyoruz.
    const dreamIds = (reports || [])
      .filter((r) => r.content_type === 'dream')
      .map((r) => Number(r.content_id))
      .filter((n) => Number.isInteger(n))
    const userIds = (reports || []).filter((r) => r.content_type === 'user').map((r) => r.content_id)
    const messageIds = (reports || []).filter((r) => r.content_type === 'message').map((r) => r.content_id)

    let dreamsById = {}
    if (dreamIds.length > 0) {
      const { data } = await supabaseAdmin.from('dreams').select('id, user_id, ai_title, ai_image_url').in('id', dreamIds)
      dreamsById = Object.fromEntries((data || []).map((d) => [String(d.id), d]))
    }

    let messagesById = {}
    if (messageIds.length > 0) {
      const { data } = await supabaseAdmin.from('messages').select('id, sender_id, recipient_id, content').in('id', messageIds)
      messagesById = Object.fromEntries((data || []).map((m) => [m.id, m]))
    }

    const dreamOwnerIds = Object.values(dreamsById).map((d) => d.user_id).filter(Boolean)
    const messagePartyIds = Object.values(messagesById).flatMap((m) => [m.sender_id, m.recipient_id]).filter(Boolean)
    const profileIds = [...new Set([...reporterIds, ...userIds, ...dreamOwnerIds, ...messagePartyIds])]

    let profilesById = {}
    if (profileIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', profileIds)
      profilesById = Object.fromEntries((data || []).map((p) => [p.id, p]))
    }

    const enriched = (reports || []).map((r) => {
      const base = { ...r, reporter: profilesById[r.reporter_id] || null }
      if (r.content_type === 'dream') {
        const dream = dreamsById[r.content_id] || null
        return { ...base, dream: dream ? { ...dream, owner: profilesById[dream.user_id] || null } : null }
      }
      if (r.content_type === 'user') {
        return { ...base, reportedUser: profilesById[r.content_id] || null }
      }
      if (r.content_type === 'message') {
        const message = messagesById[r.content_id] || null
        return {
          ...base,
          message: message
            ? {
                ...message,
                sender: profilesById[message.sender_id] || null,
                recipient: profilesById[message.recipient_id] || null,
              }
            : null,
        }
      }
      return base
    })

    return res.status(200).json({
      reports: enriched,
      page: pageNum,
      pageSize,
      total: count ?? enriched.length,
      hasMore: to + 1 < (count ?? 0),
    })
  } catch (error) {
    console.error('admin/content-reports/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
