import { supabaseAdmin, getAuthedUser, getAcceptedFriendIds } from '@/lib/supabaseAdmin'

// GUVENLIK DUZELTMESI: bu route hicbir visibility (public/friends/private)
// kontrolu yapmadan herhangi bir id icin ruyayi donduruyordu - yani ruya
// id'sini bilen herkes private bir ruyayi okuyabiliyordu.
// Artik public olmayan ruyalar icin kimlik dogrulaniyor: sahibi her zaman
// erisebilir, 'friends' gorunurlugunde kabul edilmis arkadaslar da
// erisebilir (canViewGoal'daki ile ayni desen), 'private' ise sadece sahibi
// erisebilir.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id) {
    return res.status(400).json({ error: 'id zorunlu' })
  }

  // goals(title) - dreams.goal_id FK'sine dayanan bir PostgREST embed'i
  // (Faz 10). Sonucu duz alanlara (goal_title) indiriyoruz ki istemci
  // tarafinda ic ice bir nesneyle ugrasmaya gerek kalmasin.
  const { data, error } = await supabaseAdmin
    .from('dreams')
    .select('*, goals(title)')
    .eq('id', id)
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  if (!data) {
    return res.status(404).json({ error: 'dream_not_found' })
  }

  if (data.visibility && data.visibility !== 'public') {
    const user = await getAuthedUser(req)
    const isOwner = !!user && user.id === data.user_id

    let isAcceptedFriend = false
    if (!isOwner && user && data.visibility === 'friends') {
      const friendIds = await getAcceptedFriendIds(data.user_id)
      isAcceptedFriend = friendIds.includes(user.id)
    }

    if (!isOwner && !isAcceptedFriend) {
      return res.status(403).json({ error: 'not_visible' })
    }
  }

  const { goals, ...dream } = data
  dream.goal_title = goals?.title || null

  return res.status(200).json({ dream })
}
