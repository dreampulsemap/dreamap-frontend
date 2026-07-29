# Pixabay Video + Premium Üyelik — Değişiklik Notları

## DB tarafı: ZATEN UYGULANDI ✅

Bu değişiklikleri doğrudan canlı Supabase projende uyguladım, elle bir şey
yapmana gerek yok:

- `image_library` tablosuna `media_type` kolonu eklendi (`'image'` / `'video'`),
  unique constraint `(source, media_type, source_id)` oldu
- `user_profiles` tablosuna `last_pixabay_video_pick_at` kolonu eklendi
  (ücretsiz kullanıcının haftalık video hakkını takip etmek için)
- `feature_entitlements` tablosu (zaten vardı, boştu) artık
  `premium_membership` kaydı için kullanılıyor

## Senin yapman gereken tek şey: env var

```
GUMROAD_PREMIUM_PRODUCT_ID=9v64qVSxAmuNrZJ8rty4SA==
```

Bu, test satışını yaptığında `gumroad_webhook_events` tablosundaki ham
payload'dan okuduğum gerçek Gumroad `product_id`'si (ürün: "Premium",
`elsuilgen.gumroad.com/l/dmtasl`). Vercel'e ve `.env.local`'e ekle.

`PIXABAY_API_KEY` hâlâ eklenmediyse (görsel özelliği için istenmişti) onu da
unutma.

## Nasıl çalışıyor

**Webhook (`/api/gumroad-webhook.js`):** artık iki ürünü ayırt ediyor:
- `GUMROAD_SINGLE_PRODUCT_ID` (Deep Analysis) → eskisi gibi aura kredisi ekliyor
- `GUMROAD_PREMIUM_PRODUCT_ID` (Premium) → `feature_entitlements`'a
  `premium_membership` kaydı yazıyor, `ends_at`'i satış anındaki `recurrence`
  değerine göre (aylık/yıllık) bir sonraki döneme ayarlıyor

**Otomatik düşme mantığı:** Gumroad'ın "cancellation" webhook'unu ayrıca kurmak
(access token + API kaydı gerektiriyor) yerine daha basit bir yöntem
kullandım: her yenileme ping'i `ends_at`'i öteler. Kullanıcı iptal ederse yeni
ping gelmez, süre dolunca (aylıkta ~35 gün grace period) premium kendiliğinden
düşer. `refunded=true` gelirse anında düşürülüyor. İleride gerçek zamanlı
iptal takibi istersen, Gumroad API üzerinden `resource_subscription`
(`cancellation`) kaydı açmamız gerekir — şimdilik bu kapsam dışı bıraktım.

**Video seçimi:**
- `/api/pixabay/search-videos.js` — arama proxy'si
- `/api/goals/add-video-from-pixabay.js` — asıl erişim kontrolü burada:
  premium değilse ve haftalık hakkı dolmuşsa 403 döner. Görsellerdeki gibi,
  aynı Pixabay videosu tekrar seçilirse yeniden indirilmiyor
  (`image_library`'de `media_type='video'` ile önbelleklendi)
- Video dosyaları `image-library` bucket'ında `pixabay-video/{id}.mp4` altında
  tutuluyor (ayrı bucket açmadım, mevcut bucket'ı paylaştırdım)
- İndirilen kalite Pixabay'in `small` kalitesi — storage maliyetini kontrol
  altında tutmak için `large` kasıtlı kullanılmadı, 60MB üstü reddediliyor

**UI:** `PixabayPicker.jsx`'e "Görseller / Videolar" sekmeleri eklendi.
Video sekmesinde premium değilsen ve haftalık hakkın dolmuşsa videolar kilitli
gösteriliyor, tıklayınca Premium'a yönlendiren bir not çıkıyor (asıl
güvenlik kontrolü sunucuda — burası sadece UX).

**Galeri gösterimi:** `gallery_image_urls` alanı hem görsel hem video URL'i
tutabiliyor artık (şema değişmedi, video dosyaları `.mp4` uzantısından
tanınıyor). `SlideEditor.jsx` / `SlidesViewer.jsx` henüz bu ayrımı yapmıyor —
yani vizyon slaytlarına bir video sürüklenirse düzgün görünmeyebilir. Bunu
istersen ayrı bir işte ele alalım, şimdilik kapsam dışı bıraktım.

## Fiyat/paket hatırlatması

"Premium" ürünü şu an tek başına sadece sınırsız video seçimi açıyor.
Konuştuğumuz gibi zamanla başka avantajlar (öncelikli özellik erişimi vb.)
eklendikçe ürün açıklamasını güncellemeyi unutma.
