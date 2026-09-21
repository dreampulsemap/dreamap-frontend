import { google } from 'googleapis'

// Google Play Developer API (androidpublisher) için servis hesabı istemcisi.
//
// KURULUM:
//   1) Google Cloud Console'da (Play Console ile aynı projede) bir servis
//      hesabı oluştur, JSON key indir.
//   2) Play Console > Kullanıcılar ve izinler > Davet et: o servis hesabının
//      e-postasını ekle, en az "Finansal veriler, siparişler ve iptaller"
//      (view financial data, orders, cancellation survey responses) ve
//      "Uygulamayı yönet" altında ilgili uygulamaya erişim izni ver.
//   3) İndirilen JSON key dosyasının TÜM içeriğini tek satır olarak
//      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON env değişkenine koy (Vercel'de
//      "Environment Variables" altına yapıştır).
//   4) GOOGLE_PLAY_PACKAGE_NAME=io.lunosfer.dreamap olarak ekle
//      (build.gradle.kts'teki applicationId ile aynı).
const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'io.lunosfer.dreamap'

/** Servis hesabi anahtari yok/bozuk — kullanici hatasi degil, kurulum eksigi. */
export class BillingNotConfiguredError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BillingNotConfiguredError'
    this.code = 'billing_not_configured'
  }
}

/** Satin alma dogrulamasi su an mumkun mu? (Urun listesi cekmeden once bakilir.) */
export function isBillingConfigured() {
  return Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
}

let cachedClient = null

function getAndroidPublisher() {
  if (cachedClient) return cachedClient

  const rawCredentials = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!rawCredentials) {
    // Ayri bir hata sinifi: cagiran taraf bunu "gecici yapilandirma eksigi"
    // (503) olarak dondurup kullaniciya "satin alma henuz acik degil"
    // diyebilsin. Onceden duz Error firlatiyordu ve route 500 + ham mesaj
    // donuyordu; Android tarafinda bu "HTTP 500" olarak gorunuyor,
    // kullanici parasina ne oldugunu anlamiyordu.
    throw new BillingNotConfiguredError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON tanımlı değil')
  }

  let credentials
  try {
    credentials = JSON.parse(rawCredentials)
  } catch {
    // Vercel'e yapistirirken JSON bozulduysa (tirnak/satir sonu) burasi
    // patlar; ayni "yapilandirma eksik" sinifina sokuyoruz.
    throw new BillingNotConfiguredError('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON geçerli bir JSON değil')
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })

  cachedClient = google.androidpublisher({ version: 'v3', auth })
  return cachedClient
}

// Abonelik (Premium) satın alımının GÜNCEL durumunu Google'dan sorgular.
// subscriptions.get (v1) deprecated olduğu için subscriptionsv2 kullanılıyor.
// Dönüş: ham SubscriptionPurchaseV2 objesi (subscriptionState, lineItems[]...).
export async function getSubscriptionPurchase(purchaseToken) {
  const androidpublisher = getAndroidPublisher()
  const { data } = await androidpublisher.purchases.subscriptionsv2.get({
    packageName: PACKAGE_NAME,
    token: purchaseToken,
  })
  return data
}

// Tek seferlik ürün (Aura paketi) satın alımının durumunu sorgular.
// NOT: Google, RTDN tabanlı akışlar için daha yeni bir
// purchases.productsv2.getproductpurchasev2 uç noktasını öneriyor (2026
// dokümantasyonu). Bu, client-tetiklemeli doğrulama için de çalışan,
// yıllardır stabil olan klasik purchases.products.get. RTDN eklenirken
// (bkz. SETUP.md "Sonraki adım") productsv2'ye geçiş değerlendirilebilir.
// purchaseState: 0 = satın alındı, 1 = iptal, 2 = beklemede.
export async function getOneTimeProductPurchase(productId, purchaseToken) {
  const androidpublisher = getAndroidPublisher()
  const { data } = await androidpublisher.purchases.products.get({
    packageName: PACKAGE_NAME,
    productId,
    token: purchaseToken,
  })
  return data
}

// subscriptionState değerlerinden hangilerinin "erişimi var" saydığımızı
// tek yerde topluyoruz (ACTIVE + grace period — ödeme sorunu olsa da Play
// expiryTime'ı otomatik ileri öteliyor, bkz. Play dokümantasyonu).
const ACCESS_GRANTING_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
])

export function isSubscriptionActive(subscriptionPurchaseV2) {
  return ACCESS_GRANTING_STATES.has(subscriptionPurchaseV2?.subscriptionState)
}
