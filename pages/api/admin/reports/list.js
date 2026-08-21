import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

const PAGE_SIZE_DEFAULT = 24
const PAGE_SIZE_MAX = 50
const VALID_STATUSES = ['pending', 'reviewed', 'dismissed', 'all']

// status=pending (varsayılan): henüz incelenmemiş bildirimler — admin'in
// "iş listesi". status=reviewed/dismissed: geçmiş kararları görmek için.
// status=all: hepsi. dreams/list.js'teki filter=missing/all deseniyle aynı
// mantık. Aynı vizyon birden çok kişi tarafından bildirilmiş olabilir
// (unique constraint (goal_id, reporter_id) — kişi başına bir kez), bu
// yüzden bir goal için birden fazla satır dönebilir; admin panelinde
// goal_id'ye göre gruplanıp "N kişi bildirdi" gösterilir.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  try {
    const { status = 'pending' } = req.query
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'invalid_status' })

    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(req.query.pageSize, 10) || PAGE_SIZE_DEFAULT))
    const pageNum = Math.max(0, parseInt(req.query.page, 10) || 0)
    const from = pageNum * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('goal_reports')
      .select('id, goal_id, reporter_id, reason, note, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reports, error, count } = await query
    if (error) throw error

    const goalIds = [...new Set((reports || []).map((r) => r.goal_id).filter(Boolean))]
    const reporterIds = [...new Set((reports || []).map((r) => r.reporter_id).filter(Boolean))]

    let goalsById = {}
    if (goalIds.length > 0) {
      const { data: goals, error: goalsError } = await supabaseAdmin
        .from('goals')
        .select('id, user_id, title, cover_image_url, vision_video_url, slide_count, status')
        .in('id', goalIds)
      if (goalsError) throw goalsError
      goalsById = Object.fromEntries((goals || []).map((g) => [g.id, g]))
    }

    // Hem raporlayanları hem vizyon sahiplerini tek sorguda çöz — profil
    // kartı ikisinde de aynı şekle (username/display_name/avatar_url) sahip.
    const ownerIds = Object.values(goalsById).map((g) => g.user_id).filter(Boolean)
    const profileIds = [...new Set([...reporterIds, ...ownerIds])]
    let profilesById = {}
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', profileIds)
      if (profilesError) throw profilesError
      profilesById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    }

    const enriched = (reports || []).map((r) => {
      const goal = goalsById[r.goal_id] || null
      return {
        ...r,
        reporter: profilesById[r.reporter_id] || null,
        goal: goal
          ? {
              ...goal,
              // Vizyon bu arada silinmiş olabilir (goal_reports.goal_id
              // FK'si on delete cascade, ama teorik olarak silme ile
              // bildirim listesi arasında yarış olabilir) — owner null
              // gelirse UI "Vizyon silinmiş" göstersin diye owner'ı ayrı
              // tutuyoruz, goal'ı null yapmıyoruz.
              owner: profilesById[goal.user_id] || null,
            }
          : null,
      }
    })

    return res.status(200).json({
      reports: enriched,
      page: pageNum,
      pageSize,
      total: count ?? enriched.length,
      hasMore: to + 1 < (count ?? 0),
    })
  } catch (error) {
    console.error('admin/reports/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
