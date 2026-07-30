import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const BATCH_SIZE = 12

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { userId, page = '0' } = req.query
    if (!userId) return res.status(400).json({ error: 'userId_required' })

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, bio')
      .eq('id', userId)
      .single()

    if (profileError || !profile) return res.status(404).json({ error: 'user_not_found' })

    const pageNum = Math.max(parseInt(page, 10) || 0, 0)
    const from = pageNum * BATCH_SIZE
    const to = from + BATCH_SIZE - 1

    // NOT: Basit tutuyoruz — burada yalnızca PUBLIC görünürlükteki rüyaları
    // gösteriyoruz. 'friends' görünürlüğündeki rüyalar için (goals/list.js'de
    // yaptığımız gibi) bir arkadaşlık kontrolü eklemek mümkün, ama dreams
    // tablosunun RLS/görünürlük davranışını bu konuşmada hiç incelemedik —
    // yanlış varsayımla gizlilik açığı açmaktansa güvenli tarafta kalıyoruz.
    const { data: dreams, error: dreamsError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, content, ai_image_url, ai_sentiment, ai_archetypes, likes_count, comments_count, created_at, premium_deep_analysis, premium_deep_analysis_status')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .eq('in_feed', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (dreamsError) throw dreamsError

    // Görüntüleyen kişi bu kullanıcıyı takip ediyor mu? (Follow butonunun
    // doğru durumda başlaması için)
    //
    // DÜZELTME: Önceki sorgu iki yönü TEK .or() + .maybeSingle() içinde
    // birleştiriyordu. Karşılıklı takipleşme durumunda (her iki yön de
    // kayıtlıyken) bu 2 satır döndürüyor ve .maybeSingle() hata fırlatıyordu
    // — bu da tüm endpoint'i çökertip profili "bulunamadı" gibi gösteriyordu,
    // oysa profil gerçekten vardı. Çökmediği durumlarda bile, karşı tarafın
    // seni takip etmesi, senin "Takip Et" butonunun yanlışlıkla "Takipte"
    // görünmesine (ve tıklanamaz kalmasına) yol açıyordu. Artık iki yönü tek
    // bir sorguda ama net bir şekilde ayrı ayrı okuyoruz.
    let friendshipStatus = null
    let followsViewer = false
    const viewer = await getAuthedUser(req)
    if (viewer && viewer.id !== userId) {
      const { data: rows } = await supabaseAdmin
        .from('friendships')
        .select('user_id, friend_id, status')
        .in('user_id', [viewer.id, userId])
        .in('friend_id', [viewer.id, userId])

      for (const row of rows || []) {
        if (row.user_id === viewer.id && row.friend_id === userId) {
          friendshipStatus = row.status
        }
        if (row.user_id === userId && row.friend_id === viewer.id && row.status === 'accepted') {
          followsViewer = true
        }
      }
    }

    return res.status(200).json({
      profile,
      dreams: dreams || [],
      hasMore: (dreams || []).length === BATCH_SIZE,
      friendshipStatus,
      followsViewer,
      isSelf: viewer?.id === userId,
    })
  } catch (error) {
    console.error('public-profile error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
