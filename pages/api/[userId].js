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
      .select('id, content, ai_image_url, ai_sentiment, ai_archetypes, likes_count, comments_count, created_at')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .eq('in_feed', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (dreamsError) throw dreamsError

    // Görüntüleyen kişi bu kullanıcıyı takip ediyor mu? (Follow butonunun
    // doğru durumda başlaması için)
    let friendshipStatus = null
    const viewer = await getAuthedUser(req)
    if (viewer && viewer.id !== userId) {
      const { data: friendship } = await supabaseAdmin
        .from('friendships')
        .select('status')
        .or(`and(user_id.eq.${viewer.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${viewer.id})`)
        .maybeSingle()
      friendshipStatus = friendship?.status || null
    }

    return res.status(200).json({
      profile,
      dreams: dreams || [],
      hasMore: (dreams || []).length === BATCH_SIZE,
      friendshipStatus,
      isSelf: viewer?.id === userId,
    })
  } catch (error) {
    console.error('public-profile error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
