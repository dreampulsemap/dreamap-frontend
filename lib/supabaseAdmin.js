import { createClient } from '@supabase/supabase-js'

// Service-role istemci: RLS'i bypass eder, yalnızca sunucu tarafı (API route)
// kodunda kullanılmalı. Mevcut dosyalar bunu kendi içlerinde ayrı ayrı
// oluşturuyordu (8 kopya) — yeni goals/mana route'ları bu ortak istemciyi
// kullanıyor. Eski dosyalara dokunulmadı.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Authorization: Bearer <token> header'ından kullanıcıyı doğrular.
// Geçersizse null döner (çağıran taraf 401 dönmeli).
export async function getAuthedUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user || null
}

// Admin client RLS'i bypass ettiği için, görünürlük kontrolünü (public/friends/
// private) API route'larının kendisi yapmak zorunda. Bu, migration 003'teki
// goals_select_visible RLS policy'siyle aynı mantığı kod tarafında tekrarlar.
export async function canViewGoal(goalId, viewerId) {
  const { data: goal } = await supabaseAdmin
    .from('goals')
    .select('id, user_id, visibility, status')
    .eq('id', goalId)
    .single()

  if (!goal) return { allowed: false, goal: null }
  if (goal.visibility === 'public') return { allowed: true, goal }
  if (viewerId && viewerId === goal.user_id) return { allowed: true, goal }
  if (!viewerId) return { allowed: false, goal }

  if (goal.visibility === 'friends') {
    const { data: friendship } = await supabaseAdmin
      .from('friendships')
      .select('status')
      .or(`and(user_id.eq.${viewerId},friend_id.eq.${goal.user_id}),and(user_id.eq.${goal.user_id},friend_id.eq.${viewerId})`)
      .eq('status', 'accepted')
      .maybeSingle()
    return { allowed: !!friendship, goal }
  }

  return { allowed: false, goal } // 'private'
}
