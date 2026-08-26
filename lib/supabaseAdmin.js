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
    // DÜZELTME: .maybeSingle() karşılıklı takipleşmede (iki yön de
    // 'accepted') 2 satırla karşılaşıp hata veriyordu; hata yakalanmadığından
    // 'friendship' sessizce undefined kalıyor ve mutual-friend erişimi
    // yanlışlıkla reddediliyordu.
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('id')
      .or(`and(user_id.eq.${viewerId},friend_id.eq.${goal.user_id}),and(user_id.eq.${goal.user_id},friend_id.eq.${viewerId})`)
      .eq('status', 'accepted')
      .limit(1)
    return { allowed: !!(friendships && friendships.length > 0), goal }
  }

  return { allowed: false, goal } // 'private'
}

// Günce (diary) feed'i ve tekil-kullanıcı görüntüleyicisi ikisi de "kabul
// edilmiş arkadaşlarım kimler" bilgisine ihtiyaç duyuyor — canViewGoal'daki
// aynı .or() desenini burada tek yerde topluyoruz. DB tarafında aynı mantığı
// yapan bir is_accepted_friend(a,b) SQL fonksiyonu da var (RLS policy'si
// için) ama admin client zaten RLS'i bypass ettiğinden, tutarlılık için
// diğer route'larla aynı JS-taraflı deseni kullanıyoruz.
export async function getAcceptedFriendIds(userId) {
  if (!userId) return []
  const { data } = await supabaseAdmin
    .from('friendships')
    .select('user_id, friend_id')
    .eq('status', 'accepted')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
  return (data || []).map((f) => (f.user_id === userId ? f.friend_id : f.user_id))
}

// 013_profile_visibility_and_post_clamp.sql — profil gizliliğine göre bir
// paylaşımın (dream/goal/diary) istenen gizliliğini kısıtlar. Aynı kuralı DB
// trigger'ı da uyguluyor (dreams tablosu API'yi bypass eden client-side
// insert'lere açık olduğu için o nihai güvence); burada API seviyesinde de
// uygulamak, istemciye net/tutarlı bir sonuç döndürebilmek içindir —
// sessizce farklı bir değerle DB'ye düşüp istemcinin haberi olmamasındansa,
// API'nin döndürdüğü satırda da aynı kısıtlı değeri görsün isteriz.
export async function clampVisibilityToProfile(userId, requestedVisibility) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('profile_visibility')
    .eq('id', userId)
    .maybeSingle()

  const ownerVisibility = profile?.profile_visibility
  if (ownerVisibility === 'private') return 'private'
  if (ownerVisibility === 'friends' && requestedVisibility === 'public') return 'friends'
  return requestedVisibility
}
