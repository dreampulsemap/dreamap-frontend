# Değişiklik Özeti — Rüya Etiketleri, Pixabay Görsel Seçimi, Kesif Kalite Filtresi, Kırık Görsel Onarımı

Bu paket yalnızca DEĞİŞEN/YENİ dosyaları içerir. `dreamap-frontend-main/` altındaki
yapı proje köküne göre — üzerine kopyalayabilirsin. Ayrıca kök dizinde
`006_dream_tags_and_image_quality.sql` var, bunu Supabase SQL Editor'de
ÖNCE çalıştırman lazım (diğer her şey bu kolonlara bağımlı).

## 0) KÖK NEDEN — "Kesif ızgarasında kırık, DreamCard'da tıklayınca sağlam"

`pages/api/reanalyze-dreams.js`, rüya görselini hiç kalıcı depoya kopyalamadan
doğrudan `image.pollinations.ai`'ın CANLI/anlık-render URL'ini `ai_image_url`'e
yazıyordu. Bu servis statik bir dosya değil — her istekte yeniden render
ediyor. Kesif ızgarası aynı anda 15-20 görseli paralel istediğinde servis
bazılarında zaman aşımına uğruyor (kırık), ama tek bir kartı DreamCard'da
açtığında (tek istek, rekabet yok) aynı URL genelde sorunsuz yükleniyor.
Bu aynı zamanda "sonradan tamamen kırılma" raporunun da sebebi — hiçbir zaman
kalıcı bir kopya oluşmuyordu.

**Düzeltme:** Görsel üreten HER yol artık sonucu indirip kendi Supabase
Storage'ımıza (`dream-images` bucket) kopyalıyor, asla canlı/geçici bir URL'i
tekrar DB'ye yazmıyor. Persist başarısız olursa (nadir) rüya `image_status:
'needs_persist'` ile işaretleniyor ve otomatik onarım (madde 4) devreye giriyor.

## 1) Rüya Etiketleri (max 10)
- `006_dream_tags_and_image_quality.sql` — `dreams.tags text[]`, CHECK constraint (≤10)
- `components/TagInput.jsx` — YENİ: chip input, Enter/virgülle ekleme, Backspace ile silme
- `pages/add-dream.js` — DÜZENLENDİ: TagInput eklendi, insert payload'ına `tags` dahil edildi
- `components/dreams/DreamEditModal.jsx` — DÜZENLENDİ: aynı TagInput, düzenleme akışı için
  (NOT: bu modal şu an hiçbir sayfadan çağrılmıyor — bkz. madde 6)
- `pages/api/update-dream.js` — DÜZENLENDİ: `tags` whitelist'e eklendi, normalize ediliyor
  (küçük harf, tekrar temizleme, 10 sınırı, 30 karakter/etiket)

## 2) Pixabay'dan Görsel Seçimi (rüyalar için)
Goals akışındaki mevcut `cachePixabayImage`/`image_library` deseni aynen
kullanıldı — yeni bir Supabase tablosu/bucket GEREKMİYOR (goals için zaten
kurulmuş olmalı, bkz. MIGRATION_NOTES_pixabay.md).
- `pages/api/dreams/pixabay-image.js` — YENİ: dreamId İSTEMİYOR (rüya henüz
  oluşturulmadan önce de görsel seçilebilsin diye), `cachePixabayImage`'i
  çağırıp kalıcı URL döner.
- `pages/add-dream.js` — DÜZENLENDİ: mevcut `PixabayPicker` bileşeni
  (`videoEnabled={false}`) entegre edildi — kullanıcı kendi arama yapıp seçebiliyor.
- `components/dreams/DreamEditModal.jsx` — DÜZENLENDİ: aynı picker, mevcut görseli
  değiştirme/kaldırma.
- `pages/api/update-dream.js` — DÜZENLENDİ: `ai_image_url`/`image_source`/
  `image_width`/`image_height` whitelist'e eklendi.
- ÖNEMLİ FIX: `pages/api/reanalyze-dreams.js` artık `ai_image_url` DOLU olan
  rüyaların üzerine YAZMIYOR — kullanıcının Pixabay'de seçtiği görsel, teaser
  analiz tamamlandığında otomatik AI görseliyle EZİLMİYORDU (öncesinde ezerdi,
  bunu üretim akışına dokunurken fark edip düzelttim).

## 3) Kesif Kalite Filtresi
- `pages/api/explore/feed.js` — DÜZENLENDİ: hem havuz hem kuyruk sorgusuna
  `ai_image_url IS NOT NULL` + `image_status = 'ok'` filtresi eklendi.
  Ayrıca (yalnızca boyutu BİLİNEN, ör. Pixabay) görseller için min. 300px
  genişlik/yükseklik kontrolü. Görselsiz/düşük kaliteli rüyalar artık Explore'a
  hiç girmiyor (önceden metin-kartı olarak gösteriliyordu).

## 4) Kırık Görsel Onarımı (otomatik, AI ile yeniden üretim)
- `lib/imageUrlUtils.js` — YENİ: `isPersistedImageUrl()` — bir URL bizim
  Supabase Storage'ımızda mı diye bakan paylaşılan yardımcı.
- `lib/repairDreamImage.js` — YENİ: 3 kademeli onarım —
  1) kalıcı URL zaten var → HEAD ile doğrula, sorunsuzsa dokunma
  2) geçici bir URL var → indirip kalıcı depoya taşımayı dene (ucuz yol)
  3) hiçbiri işe yaramazsa → Pollinations ile YENİDEN ÜRET, sonucu DOĞRUDAN
     indirip kalıcı depoya yükle (kullandığın Pollinations önerisi, ama
     kök nedeni tekrar üretmemek için persist adımı ZORUNLU hale getirildi).
  5 denemeden sonra pes edip `image_status: 'broken'` yapıyor (sonsuza dek
  denemiyor).
- `pages/api/dreams/report-broken-image.js` — YENİ: istemci bir `<Image>`
  onError verdiğinde çağırır, onarımı ANINDA (await ile, fire-and-forget
  DEĞİL — Vercel serverless'ın yanıt sonrası arka plan çalışmayı garanti
  ETMEMESİ yüzünden; bu tam olarak önceki "eksik await" bildirim hatasıyla
  aynı tuzak, tekrar düşmemek için bilerek await'li tasarladım).
- `pages/api/cron/repair-broken-images.js` — YENİ: güvenlik ağı — kimse
  raporlamasa bile 'needs_persist'/'broken' işaretli rüyaları düzenli tarar.
- `vercel.json` — DÜZENLENDİ: günde 1 kez (`0 12 * * *`) tetikleniyor (Hobby
  plan sınırı — process-deep-analysis'teki gibi daha sık çalıştırmak istersen
  cron-job.org'u aynı `CRON_SECRET` ile bu endpoint'e bağlayabilirsin).
- `pages/api/generate-dream-image.js`, `pages/api/generate-deep-analysis.js`,
  `pages/api/cron/process-deep-analysis.js` — DÜZENLENDİ: persist sessizce
  başarısız olursa artık `image_status: 'needs_persist'` ile işaretleniyor
  (önceden sessizce geçici URL'e düşüp hiç işaretlenmiyordu).

## 5) Grid'de kırık, tıklayınca sağlam — çift savunma hattı
Kalite filtresi (madde 3) artık kırık/görselsiz rüyaları Explore'a hiç
sokmuyor, ama bir görsel sunucu tarafında sağlıklı görünüp CDN'de anlık bir
hata verirse diye ikinci bir savunma hattı eklendi:
- `components/ExploreImageTile.jsx` — YENİ: `<Image>` `onError` verirse bir
  kez cache-bypass ile yeniden dener, yine olmazsa metin karta zarifçe düşer
  VE `report-broken-image`'ı tetikler.
- `pages/explore.js` — DÜZENLENDİ: ızgaradaki satır-içi kırılgan blok
  `ExploreImageTile`'a taşındı.
- `components/DreamCard.jsx` — DÜZENLENDİ: aynı retry/rapor deseni + rüya
  etiketleri (#chip) gösterimi eklendi.

## 6) Bilmen gereken bir şey: DreamEditModal hiçbir yerden çağrılmıyor
Kod tabanını tararken fark ettim: `components/dreams/DreamEditModal.jsx` ve
`components/dreams/UserDreamList.jsx` şu an hiçbir sayfa tarafından import
edilmiyor — yani kullanıcının kendi rüyasını (içerik/etiket/görsel) düzenleyeceği
canlı bir UI yok, sadece `update-dream.js` API'si duruyor. Ben modalı
etiket+görsel düzenlemeyi destekleyecek şekilde güncelledim ama HERHANGİ bir
sayfaya bağlamadım (ör. DreamCard'a sahibiyse "Düzenle" butonu eklemek gibi
bir UX kararı gerektiriyor, kapsamı büyütmemek için sana bıraktım). İstersen
bir sonraki turda bağlarım.

## Test Notu
Bu ortamda `npm install` + `npx next build` çalıştırıldı — **sıfır hata ile
derlendi** (tüm sayfalar/API route'ları dahil). Gerçek bir Supabase/Vercel
runtime testi senin ortamında yapılmalı (özellikle Pixabay picker'ın
`PIXABAY_API_KEY` ve `image_library`/`image-library` bucket'ının goals için
zaten kurulu olduğunu varsayıyorum).
