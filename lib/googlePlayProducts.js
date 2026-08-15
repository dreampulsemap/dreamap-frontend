// Play Console'da oluşturulacak ürün kimlikleriyle BİREBİR aynı olmalı.
// Aura miktarı asla client'tan gelen değere güvenilerek değil, buradaki
// map'ten okunarak yazılır (client'ın "500 aura ekle" diye sahte istek
// atabilmesinin önüne geçer).
//
// Fiyatlar Play Console'da ayrıca girilir, burada yalnızca referans amaçlı
// yorum olarak tutuluyor. Web tarafındaki Gumroad ürünü $1 = 1 Aura oranında
// esnek miktar destekliyordu; Play'in tek seferlik ürünleri sabit fiyatlı
// olmak zorunda olduğu için sabit paketlere bölündü. Aşağıdaki fiyatlar bir
// ÖNERİDİR — Play Console'da nihai fiyatı sen belirlersin.
export const AURA_PACK_PRODUCT_IDS = {
  aura_pack_10: { auras: 10 },   // öneri: $0.99
  aura_pack_50: { auras: 50 },   // öneri: $4.49  (~%10 bonus)
  aura_pack_120: { auras: 120 }, // öneri: $9.99  (~%20 bonus)
  aura_pack_300: { auras: 300 }, // öneri: $19.99 (~%33 bonus)
}

// Play Console'da tek bir abonelik ürünü ("premium_membership"), altında
// birden fazla temel plan (base plan) olacak şekilde kurulmalı.
export const PREMIUM_SUBSCRIPTION_PRODUCT_ID = 'premium_membership'

// Play base plan id -> Gumroad tarafındaki 'recurrence' karşılığı.
// gumroad-webhook.js'teki GRACE_DAYS_BY_RECURRENCE ile aynı isimlendirme.
export const PREMIUM_BASE_PLAN_TO_RECURRENCE = {
  monthly: 'monthly',
  quarterly: 'quarterly',
  yearly: 'yearly',
}

export function auraCountForProductId(productId) {
  return AURA_PACK_PRODUCT_IDS[productId]?.auras ?? null
}
