import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

// GUVENLIK DUZELTMESI: bu route hicbir visibility (public/friends/private)
// kontrolu yapmadan herhangi bir id icin ruyayi donduruyordu - yani ruya
// id'sini bilen herkes private bir ruyayi okuyabiliyordu.
// Artik public olmayan ruyalar icin kimlik dogrulaniyor ve sadece sahibi
// erisebiliyor (friends gorunurlugu de simdilik sahiplik ile sinirli,
// ileride arkadaslik kontrolu eklenebilir).
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
    if (!user || user.id !== data.user_id) {
      return res.status(403).json({ error: 'not_visible' })
    }
  }

  const { goals, ...dream } = data
  dream.goal_title = goals?.title || null

  return res.status(200).json({ dream })
}
