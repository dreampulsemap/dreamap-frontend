# Google Play Billing — Kurulum Kontrol Listesi

Bu, kod tarafı tamamlandıktan sonra senin (kod dışında) yapman gereken adımların listesi.

## 1) Play Console'da ürünleri oluştur

Uygulama: `io.lunosfer.dreamap`

### Abonelik — Premium
- Ürün kimliği: `premium_membership`
- Base plan'lar (Play Console > Monetize > Products > Subscriptions):
  - `monthly` — aylık
  - `quarterly` — 3 aylık
  - `yearly` — yıllık
- Not: Gumroad tarafındaki `biannually` / `every_two_years` seçeneklerinin Play
  base plan olarak birebir karşılığı yok; başlangıç için üçü (aylık/3 aylık/
  yıllık) öneriyorum. İstersen sonradan başka base plan eklenebilir — kod
  tarafında yalnızca `PREMIUM_BASE_PLAN_TO_RECURRENCE` (googlePlayProducts.js)
  ve `BillingProductIds` (BillingModels.kt) güncellenmesi yeterli.

### Tek seferlik (tüketilebilir) — Aura paketleri
Play Console > Monetize > Products > In-app products, her biri ayrı ürün:
| Ürün kimliği | Aura | Öneri fiyat |
|---|---|---|
| `aura_pack_10` | 10 | $0.99 |
| `aura_pack_50` | 50 | $4.49 |
| `aura_pack_120` | 120 | $9.99 |
| `aura_pack_300` | 300 | $19.99 |

Fiyatlar öneridir, Play Console'da istediğin gibi belirleyebilirsin — kod
tarafında fiyat hardcode edilmiyor, Play'den dinamik çekiliyor.

## 2) Play Developer API için servis hesabı

1. Google Cloud Console'da (Play Console ile bağlı projede) bir servis hesabı
   oluştur, JSON key indir.
2. Play Console > Kullanıcılar ve izinler > Davet et: servis hesabının
   e-postasını ekle. En az şu izinleri ver:
   - Finansal veriler, siparişler ve iptaller (view financial data)
   - İlgili uygulamaya (Lunosfer/DreaMap) erişim
3. İndirdiğin JSON key dosyasının tüm içeriğini **tek satır** olarak kopyala.

## 3) Backend env değişkenleri (Vercel)

```
GOOGLE_PLAY_PACKAGE_NAME=io.lunosfer.dreamap
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<indirdiğin JSON key'in tamamı, tek satır>
```

## 4) Bağımlılığı yükle ve migration'ı çalıştır

```
npm install   # package.json'a eklenen googleapis'i çeker
```

`supabase/migrations/xxxx_google_play_purchases.sql` dosyasını proje
migration sıranıza göre yeniden adlandırıp uygulayın (Supabase CLI ya da
dashboard SQL editörü).

## 5) Test

- Play Console > Test edenler ayarlarından kendi Google hesabını "license
  tester" olarak ekle — gerçek para çekilmeden satın alma akışını test
  edebilirsin.
- Uygulamayı **internal testing** track'inden yükleyip test et (debug build +
  yerel APK'da genelde Billing çalışmaz, Play Store üzerinden dağıtılan bir
  build gerekir).

## Sonraki adım (bu turda yapılmadı)

Şu an satın alma doğrulaması yalnızca **client tetiklemeli**: satın alma
tamamlanınca Android `api/billing/google-play-verify`'ı çağırıyor. Bu, ana
akış için yeterli ama şu senaryoları kaçırır: kullanıcı Play Store'dan direkt
iptal ederse, ödeme gecikirse (grace period), ya da satın alma sonrası
uygulama satın alma tamamlanmadan kapanırsa (bu son durumu
`processExistingPurchases()` zaten bir sonraki açılışta yakalıyor).
Bunların hepsini otomatik yakalamak için **Real-time Developer
Notifications (RTDN)** eklenmesi öneriliyor — Play Console'da bir Pub/Sub
topic bağlanıp `pages/api/billing/google-play-rtdn.js` gibi bir webhook
eklenerek yapılır. İstersen bir sonraki adım olarak bunu ekleyebilirim.
