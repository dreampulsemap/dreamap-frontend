// Premium üyeler (isPremiumMember) Aura harcamadan AI-maliyetli özellikleri
// (derin analiz, kahin, zihin duvarı, görsel üretimi) kullanıyordu — HİÇBİR
// üst sınır yoktu. `feature_usage_monthly` tablosu + check/get/refund RPC'leri
// zaten vardı ama hiçbir route bunları çağırmıyordu (muhtemelen RPC'lerin
// auth.uid() kontrolü service-role çağrılarında hep 'unauthorized' patlıyordu
// — bkz. migration fix_feature_quota_rpc_auth_for_service_role). Bu dosya o
// altyapıyı gerçekten kullanan tek giriş noktası.
//
// Limit BİLİNÇLİ OLARAK cömert (organik kullanımın çok üstünde) — amaç
// normal premium kullanıcıyı hiç etkilememek, yalnızca sınırsız otomatik
// tekrar/kötüye kullanımı kapatmak. Sayı kolayca ayarlanabilir tek yer burası.
export const PREMIUM_MONTHLY_LIMIT = 40

export async function checkPremiumQuota(supabaseAdmin, userId, featureCode, limit = PREMIUM_MONTHLY_LIMIT) {
  const { data, error } = await supabaseAdmin.rpc('check_feature_quota', {
    p_user_id: userId,
    p_feature_code: featureCode,
    p_monthly_limit: limit,
  })
  if (error) throw error
  const row = data?.[0]
  return { allowed: !!row?.allowed, usedBonus: !!row?.used_bonus, remaining: row?.remaining ?? 0 }
}

export async function refundPremiumQuota(supabaseAdmin, userId, featureCode, usedBonus) {
  try {
    await supabaseAdmin.rpc('refund_feature_quota', {
      p_user_id: userId,
      p_feature_code: featureCode,
      p_used_bonus: !!usedBonus,
    })
  } catch (err) {
    // İade başarısız olsa bile asıl isteğin hata yanıtını bozmasın —
    // en kötü ihtimalle kullanıcı bir hak kaybeder, kritik değil.
    console.error('refundPremiumQuota error:', err.message)
  }
}
