import { supabaseAdmin, getAuthedUser, canViewGoal } from '@/lib/supabaseAdmin'

// "Kendi Vizyonlarıma Ekle" — Ana Sayfa, Keşfet, Vizyon sekmesi ya da
// Profil'de görülen BAŞKASINA ait bir vizyonu tek tıkla kullanıcının kendi
// vizyonlarına yeni bir goals satırı olarak kopyalar. Görünürlük kontrolü
// canViewGoal ile save.js/report.js/give-mana.js'deki DİĞER tüm goal
// route'larıyla birebir aynı (public her zaman, friends sadece kabul
// edilmiş arkadaşsa, private hiçbir zaman — admin client RLS'i bypass
// ettiği için bu kontrolü JS tarafında biz yapıyoruz).
//
// Aynı vizyonu ikinci kez eklemeye çalışmak hata değil: goals.source_goal_id
// üzerindeki UNIQUE partial index (user_id, source_goal_id) Postgres'te
// 23505 (unique_violation) fırlatır, biz bunu report.js'teki
// already_reported ile birebir aynı şekilde already_cloned:true olarak
// nazikçe yanıtlıyoruz.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const { goalId } = req.body || {}
    if (!goalId) return res.status(400).json({ error: 'invalid_params' })

    const { allowed, goal: sourceGoal } = await canViewGoal(goalId, user.id)
    if (!sourceGoal) return res.status(404).json({ error: 'goal_not_found' })
    if (!allowed) return res.status(403).json({ error: 'not_visible' })
    if (sourceGoal.user_id === user.id) return res.status(400).json({ error: 'cannot_clone_own_goal' })

    // canViewGoal sadece id/user_id/visibility/status döner (list.js'nin
    // ihtiyacı bu kadardı) — klonlama için gereken tüm alanları burada
    // ayrıca çekiyoruz.
    const { data: fullSourceGoal, error: fetchError } = await supabaseAdmin
      .from('goals')
      .select(
        'title, description, cover_image_url, cover_image_source, ' +
        'vision_video_url, target_date, gallery_image_urls'
      )
      .eq('id', goalId)
      .single()

    if (fetchError || !fullSourceGoal) return res.status(404).json({ error: 'goal_not_found' })

    // status set edilmiyor: create.js'de de görüldüğü gibi DB tarafında
    // default var (yeni klon her zaman taze/aktif başlar — orijinal
    // completed/abandoned olsa bile).
    const { data: cloned, error: insertError } = await supabaseAdmin
      .from('goals')
      .insert({
        user_id: user.id,
        title: fullSourceGoal.title,
        description: fullSourceGoal.description,
        cover_image_url: fullSourceGoal.cover_image_url,
        cover_image_source: fullSourceGoal.cover_image_source,
        vision_video_url: fullSourceGoal.vision_video_url,
        target_date: fullSourceGoal.target_date,
        gallery_image_urls: fullSourceGoal.gallery_image_urls || [],
        // create.js'deki visibility davranışıyla aynı: uygulamanın normal
        // "yeni vizyon oluştur" akışında da varsayılan 'public'.
        visibility: 'public',
        source_goal_id: sourceGoal.id,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(200).json({ success: true, already_cloned: true })
      }
      throw insertError
    }

    // Yol Haritası (micro_goals) maddelerini de kopyala — list.js her
    // goal'ü zaten micro_goals ile birlikte döndürüyor, Android tarafı
    // (GoalDetailScreen) bunu aktif gösteriyor; atlarsak klon eksik görünür.
    // is_completed bilinçli olarak KOPYALANMIYOR: orijinalde tamamlanmış bir
    // adım, yeni kullanıcı için henüz yapılmamıştır.
    const { data: sourceMicroGoals } = await supabaseAdmin
      .from('micro_goals')
      .select('title, order_index')
      .eq('goal_id', goalId)
      .order('order_index', { ascending: true })

    let microGoals = []
    if (sourceMicroGoals && sourceMicroGoals.length > 0) {
      const microGoalRows = sourceMicroGoals.map((m) => ({
        goal_id: cloned.id,
        title: m.title,
        order_index: m.order_index,
      }))
      const { data: insertedMicroGoals, error: microError } = await supabaseAdmin
        .from('micro_goals')
        .insert(microGoalRows)
        .select('*')

      if (microError) {
        // create.js'deki roadmap hatasıyla aynı yaklaşım: ana vizyon zaten
        // oluşturuldu, Yol Haritası kopyalanamadı diye tüm işlemi geri
        // almıyoruz — sadece logluyoruz, kullanıcı isterse kendi ekler.
        console.error('goals/clone micro_goals insert error:', microError)
      } else {
        microGoals = insertedMicroGoals || []
      }
    }

    // Vizyon Slaytları (goal_slides) — video kullanan vizyonlarda slayt
    // olmaz, video yoksa slaytları da kontrol ediyoruz. source_slide_id
    // KASITLI OLARAK set edilmiyor: o alan handle_slide_save trigger'ıyla
    // "orijinal slaytın saves_count'unu artır" anlamına gelir (bkz.
    // slides/create.js) — burada goals.source_goal_id ile üst seviyede
    // zaten orijinale bağlıyız, slayt seviyesinde ayrı bir sayaç artışı
    // istemiyoruz.
    let slides = []
    if (!fullSourceGoal.vision_video_url) {
      const { data: sourceSlides } = await supabaseAdmin
        .from('goal_slides')
        .select(
          'image_url, caption, duration_seconds, order_index, ' +
          'caption_font, caption_color, caption_position, caption_x, caption_y, caption_size'
        )
        .eq('goal_id', goalId)
        .order('order_index', { ascending: true })

      if (sourceSlides && sourceSlides.length > 0) {
        const slideRows = sourceSlides.map((s) => ({
          goal_id: cloned.id,
          image_url: s.image_url,
          caption: s.caption,
          duration_seconds: s.duration_seconds,
          order_index: s.order_index,
          caption_font: s.caption_font,
          caption_color: s.caption_color,
          caption_position: s.caption_position,
          caption_x: s.caption_x,
          caption_y: s.caption_y,
          caption_size: s.caption_size,
        }))
        const { data: insertedSlides, error: slidesError } = await supabaseAdmin
          .from('goal_slides')
          .insert(slideRows)
          .select('*')

        if (slidesError) {
          console.error('goals/clone slides insert error:', slidesError)
        } else {
          slides = insertedSlides || []
        }
      }
    }

    return res.status(200).json({
      success: true,
      already_cloned: false,
      goal: { ...cloned, micro_goals: microGoals },
      slides,
    })
  } catch (error) {
    console.error('goals/clone error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
