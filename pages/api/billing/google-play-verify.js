import { getAuthedUser, supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  getSubscriptionPurchase,
  getOneTimeProductPurchase,
  isSubscriptionActive,
} from '@/lib/googlePlayBilling'
import {
  AURA_PACK_PRODUCT_IDS,
  PREMIUM_SUBSCRIPTION_PRODUCT_ID,
  auraCountForProductId,
} from '@/lib/googlePlayProducts'

const PREMIUM_FEATURE_CODE = 'premium_membership'

// Android tarafı satın alma tamamlandığında (BillingClient'ın
// PurchasesUpdatedListener'ı tetiklendiğinde) — ama acknowledge/consume
// ETMEDEN ÖNCE — bu endpoint'i çağırır. Biz Google'a sorup gerçekten
// geçerli olduğunu doğrulayıp Supabase'e yazdıktan SONRA, client BillingClient
// üzerinden acknowledgePurchase/consumePurchase'ı kendisi çağırır (bkz.
// BillingRepository.kt). Yani "yetkiyi ver" kısmı sunucuda, "Google'a
// tamamlandı de" kısmı client'ta — Google'ın da resmi olarak desteklediği
// bir bölünme (bkz. Play Billing dokümantasyonu, "Process purchases").
//
// purchaseType ayrımı: aura paketleri tek seferlik/tüketilebilir ürün,
// premium ise abonelik — Play tarafında ikisi ayrı API'lerden doğrulanıyor.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const user = await getAuthedUser(req)
  if (!user) return res.status(401).json({ error: 'unauthorized' })

  const { purchaseToken, productId, purchaseType } = req.body || {}

  if (!purchaseToken || !productId || !['subscription', 'aura_pack'].includes(purchaseType)) {
    return res.status(400).json({ error: 'invalid_request' })
  }

  // Ürün kimliği ile iddia edilen tip birbirini doğrulamıyorsa reddet —
  // client'ın yanlış/kötü niyetli tip göndermesine karşı ek bir kontrol.
  if (purchaseType === 'aura_pack' && !(productId in AURA_PACK_PRODUCT_IDS)) {
    return res.status(400).json({ error: 'unknown_aura_product' })
  }
  if (purchaseType === 'subscription' && productId !== PREMIUM_SUBSCRIPTION_PRODUCT_ID) {
    return res.status(400).json({ error: 'unknown_subscription_product' })
  }

  try {
    // İDEMPOTENCY: aynı purchaseToken ikinci kez gelirse (ör. Android'de ağ
    // hatası sonrası retry) tekrar aura eklemiyoruz / entitlement'ı
    // yeniden hesaplamıyoruz, önceki sonucu aynen döndürüyoruz.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('google_play_purchases')
      .select('status, auras_added, purchase_type')
      .eq('purchase_token', purchaseToken)
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      return res.status(200).json({ ok: true, duplicate: true, status: existing.status })
    }

    let status
    let aurasAdded = 0
    let rawResponse

    if (purchaseType === 'aura_pack') {
      const purchase = await getOneTimeProductPurchase(productId, purchaseToken)
      rawResponse = purchase

      // purchaseState: 0 = satın alındı, 1 = iptal edildi, 2 = beklemede.
      if (purchase.purchaseState !== 0) {
        status = 'not_purchased'
      } else {
        const auraCount = auraCountForProductId(productId)
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .select('premium_analysis_auras')
          .eq('id', user.id)
          .single()
        if (profileError) throw profileError

        const nextAuras = Number(profile.premium_analysis_auras || 0) + auraCount
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ premium_analysis_auras: nextAuras })
          .eq('id', user.id)
        if (updateError) throw updateError

        aurasAdded = auraCount
        status = 'aura_added'
      }
    } else {
      const subscription = await getSubscriptionPurchase(purchaseToken)
      rawResponse = subscription

      if (!isSubscriptionActive(subscription)) {
        status = 'subscription_not_active'
      } else {
        const lineItem = subscription.lineItems?.[0]
        const basePlanId = lineItem?.offerDetails?.basePlanId || 'unknown'
        const expiryTime = lineItem?.expiryTime || null

        const { data: existingEntitlement, error: entitlementLookupError } = await supabaseAdmin
          .from('feature_entitlements')
          .select('id')
          .eq('user_id', user.id)
          .eq('feature_code', PREMIUM_FEATURE_CODE)
          .maybeSingle()
        if (entitlementLookupError) throw entitlementLookupError

        const row = {
          user_id: user.id,
          feature_code: PREMIUM_FEATURE_CODE,
          source_type: 'google_play',
          source_ref: subscription.latestOrderId || purchaseToken,
          plan_code: basePlanId,
          limit_interval: null,
          limit_count: null,
          is_unlimited: true,
          active: true,
          starts_at: subscription.startTime || new Date().toISOString(),
          ends_at: expiryTime,
          metadata: { subscriptionState: subscription.subscriptionState, lineItem },
          updated_at: new Date().toISOString(),
        }

        if (existingEntitlement) {
          const { error } = await supabaseAdmin
            .from('feature_entitlements')
            .update(row)
            .eq('id', existingEntitlement.id)
          if (error) throw error
        } else {
          const { error } = await supabaseAdmin.from('feature_entitlements').insert(row)
          if (error) throw error
        }

        status = 'premium_activated'
      }
    }

    const { error: insertError } = await supabaseAdmin.from('google_play_purchases').insert({
      purchase_token: purchaseToken,
      product_id: productId,
      purchase_type: purchaseType,
      user_id: user.id,
      status,
      auras_added: aurasAdded,
      raw_response: rawResponse,
    })
    if (insertError) throw insertError

    return res.status(200).json({ ok: true, status, aurasAdded })
  } catch (error) {
    console.error('google-play-verify error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
