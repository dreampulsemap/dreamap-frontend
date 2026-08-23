// pages/api/blocks/list.js
// Engellenen kullanıcıların listesi — Profil > Engellenen Kullanıcılar
// ekranı için. Her satıra profil bilgisi (username/display_name/avatar)
// eklenmiş olarak döner.

import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  try {
    const { data: blocks, error } = await supabaseAdmin
      .from('user_blocks')
      .select('blocked_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const ids = (blocks || []).map((b) => b.blocked_id)
    let profilesById = {}
    if (ids.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', ids)
      if (profilesError) throw profilesError
      profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    }

    const result = (blocks || []).map((b) => ({
      userId: b.blocked_id,
      blockedAt: b.created_at,
      profile: profilesById[b.blocked_id] || null,
    }))

    return res.status(200).json({ blocked: result })
  } catch (error) {
    console.error('blocks/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
