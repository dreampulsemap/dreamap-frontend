import { supabaseAdmin, getAuthedUser, getAcceptedFriendIds } from '@/lib/supabaseAdmin'

// Instagram hikaye şeridinin veri kaynağı: "Sen" her zaman ilk sırada
// (girdin olmasa bile — boşsa DiaryStoryRow "+" ile ekleme davet eder),
// ardından girdisi görünür olan arkadaşlar, önce okunmamışlar. Kişi başına
// TEK satır (kaç girdi, en sonuncusu ne zaman, okundu mu) dönüyor — tam
// girdi listesi ayrı bir istekle (list-for-user) sadece o kişinin halkasına
// dokunulunca çekiliyor.
function dayKey(iso) {
  return new Date(iso).toISOString().slice(0, 10)
}

// Bugünden (ya da bugün hiç girdi yoksa dünden) geriye doğru art arda kaç
// gün en az bir girdi var — seri hâlâ "canlı" sayılır, tam bir gün
// atlanınca kopar.
function computeStreak(ownEntryDates) {
  if (ownEntryDates.length === 0) return 0
  const days = new Set(ownEntryDates.map(dayKey))
  const cursor = new Date()
  if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  try {
    const user = await getAuthedUser(req)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const friendIds = await getAcceptedFriendIds(user.id)
    const relevantIds = [user.id, ...friendIds]

    const { data: entries, error } = await supabaseAdmin
      .from('diary_entries')
      .select('id, user_id, visibility, created_at')
      .in('user_id', relevantIds)
      .order('created_at', { ascending: false })

    if (error) throw error

    const { data: views } = await supabaseAdmin
      .from('diary_views')
      .select('owner_id, last_viewed_at')
      .eq('viewer_id', user.id)
      .in('owner_id', relevantIds)
    const lastViewedByOwner = Object.fromEntries((views || []).map((v) => [v.owner_id, v.last_viewed_at]))

    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', relevantIds)
    const profileById = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

    // Kişi başına grupla — arkadaşlar için 'private' görünürlüğündekiler
    // sayılmaz (kendi girdilerinde hepsi sayılır).
    const byUser = new Map()
    const ownDates = []
    for (const e of entries || []) {
      const isSelf = e.user_id === user.id
      if (isSelf) ownDates.push(e.created_at)
      else if (e.visibility === 'private') continue

      const bucket = byUser.get(e.user_id) || { count: 0, latestAt: null }
      bucket.count += 1
      if (!bucket.latestAt || e.created_at > bucket.latestAt) bucket.latestAt = e.created_at
      byUser.set(e.user_id, bucket)
    }

    const streakDays = computeStreak(ownDates)

    const friendRings = friendIds
      .filter((id) => byUser.has(id))
      .map((id) => {
        const bucket = byUser.get(id)
        const lastViewed = lastViewedByOwner[id]
        return {
          userId: id,
          username: profileById[id]?.username || null,
          displayName: profileById[id]?.display_name || null,
          avatarUrl: profileById[id]?.avatar_url || null,
          entryCount: bucket.count,
          latestEntryAt: bucket.latestAt,
          hasUnseen: !lastViewed || bucket.latestAt > lastViewed,
        }
      })
      .sort((a, b) => {
        if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1
        return new Date(b.latestEntryAt) - new Date(a.latestEntryAt)
      })

    const ownBucket = byUser.get(user.id) || { count: 0, latestAt: null }
    const ownLastViewed = lastViewedByOwner[user.id]
    const selfRing = {
      userId: user.id,
      username: profileById[user.id]?.username || null,
      displayName: profileById[user.id]?.display_name || null,
      avatarUrl: profileById[user.id]?.avatar_url || null,
      entryCount: ownBucket.count,
      latestEntryAt: ownBucket.latestAt,
      hasUnseen: ownBucket.count > 0 && (!ownLastViewed || ownBucket.latestAt > ownLastViewed),
      streakDays,
      isSelf: true,
    }

    return res.status(200).json({ rings: [selfRing, ...friendRings] })
  } catch (error) {
    console.error('diary/feed error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
