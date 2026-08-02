import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GÜVENLİK — Gumroad'ın klasik "Ping" bildirimi (Settings > Advanced'daki tek
// hesap-geneli Ping URL) isteği kriptografik olarak imzalamıyor: Stripe/GitHub
// tarzı bir X-Gumroad-Signature header'ı YOK. Bu, kütüphane/kod eksikliği değil,
// Gumroad'ın resmi belgelediği bir kısıt (gumroad.com/ping — payload sadece
// düz x-www-form-urlencoded, imza alanı listede yok). Doğrulanabilecek bir imza
// olmadığı için burada paylaşılan-sır (shared secret) yöntemi kullanılıyor:
// Gumroad'a tanımlanan Ping URL'sinin kendisine tahmin edilemez bir query
// parametresi gömülüyor; bu değeri bilmeyen hiçbir istek işlenmiyor.
//
// Kurulum:
//   1) Rastgele güçlü bir değer üret, örn: openssl rand -hex 32
//   2) Vercel + .env.local'e GUMROAD_WEBHOOK_SECRET=<o değer> olarak ekle
//   3) Gumroad > Settings > Advanced > Ping endpoint alanını şuna güncelle:
//      https://<domain>/api/gumroad-webhook?secret=<o değer>
const GUMROAD_WEBHOOK_SECRET = process.env.GUMROAD_WEBHOOK_SECRET

function isAuthorizedGumroadRequest(req) {
  // Secret tanımlı değilse fail-closed: hiçbir isteği kabul etme.
  if (!GUMROAD_WEBHOOK_SECRET) return false

  const provided = Array.isArray(req.query.secret) ? req.query.secret[0] : req.query.secret
  if (!provided) return false

  const providedBuf = Buffer.from(String(provided))
  const expectedBuf = Buffer.from(GUMROAD_WEBHOOK_SECRET)

  // Uzunluk eşleşmezse timingSafeEqual hata fırlatır; farklı uzunluk zaten
  // eşleşmeme anlamına geldiği için doğrudan false dönüyoruz.
  if (providedBuf.length !== expectedBuf.length) return false

  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

// İki ayrı Gumroad ürünü aynı hesap-geneli Ping URL'ine düşüyor, product_id'ye
// göre ayrıştırıyoruz:
//   - DEEP_ANALYSIS_PRODUCT_ID: tek seferlik satın alma, premium_analysis_auras'a kredi ekler (eski davranış, değişmedi)
//   - PREMIUM_PRODUCT_ID: "Lunosfer Premium" üyeliği (aylık/yıllık tekrarlayan), feature_entitlements'a
//     zaman sınırlı bir yetki yazar (bkz. MIGRATION_NOTES_pixabay_video.md)
const DEEP_ANALYSIS_PRODUCT_ID = process.env.GUMROAD_SINGLE_PRODUCT_ID
const PREMIUM_PRODUCT_ID = process.env.GUMROAD_PREMIUM_PRODUCT_ID

const PREMIUM_FEATURE_CODE = 'premium_membership'

// Gumroad'da "cancellation" gibi ayrı bir kayıt olayı için ek bir API kurulumu
// (access token + resource_subscription) gerekiyor — bunun yerine daha basit
// bir yöntem kullanıyoruz: her yenileme (recurring charge) ping'i ends_at'i
// bir sonraki döneme öteler. Kullanıcı iptal ederse yeni ping gelmez, ends_at
// geçmişte kalır ve premium kendiliğinden düşer. `refunded=true` gelirse de
// anında düşürüyoruz.
const GRACE_DAYS_BY_RECURRENCE = {
  monthly: 35,
  quarterly: 100,
  biannually: 190,
  yearly: 370,
  every_two_years: 735,
}

function graceDaysFor(recurrence) {
  return GRACE_DAYS_BY_RECURRENCE[recurrence] || 35
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''

    req.on('data', (chunk) => {
      data += chunk
    })

    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase()
}

// Premium ürün satışını/yenilemesini feature_entitlements'a işler.
// Dönüş değeri webhook_events.status'e yazılan kısa bir etiket.
async function handlePremiumSale({ profileId, payload, saleId, refunded, isTest }) {
  if (refunded) {
    await supabase
      .from('feature_entitlements')
      .update({ active: false, ends_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', profileId)
      .eq('feature_code', PREMIUM_FEATURE_CODE)
    return isTest ? 'test_premium_refunded' : 'premium_refunded'
  }

  const recurrence = payload.recurrence || 'monthly'
  const graceDays = graceDaysFor(recurrence)
  const saleTimestamp = payload.sale_timestamp ? new Date(payload.sale_timestamp) : new Date()
  const endsAt = new Date(saleTimestamp.getTime() + graceDays * 24 * 60 * 60 * 1000)

  const { data: existing, error: existingError } = await supabase
    .from('feature_entitlements')
    .select('id')
    .eq('user_id', profileId)
    .eq('feature_code', PREMIUM_FEATURE_CODE)
    .maybeSingle()

  if (existingError) throw existingError

  const row = {
    user_id: profileId,
    feature_code: PREMIUM_FEATURE_CODE,
    source_type: 'gumroad',
    source_ref: payload.subscription_id || saleId,
    plan_code: recurrence,
    limit_interval: null,
    limit_count: null,
    is_unlimited: true,
    active: true,
    starts_at: saleTimestamp.toISOString(),
    ends_at: endsAt.toISOString(),
    metadata: { last_sale_id: saleId, recurrence },
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await supabase.from('feature_entitlements').update(row).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('feature_entitlements').insert(row)
    if (error) throw error
  }

  return isTest ? 'test_premium_activated' : 'premium_activated'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAuthorizedGumroadRequest(req)) {
    console.warn(
      JSON.stringify({
        tag: 'gumroad_webhook_unauthorized',
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      })
    )
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const rawBody = await readRawBody(req)
    const params = new URLSearchParams(rawBody)
    const payload = Object.fromEntries(params.entries())

    const saleId = payload.sale_id || `test-${Date.now()}`
    const email = normalizeEmail(payload.email)
    const productId = payload.product_id || null
    const productName = payload.product_name || null
    const permalink = payload.product_permalink || null
    const refunded = payload.refunded === 'true' || payload.refunded === '1'
    const isTest = payload.test === 'true' || payload.test === '1'

    // DİNAMİK AURA HESAPLAMA (X Dolar Ödeme = X Aura) — sadece deep-analysis ürünü için
    const amountInCents = payload.amount
      ? Number(payload.amount)
      : (Number(payload.price || 0) * Number(payload.quantity || 1))

    let calculatedAuras = Math.floor(amountInCents / 100)
    if (isTest && calculatedAuras === 0) {
      calculatedAuras = 10
    }

    console.log(
      JSON.stringify(
        { tag: 'gumroad_webhook_received', saleId, email, productId, productName, permalink, refunded, isTest, amountInCents, calculatedAuras, payload },
        null,
        2
      )
    )

    const { data: existingSale, error: existingSaleError } = await supabase
      .from('gumroad_webhook_events')
      .select('sale_id, auras_added, status')
      .eq('sale_id', saleId)
      .maybeSingle()

    if (existingSaleError) {
      console.error('gumroad existing sale lookup failed', existingSaleError)
      return res.status(500).json({ error: 'existing_sale_lookup_failed', details: existingSaleError.message })
    }

    if (existingSale) {
      return res.status(200).json({ ok: true, duplicate: true, saleId, status: existingSale.status })
    }

    // Hangi üründen geldiğine göre ayrıştır. İkisiyle de eşleşmeyen her şey
    // eskisi gibi loglanıp yok sayılıyor.
    const isDeepAnalysisSale = DEEP_ANALYSIS_PRODUCT_ID && productId === DEEP_ANALYSIS_PRODUCT_ID
    const isPremiumSale = PREMIUM_PRODUCT_ID && productId === PREMIUM_PRODUCT_ID

    if (!isDeepAnalysisSale && !isPremiumSale) {
      const { error: ignoredInsertError } = await supabase
        .from('gumroad_webhook_events')
        .insert({
          sale_id: saleId,
          email: email || null,
          product_id: productId,
          product_name: productName,
          product_permalink: permalink,
          raw_payload: payload,
          user_profile_id: null,
          auras_added: 0,
          status: 'ignored_product_not_matched',
        })

      if (ignoredInsertError) {
        console.error('gumroad ignored sale insert failed', ignoredInsertError)
        return res.status(500).json({ error: 'ignored_sale_insert_failed', details: ignoredInsertError.message })
      }

      return res.status(200).json({ ok: true, ignored: true, reason: 'product_not_matched', productId })
    }

    let userProfileId = null
    let aurasAdded = 0
    let status = 'received'

    if (email) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, premium_analysis_auras')
        .ilike('email', email)
        .maybeSingle()

      if (profileError) {
        console.error('gumroad profile lookup failed', profileError)
        return res.status(500).json({ error: 'profile_lookup_failed', details: profileError.message })
      }

      if (profile) {
        userProfileId = profile.id

        if (isDeepAnalysisSale) {
          if (!refunded) {
            const nextAuras = Number(profile.premium_analysis_auras || 0) + calculatedAuras
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ premium_analysis_auras: nextAuras })
              .eq('id', profile.id)

            if (updateError) {
              console.error('gumroad aura bakiye update failed', updateError)
              return res.status(500).json({ error: 'aura_update_failed', details: updateError.message })
            }

            aurasAdded = calculatedAuras
            status = isTest ? 'test_aura_added' : 'aura_added'
          } else {
            status = isTest ? 'test_refunded_ignored' : 'refunded_ignored'
          }
        } else if (isPremiumSale) {
          try {
            status = await handlePremiumSale({ profileId: profile.id, payload, saleId, refunded, isTest })
          } catch (premiumError) {
            console.error('gumroad premium entitlement update failed', premiumError)
            return res.status(500).json({ error: 'premium_entitlement_failed', details: premiumError.message })
          }
        }
      } else {
        status = isTest ? 'test_no_user_match' : 'pending_user_match'
      }
    }

    const { error: insertSaleError } = await supabase
      .from('gumroad_webhook_events')
      .insert({
        sale_id: saleId,
        email: email || null,
        product_id: productId,
        product_name: productName,
        product_permalink: permalink,
        raw_payload: payload,
        user_profile_id: userProfileId,
        auras_added: aurasAdded,
        status,
      })

    if (insertSaleError) {
      console.error('gumroad sale insert failed', insertSaleError)
      return res.status(500).json({ error: 'sale_insert_failed', details: insertSaleError.message })
    }

    return res.status(200).json({ ok: true, saleId, email, productId, status, aurasAdded, isTest })
  } catch (error) {
    console.error('gumroad webhook fatal', error)
    return res.status(500).json({ error: 'internal_server_error', details: error.message || 'Unknown error' })
  }
}
