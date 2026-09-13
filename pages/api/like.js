import { supabaseAdmin, getAuthedUser } from '@/lib/supabaseAdmin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// DUZELTME: dreams.likes_count sutunu artik burada elle senkronize ediliyor.
// Onceki kod bu sutunu hic guncellemiyor, sadece okuyordu — DB tarafinda
// otomatik bir trigger olmadigi icin sayac hep 0'da kaliyordu ve arayuzdeki
// iyimser (+1) guncelleme, API cevabiyla tekrar 0'a donuyordu.
async function syncLikesCount(dreamId) {
  const { count, error: countError } = await supabaseAdmin
    .from('likes')
    .select('id', { count: 'exact', head: true })
    .eq('dream_id', dreamId)

  if (countError) throw countError

  const realCount = count || 0

  const { error: updateError } = await supabaseAdmin
    .from('dreams')
    .update({ likes_count: realCount })
    .eq('id', dreamId)

  if (updateError) throw updateError

  return realCount
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = await getAuthedUser(req)
    const userId = user?.id
    // Android istemcisi gövdeyi snake_case (dream_id) ile gönderiyor, web
    // istemcisi camelCase (dreamId) — ikisini de kabul et. Bu alan adı
    // uyuşmazlığı yüzünden Android'den atılan HER beğeni 400 ile
    // başarısız oluyordu (iyimser +1 güncellemesi hemen 0'a geri dönüyordu).
    const dreamId = Number(req.body?.dreamId ?? req.body?.dream_id)

    if (!userId || !UUID_PATTERN.test(userId)) {
      return res.status(401).json({
        error: 'Invalid authenticated user',
        userIdType: typeof userId,
      })
    }

    if (!Number.isSafeInteger(dreamId) || dreamId <= 0) {
      return res.status(400).json({
        error: 'Invalid dreamId',
        receivedDreamId: req.body?.dreamId ?? null,
      })
    }

    if (req.method === 'POST') {
      const { error } = await supabaseAdmin
        .from('likes')
        .insert([{ user_id: userId, dream_id: dreamId }])

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Already liked' })
        }
        throw error
      }

      const count = await syncLikesCount(dreamId)

      return res.status(200).json({
        success: true,
        liked: true,
        count,
      })
    }

    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('dream_id', dreamId)

    if (error) throw error

    const count = await syncLikesCount(dreamId)

    return res.status(200).json({
      success: true,
      liked: false,
      count,
    })
  } catch (error) {
    console.error('Like error:', error)
    return res.status(500).json({
      error: error?.message || 'Failed to update like',
      code: error?.code || null,
    })
  }
}
