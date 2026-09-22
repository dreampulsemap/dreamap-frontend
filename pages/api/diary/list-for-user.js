import { supabaseAdmin, getAuthedUser, getAcceptedFriendIds } from '@/lib/supabaseAdmin'
import { signDiaryMedia } from '@/lib/diaryMediaUrl'

// SlidesViewer'ın story görüntüleyicisi için veri kaynağı — tek bir
// kullanıcının GÖRÜNÜR günce girdilerini kronolojik sırayla (eskiden
// yeniye, Instagram'daki gibi) döner. goals/slides/list.js ile aynı desen:
// giriş opsiyonel (public profiller giriş yapmadan da görülebilir),
// görünürlük admin client RLS'i bypass ettiği için burada elle kontrol
// ediliyor.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'invalid_params' })

    const viewer = await getAuthedUser(req)
    const isSelf = viewer?.id === userId

    const { data: owner } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    if (!owner) return res.status(404).json({ error: 'user_not_found' })

    let allowedVisibility = ['public']
    if (isSelf) {
      allowedVisibility = ['public', 'friends', 'private']
    } else if (viewer) {
      const friendIds = await getAcceptedFriendIds(viewer.id)
      if (friendIds.includes(userId)) allowedVisibility = ['public', 'friends']
    }

    const { data: entries, error } = await supabaseAdmin
      .from('diary_entries')
      .select('id, media_type, media_url, poster_url, caption, goal_id, visibility, created_at, likes_count, comments_count')
      .eq('user_id', userId)
      .in('visibility', allowedVisibility)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Bug #13: görüntüleyenin bu girdileri beğenip beğenmediğini tek
    // sorguda çekip haritalıyoruz (her girdi için ayrı sorgu atmak yerine).
    let likedEntryIds = new Set()
    if (viewer && entries?.length) {
      const { data: likedRows } = await supabaseAdmin
        .from('diary_likes')
        .select('diary_entry_id')
        .eq('user_id', viewer.id)
        .in('diary_entry_id', entries.map((e) => e.id))
      likedEntryIds = new Set((likedRows || []).map((r) => r.diary_entry_id))
    }

    // Bir hedefe bağlı girdiler varsa, viewer'da "şu vizyona bağlı" çipini
    // gösterebilmek için başlıklarını da tek seferde çekelim.
    const goalIds = [...new Set((entries || []).map((e) => e.goal_id).filter(Boolean))]
    let goalTitleById = {}
    if (goalIds.length) {
      const { data: goals } = await supabaseAdmin.from('goals').select('id, title').in('id', goalIds)
      goalTitleById = Object.fromEntries((goals || []).map((g) => [g.id, g.title]))
    }

    const enrichedEntries = (entries || []).map((e) => ({
      ...e,
      goal_title: e.goal_id ? goalTitleById[e.goal_id] || null : null,
      is_liked: likedEntryIds.has(e.id),
    }))

    // Bucket private: saklanan public URL'ler artik calismaz, medyayi
    // burada kisa omurlu imzali URL'e ceviriyoruz. Gorunurluk filtresi
    // yukarida zaten uygulandigi icin yalnizca izin verilen girdiler
    // imzalaniyor.
    const signedEntries = await signDiaryMedia(enrichedEntries)

    return res.status(200).json({ owner, entries: signedEntries, isSelf })
  } catch (error) {
    console.error('diary/list-for-user error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
