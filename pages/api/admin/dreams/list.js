import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'

const PAGE_SIZE_DEFAULT = 24
const PAGE_SIZE_MAX = 50

// filter=missing (varsayılan): ai_image_url boş OLAN ya da image_status'ü
// 'broken' olan (ör. bir Pixabay linki öldüğü için onarım denemeleri
// tükenmiş) rüyalar — yani "admin'in bir görsel hediye etmesi işe yarar"
// olanlar. Explore'daki includeNoImage filtresinden farklı: o sadece
// ai_image_url boş olanları kapsıyor, broken'ı her zaman gizliyor — burada
// ikisi de "iş listesi" sayılıyor çünkü admin broken olanı da düzeltebilir.
// filter=all: hiç filtre yok, en yeniden eskiye tüm rüyalar.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  try {
    const { filter = 'missing', page = '0' } = req.query
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(req.query.pageSize, 10) || PAGE_SIZE_DEFAULT))
    const pageNum = Math.max(0, parseInt(page, 10) || 0)
    const from = pageNum * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('dreams')
      .select('id, user_id, content, ai_title, ai_title_tr, ai_title_en, tags, ai_archetypes, ai_image_url, image_source, image_status, image_width, image_height, original_language, visibility, in_feed, location_name, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filter === 'missing') {
      query = query.or('ai_image_url.is.null,image_status.eq.broken')
    }

    const { data: dreams, error, count } = await query
    if (error) throw error

    const userIds = [...new Set((dreams || []).map((d) => d.user_id).filter(Boolean))]
    let usersById = {}
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)
      if (profilesError) throw profilesError
      usersById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
    }

    const enriched = (dreams || []).map((d) => ({
      ...d,
      title: d.ai_title_tr || d.ai_title || d.ai_title_en || null,
      user: usersById[d.user_id] || null,
    }))

    return res.status(200).json({
      dreams: enriched,
      page: pageNum,
      pageSize,
      total: count ?? enriched.length,
      hasMore: to + 1 < (count ?? 0),
    })
  } catch (error) {
    console.error('admin/dreams/list error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
