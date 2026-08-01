import { supabaseAdmin } from '@/lib/supabaseAdmin'

// lib/premiumVideoStatus.js ile AYNI feature_code — Gumroad'daki "Lunosfer
// Premium" aboneliği webhook üzerinden (pages/api/gumroad-webhook.js,
// handlePremiumSale) buraya yazılıyor. Bu dosya, o aboneliğin Aura harcayan
// akışlarda (derin analiz, görsel üretimi) da tanınması için ortak bir
// kontrol noktası sağlar — premiumVideoStatus.js'e dokunulmadı, mantık
// burada tekrar edildi ki mevcut video akışı kırılmasın.
const PREMIUM_FEATURE_CODE = 'premium_membership'

// Aktif ve süresi dolmamış bir premium üyeliği var mı? ends_at NULL ise
// süresiz kabul edilir (webhook bunu is_unlimited satışlarda böyle yazıyor).
export async function isPremiumMember(userId) {
  if (!userId) return false

  const { data: entitlement } = await supabaseAdmin
    .from('feature_entitlements')
    .select('active, ends_at')
    .eq('user_id', userId)
    .eq('feature_code', PREMIUM_FEATURE_CODE)
    .maybeSingle()

  return !!(entitlement?.active && (!entitlement.ends_at || new Date(entitlement.ends_at) > new Date()))
}

// Premium üye için Aura harcanmadığında, yanıtta yine de güncel bakiyeyi
// dönebilmek için (frontend state'i sıfırlamasın diye).
export async function getAuraBalance(userId) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('premium_analysis_auras')
    .eq('id', userId)
    .maybeSingle()

  return profile?.premium_analysis_auras || 0
}
