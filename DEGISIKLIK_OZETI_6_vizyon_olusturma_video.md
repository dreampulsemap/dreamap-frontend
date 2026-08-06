# Değişiklik Özeti 6 — Vizyon Oluştururken Video + Kapak

## İstek
"İlk vizyon oluştururken" kapak seçimi, video editöründeki AYNI akışla
(çoklu görsel+video, cihaz+Pixabay) çalışsın. Seçilenler otomatik olarak
o vizyonun videosuna klip olsun. Kapak, videoya eklenen GÖRSELLER
arasından sonradan seçilsin.

## Neden büyük bir değişiklik oldu
`CreateGoalModal.jsx`'te yarım kalmış bir çoklu-görsel denemesi VARDI ama:
1. `PixabayPicker`'ı `onPickMultiple`/`multiple`/`maxSelectable` gibi hiç
   var olmayan prop'larla çağırıyordu (muhtemelen "seçim yapılamıyor"
   şikayetinin bir kısmı buradandı)
2. Seçilenleri video editörünün klip motoruna değil, artık kullanılmayan
   eski slayt sistemine (`goal_slides` / `/api/goals/slides/create`)
   ekliyordu

İkisini de kaldırıp video editörüyle aynı akışa geçirdim.

## Değişen/yeni dosyalar
- `components/CreateGoalModal.jsx` — YENİDEN YAZILDI: eski "kapak seç"
  bölümü kalktı, yerine `AddMediaMenu` + `PixabayPicker(multiSelect)` ile
  medya toplayan bir adım geldi. Form → medya seç → "Oluştur" → goal
  oluşur (kapaksız) → medya varsa Video Editörü açılır (`initialMedia`
  ile dolu) → editör kapanınca (kaydetmiş de olsa vazgeçmiş de olsa)
  videoya eklenen görseller arasından kapak seçilir.
- `components/CoverPickerModal.jsx` — YENİ: son adım. Cihazdan seçilip
  blob: URL olarak kalmış (henüz hiç yüklenmemiş) bir görsel kapak
  seçilirse, O AN `goal-covers` bucket'ına yüklenip kalıcı URL'e
  çevriliyor — yoksa cover_image_url sayfa kapanınca geçersiz bir blob:
  referansı olarak kalırdı. Pixabay'den gelenler zaten kalıcı, dokunulmuyor.
- `components/AddMediaMenu.jsx` — YENİ: "+ Ekle" menüsü VisionVideoEditor
  içinden çıkarılıp ayrı dosyaya taşındı (artık CreateGoalModal da
  kullanıyor). Stilleri BİLEREK scoped (`<style jsx>`, global değil) —
  VisionVideoEditor hiç mount olmamış olsa bile kendi başına çalışsın diye.
- `components/VisionVideoEditor.jsx` — yeni `initialMedia` prop'u: dolu
  gelirse editör boş değil, o klipler hazır halde açılıyor.
- `pages/api/goals/set-cover.js` — YENİ: `save-vision-video.js` ile
  birebir aynı sahiplik-kontrolü deseninde, `cover_image_url` güncelliyor.
  Daha önce oluşturma sonrası kapak değiştirmenin hiçbir yolu yoktu.

## Bilinçli sınırlama
Kapak seçeneği listesi, kullanıcının BAŞLANGIÇTA seçtiği görseller
(`pendingMedia`) — editör içindeyken ekleyip çıkardıklarını YANSITMIYOR
(motor iç klip listesini dışa açmıyor, bunu değiştirmek ayrı bir iş).
Pratikte büyük örtüşme olacaktır; rahatsız ederse ayrıca ele alırız.

## Test listesi
1. Yeni vizyon oluştur, hiç medya seçmeden "Oluştur" → eskisi gibi
   direkt kapanmalı, kapaksız goal oluşmalı.
2. Medya seç (cihaz görsel + video + Pixabay görsel + Pixabay video
   karışık) → "Oluştur" → Video Editörü dolu açılmalı, klip sayısı
   seçtiğinle eşleşmeli.
3. Videoyu kaydet → "Kaydedildi!" ekranını gör → X'e bas → kapak seçme
   ekranı açılmalı, sadece GÖRSELLER (video değil) listelenmeli.
4. Cihazdan seçtiğin bir görseli kapak yap → `goals` tablosunda
   `cover_image_url`'in gerçek bir Supabase Storage URL'i olduğunu
   doğrula (blob: DEĞİL).
5. Sadece video seçip görsel seçmeden devam et → editör kapanınca kapak
   ekranı hiç açılmadan direkt bitmeli (seçilecek görsel yok).
6. "Şimdilik Atla" → goal kapaksız kalmalı ama video/başlık/açıklama
   doğru kaydedilmiş olmalı.
