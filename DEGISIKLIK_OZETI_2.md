# Değişiklik Özeti — Senkron Düzeltmesi + "Görsel Kayboluyor" Bug'ı + Profil Sertleştirmesi

Bu paket TAM SET — üzerine tekrar kopyalayınca hem eksik kalan dosyalar hem de
yeni düzeltmeler yerine oturuyor. SQL migration'ı zaten çalıştırdıysan tekrar
çalıştırmana gerek yok (idempotent, zararı olmaz).

## 0) Neden tekrar "senkron" gerekti
Yüklediğin dosyaları önceki teslimatla karşılaştırdım: `lib/imageUrlUtils.js`,
`lib/repairDreamImage.js`, `pages/api/cron/repair-broken-images.js`,
`pages/api/dreams/pixabay-image.js`, `pages/api/dreams/report-broken-image.js`
hâlâ hiç yoktu; `add-dream.js`, `explore.js`, `explore/feed.js`,
`reanalyze-dreams.js`, `update-dream.js`, `generate-dream-image.js`,
`generate-deep-analysis.js`, `cron/process-deep-analysis.js` de orijinal
(düzeltme öncesi) haline dönmüştü. Muhtemelen dosyaları elle taşırken bazıları
atlanmış. Bu paket artık TAM ve eksiksiz — GitHub'a push ettikten sonra tekrar
zip alıp yüklersen ben de senkronu doğrulayabilirim.

## 1) "Bu rüyanın açılınca görseli kayboluyor" — bulundu ve düzeltildi
Kök neden benim önceki düzeltimdeydi: `DreamCard.jsx`'te bir görsel 2 kez
yüklenemeyince onu SESSİZCE gizliyordum (hiçbir yer tutucu yoktu). Sunucu
tarafı filtre YENİ rüyalar için bunu önlüyor, ama bu düzeltmeden ÖNCE
oluşmuş, hâlâ onarım kuyruğuna girmemiş eski bir rüya açıldığında görsel
gerçekten kırık olduğu için 2 denemeden sonra hiçbir şey görünmüyordu.

**Yeni davranış (`DreamCard.jsx`):**
1. İlk hata → cache-bypass ile bir kez daha dener
2. O da olmazsa → ANINDA onarım ister (`report-broken-image`), kısa bir
   "Görsel onarılıyor..." spinner'ı gösterir
3. Onarım taze bir URL döndürürse → görseli o URL ile HEMEN gösterir
   (sayfayı yenilemeye gerek yok)
4. Onarım da başaramazsa → zarif bir "Görsel şu anda hazırlanıyor, birazdan
   tekrar dene" kartı gösterir — asla çıplak kaybolmaz

`lib/repairDreamImage.js` ve `report-broken-image.js` artık onarılan/onaylanan
URL'i de response'a ekliyor (`imageUrl`), bu sayede frontend anında
gösterebiliyor.

`ExploreImageTile.jsx`'e de aynı "onarım URL'i varsa doğrudan göster" iyileştirmesi
eklendi (zaten metin-kartına düşüyordu, kaybolma yoktu, ama artık mümkünse
gerçek görseli kurtarıyor).

## 2) Profil ızgarası hiç korumasızdı — düzeltildi
`pages/profile.js`'in kendi ızgarası (senin bahsettiğin sayfa) `onError`
DAHİ yoktu — bir görsel kırılırsa çıplak tarayıcı ikonu kalıcı kalırdı, tam
olarak en baştaki Kesif sorununun aynısı ama Kesif'teki filtre/koruma
olmadan. Yeni `components/ProfileDreamTile.jsx` aynı dayanıklılık desenini
(retry → onarım → zarif düşüş) uyguluyor, "Görsel Üret" CTA'sını sadece
gerçekten hiç görseli olmayan rüyalarda gösteriyor (kırık ama onarılabilir
olanlarda ücretli üretimi zorlamıyoruz — bizim hatamız için kullanıcıyı
ödemeye yönlendirmek doğru değil).

## Test Notu
`npm install` + `npx next build` — **sıfır hatayla derlendi**.

## Açık soru
Mesajındaki "Rüyaların şekli şemasıyla ilgili..." kısmı bende net değil —
kesilmiş görünüyor. Ne demek istediğini biraz açar mısın (ekran görüntüsü
varsa onu da atabilirsin)?
