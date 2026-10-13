# MANIFEST — Navbar'a "Uygulamayı indir" Butonu + /app Sayfası

Tarih: 13 Ekim 2026
Kapsam: lunosfer.com'un üst navbar'ında her durumda görünen bir
"Uygulamayı indir / Get the app" butonu. Bu sırada eskimiş "Çok Yakında"
akışı (indirme şeridi + /app sayfası) da düzeltildi; uygulama artık
Play Store'da yayında.

## Önceki durum

- Navbar'da gri, çerçeveli bir "Android" rozeti vardı; CTA gibi okunmuyordu.
- Giriş yapmış kullanıcıda dar ekranda (<640px) **hiç görünmüyordu**,
  sadece ⋮ menüsünün içindeydi.
- Android'deki indirme şeridi hâlâ "Android uygulaması geliyor → Detaylar"
  diyordu ve "Çok Yakında" yazan /app sayfasına gidiyordu.

## Yeni davranış

| Durum | Buton nerede |
|---|---|
| Giriş yapmamış (her genişlik) | Sol üstte altın dolgulu buton: mobilde "Uygulama", sm+ "Uygulamayı indir" |
| Giriş yapmış (her genişlik) | LUNOSFER yazısının hemen altında kompakt "⬇ UYGULAMA" rozeti |
| ⋮ menüsü | "Uygulamayı indir" satırı (artık her genişlikte) |

Giriş yapmışken sol sütunu mana/aura rozetleri dolduruyor (360px'te zaten
sınırda), sağ sütunu zil/avatar/⋮ — bu yüzden buton logonun altına indi.
Alt menüye eklenmedi: 5. öğe ortadaki + butonunun simetrisini bozuyordu.

Hedef platforma göre:
- **Android ve masaüstü** → doğrudan Play Store (utm_source=lunosfer_web,
  utm_medium=navbar / navbar_compact / menu / banner / app_page →
  Play Console > Edinme raporlarında hangi butonun kurulum getirdiği görünür).
- **iPhone/iPad** → /app (iOS sürümü yok; Play Store linki orada çıkmaz sokaktı).

## Dosyalar

- `lib/appLinks.js` (yeni) — Play Store URL'si, platform tespiti, hedef seçimi.
- `components/GetAppLink.jsx` (yeni) — tüm indirme linkleri; tıklamada PostHog'a
  `get_app_click { placement, platform }` gönderir.
- `components/Navbar.jsx` — gri "Android" rozeti → altın CTA + logonun altındaki rozet.
- `components/AppDownloadBanner.jsx` — CTA artık doğrudan Play Store; localStorage
  anahtarı `_v3`: "yakında" mesajını kapatmış olanlar "yayında" mesajını bir kez görür.
- `pages/app.js` — "Çok Yakında" → gerçek indirme sayfası (3 fayda, Google Play
  butonu; iPhone'da "Ana Ekrana Ekle" yönergesi). "ANDROİD" yazım hatası da düzeldi.
- `lib/i18n.js` — 11 dilde yeni `app.*` anahtarları; kullanılmayan
  `app.comingSoon*` anahtarları kaldırıldı.
- `lib/posthog-client.js` — `captureEvent()` yardımcısı.

## Doğrulama

- `next build` temiz.
- Playwright ile 360/390/1280px, giriş yapmış/yapmamış, tr/en/ru,
  Android/iOS/masaüstü ekran görüntüleri alındı; taşma yok.
- Linkler: Android/masaüstünde Play Store (+utm), iOS'ta /app.

## Bilinen, bu değişiklikle ilgisiz

- 360px'te mana 4 haneli olunca (ör. 1250) aura rozeti LUNOSFER yazısına
  birkaç piksel değiyor — önceden de böyleydi.
