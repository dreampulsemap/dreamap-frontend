# Değişiklik Özeti — Kesif Boş Görünme Acil Düzeltmesi + Ana Sayfa Instagram-Tarzı Akış

Bu paket YİNE TAM SET (28 dosya) — önceki turlarda bazı dosyaların elle
taşırken atlandığını gördüğüm için artık her seferinde eksiksiz gönderiyorum.
Üzerine kopyala, GitHub'a push et, Vercel deploy'unu bekle.

## 0) AcİL: "Kesfette kesfedecek rüya yok" — bulundu, düzeltildi
Kök neden benim bir önceki turdaki migration'ımdaydı: geriye dönük tarama
kalıcı depoya HENÜZ taşınmamış (ama muhtemelen hâlâ çalışan) neredeyse TÜM
eski rüya görsellerini `needs_persist` işaretledi. Ben de Explore filtresini
`image_status = 'ok'` şartına bağlamıştım — yani onarım cron'u (günde sadece
birkaç tane) yetişene kadar Explore'un neredeyse tamamı boşaldı.

**Düzeltme (`pages/api/explore/feed.js`, `pages/api/home-feed.js`):**
Artık yalnızca kesin olarak `broken` (onarım denemeleri tükenmiş, gerçekten
kurtarılamayan) rüyalar gizleniyor. `needs_persist` olanlar — yani "muhtemelen
hâlâ çalışıyor ama kalıcı depoya kopyalanmadı" — ARTIK GİZLENMİYOR, olduğu
gibi gösteriliyor ve arka planda sessizce kalıcı hale getiriliyor.

**Backlog'u hızlıca eritmek için (`Yapmamız gereken ... anında indirip
kaydetmek` isteğine karşılık):**
- `pages/api/cron/repair-broken-images.js`: batch boyutu 6'dan 12'ye çıktı,
  artık `?limit=` ile (maks. 40) manuel tetiklenebiliyor.
- **YENİ `/gorseltamiri` admin sayfası** — CRON_SECRET'ini girip "Tümünü Onar"a
  basınca, backlog sıfırlanana kadar OTOMATİK olarak art arda batch'leri
  çalıştırır. Bunu deploy sonrası bir kez çalıştırman, eski görselleri
  hızlıca kalıcı depoya taşımanı sağlar (`analizetgulum.js` ile aynı desen).

## 1) Pixabay seçici nerede?
Kontrol ettim — `add-dream.js` kodda VAR ve önceki paketle birebir aynı.
Muhtemelen henüz deploy edilmemiş bir önceki teslimattı. Bu paketle birlikte
deploy edince görünecek.

## 2) Ana Sayfa — Instagram tarzı dikey akış + kart içi yatay kaydırma
Tamamen yeni bir mimari:

- **`pages/api/home-feed.js`** (YENİ): rüyalar + vizyonları TEK kronolojik
  listede birleştiren API. İki ayrı sayfalama imleci kullanıyor
  (dreamsBefore/visionsBefore) — tek imleç kullanılsaydı bir tür diğerini
  "aç bırakabilirdi" (ör. bir günde 50 rüya ama 2 vizyon varsa, vizyonlar
  hiç görünmeyebilirdi).

- **Filtre seçimi — sosyal medya davranış psikolojisi kararı**
  (`components/HomeFeedFilter.jsx`): Üstte her zaman görünen, tek dokunuşla
  değişen bir "pill" segment kontrolü — Tümü / Rüyalar / Vizyonlar.
  VARSAYILAN "Tümü": tek türe kilitli bir akış hızla tekdüzeleşip oturum
  süresini kısaltır; içerik çeşitliliği scroll'u sürdürme isteğinin temel
  itici gücüdür (Instagram/TikTok'un hiçbir akışı tek content-type'la
  başlamaz). Seçim sessionStorage'da kalıcı, ama her yeni/misafir kullanıcı
  karışık akışla başlıyor.

- **`components/DreamFeedCard.jsx`** (YENİ): ekranın çoğunu kaplayan görsel +
  altında rüya metni (Panel 1) → yana kaydırınca Jung analizi, varsa
  (Panel 2) → daha da yana kaydırınca derin analiz teaser'ı VEYA yoksa
  "+ Derin Rüya Analizi Ekle" CTA kartı (Panel son). Karta dokunmak tam
  deneyim için mevcut `DreamCard` modalını açıyor (yorum, paylaşım, satın
  alma akışı — hepsi zaten orada, tekrar yazmadım).

- **`components/VisionFeedCard.jsx`** (YENİ): birden fazla görseli olan
  vizyonlar Instagram'daki gibi yana kaydırılan bir galeri olarak gösteriliyor
  (`goal.gallery_image_urls` + `cover_image_url`). Dokunmak mevcut
  `GoalDetailModal`'ı açıyor.

- **`components/SwipePanels.jsx`** (YENİ): hem rüya kartının panelleri hem
  vizyonun çoklu görseli için ortak, native CSS scroll-snap tabanlı yatay
  kaydırma + alt nokta göstergeleri. Yeni bir kütüphane eklemedim.

- **`pages/index.js`**: baştan yazıldı — eski 3 sütunlu grid + sekme yapısı
  yerine tek sütun, dikey sonsuz kaydırma. Sağ altta rüya/vizyon oluşturma
  için yeni bir (+) FAB butonu ekledim (eskiden `showCreateGoal` state'i
  vardı ama tetikleyen bir buton yoktu, muhtemelen kullanılmıyordu).

## Test Notu
`npm install` + `npx next build` → **sıfır hatayla derlendi** (yeni
`/api/home-feed` ve `/gorseltamiri` dahil tüm 90+ route).

## Küçük bir not
Filtre çubuğunun `sticky` konumu (`top-14 sm:top-16`) Navbar yüksekliğine
göre tahmini — kendi ekranında bir-iki piksel oynatman gerekebilir.
