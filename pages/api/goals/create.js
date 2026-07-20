import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const MAX_TITLE_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 2000
const VALID_COVER_SOURCES = ['user_upload', 'ai_generated', 'pinterest']
const VALID_VISIBILITY = ['public', 'friends', 'private']

function normalizeText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/\s+/g, ' ')
  return trimmed.length ? trimmed : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const {
      title,
      description,
      cover_image_url,
      cover_image_source,
      target_date,
      visibility,
      roadmap, // opsiyonel: [{ title: string }, ...] — ilk Yol Haritası maddeleri
    } = req.body || {}

    const cleanTitle = normalizeText(title)
    if (!cleanTitle) {
      return res.status(400).json({ error: 'title_required' })
    }
    if (cleanTitle.length > MAX_TITLE_LENGTH) {
      return res.status(413).json({ error: 'title_too_long', max: MAX_TITLE_LENGTH })
    }

    const cleanDescription = normalizeText(description)
    if (cleanDescription && cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(413).json({ error: 'description_too_long', max: MAX_DESCRIPTION_LENGTH })
    }

    const insertPayload = {
      user_id: user.id,
      title: cleanTitle,
      description: cleanDescription,
      cover_image_url: normalizeText(cover_image_url),
      cover_image_source: VALID_COVER_SOURCES.includes(cover_image_source) ? cover_image_source : 'ai_generated',
      target_date: target_date || null,
      visibility: VALID_VISIBILITY.includes(visibility) ? visibility : 'public',
    }

    const { data: goal, error: insertError } = await supabaseAdmin
      .from('goals')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insertError) throw insertError

    // Opsiyonel: ilk Yol Haritası maddelerini de tek istekte oluştur
    let microGoals = []
    if (Array.isArray(roadmap) && roadmap.length > 0) {
      const cleanRoadmap = roadmap
        .map((item, index) => ({
          goal_id: goal.id,
          title: normalizeText(typeof item === 'string' ? item : item?.title),
          order_index: index,
        }))
        .filter((item) => item.title)
        .slice(0, 20) // makul bir üst sınır

      if (cleanRoadmap.length > 0) {
        const { data: insertedMicroGoals, error: microError } = await supabaseAdmin
          .from('micro_goals')
          .insert(cleanRoadmap)
          .select('*')

        if (microError) {
          // Hedef zaten oluşturuldu; roadmap eklenemedi diye tüm işlemi geri almıyoruz,
          // ama hatayı istemciye bildiriyoruz ki kullanıcı tekrar deneyebilsin.
          return res.status(207).json({
            goal,
            microGoals: [],
            warning: 'goal_created_roadmap_failed',
          })
        }
        microGoals = insertedMicroGoals || []
      }
    }

    return res.status(200).json({ goal, microGoals })
  } catch (error) {
    console.error('goals/create error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
