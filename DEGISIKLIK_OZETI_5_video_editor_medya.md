# Değişiklik Özeti 5 — Video Editöründe Görsel + Pixabay

## İstek
Video editöründe (`VisionVideoEditor.jsx`) sadece cihazdan video ekleme vardı.
İstenen: cihazdan görsel ekleme + Pixabay'den görsel ve video ekleme.

## Değişen dosya
- `components/VisionVideoEditor.jsx` (tek dosya, +369/-55 satır)

Başka hiçbir dosyaya dokunulmadı. Yeni Supabase tablosu/kolonu, yeni env var,
yeni migration YOK — hepsi zaten var olan altyapıyı kullanıyor:
- `components/PixabayPicker.jsx` (değişmedi, olduğu gibi kullanıldı)
- `/api/pixabay/import-image`, `/api/pixabay/import-video` (goal'dan bağımsız,
  daha önce eski `SlideEditor.jsx`'te kullanılan endpoint'ler — değişmedi)
- `/api/user/premium-status` (değişmedi)

## Ne değişti

**1) Klip motoru artık `type: 'video' | 'image'`'a duyarlı.**
Motor tamamen `<video>` elementine göre yazılmıştı (oynatma, seek, sıradaki
klibe geçiş, canvas çizimi, thumbnail, ses grafiği). Görsel klipler için:
- `<img>` elementi kullanan ayrı bir fabrika (`createImageClip`) eklendi
- Oynatma sırasında playhead'i `<video>.currentTime` yerine duvar saatiyle
  (`performance.now`) ilerleten bir mekanizma eklendi (`startImageClipClock`)
- `drawFrame`/`drawCover`/`tick`/`play`/`advanceToNext`/`seekGlobal`/
  `removeClip`/`splitAtPlayhead` tipe göre dallandırıldı
- Görsel klipler varsayılan **5 sn** gösterilir, mevcut kırpma tutamaçlarıyla
  (timeline'da sürükleyerek) **1–30 sn** arası uzatılıp kısaltılabilir — bunun
  için `trimStart/trimEnd/speed` alanları video ile birebir aynı tutuldu, yani
  `recalcTimeline()` hiç değişmeden çalışıyor
- "Ayarla" panelinde görsel seçiliyken hız/ses yerine "Süre" kaydırıcısı çıkar
- Dışa aktarma (export) canlı oynatmayı kaydettiği için ayrı bir iş
  gerekmedi — motor doğru çalışınca görsel klipler otomatik dahil oluyor

**2) "+ Ekle" tıklanınca 3 seçenekli menü açılıyor** (kullanıcı tercihiyle:
tek buton → menü, ayrı ayrı 3 buton değil):
- Cihazdan Video (mevcut akış, değişmedi)
- Cihazdan Görsel (yeni `#vve-imageFileInput`, `accept="image/*"`)
- Pixabay'den Ara (mevcut `PixabayPicker` açılıyor, `videoEnabled` default
  `true` olduğu için hem görsel hem video sekmesi görünür)

Menü (`AddMediaMenu`) ve `PixabayPicker` bilerek gerçek React component
olarak JSX'te render ediliyor (motorun geri kalanı gibi düz DOM değil) —
`useModalA11y`'nin modal-stack'ine düzgün katılıp Escape/geri tuşunun
sadece en üstteki modalı kapatması için. Motor ile bu React parçaları
arasında `bridgeRef` köprü görevi görüyor.

Sürükle-bırak (`onViewfinderDrop`) artık görselleri de kabul ediyor.

**3) Pixabay'den video seçimi, goal galerisindeki haftalık ücretsiz hak
sınırıyla ORTAK** — kasıtlı, aynı maliyetli kaynağı (indirip storage'a
kaydetme) paylaştıkları için. `import-video.js` zaten bu kontrolü kendi
içinde yapıyor, video editörü sadece aynı endpoint'i çağırıyor.

## Test listesi
- Cihazdan görsel ekle → klip 5 sn olarak timeline'a düşüyor mu
- Görsel klibi trim tutamaçlarıyla uzat/kısalt → "Ayarla"daki süre etiketiyle
  eşleşiyor mu
- Görsel + video karışık bir timeline'da oynat → geçişler pürüzsüz mü
- Görseli böl (Böl butonu) → iki parça, farklı filtre uygulanabiliyor mu
- Pixabay'den görsel ve video ekle → ikisi de klip olarak düşüyor, galeriye
  eklenmiyor (GoalDetailModal > Galeri'de görünmemeli)
- Ücretsiz kullanıcıyla haftalık Pixabay video hakkını tükettikten sonra hem
  galeriden hem video editöründen deneyip aynı kilidi görüyor musun
- Dışa aktar → görsel klip(ler) dahil final videoda görünüyor mu
- "+ Ekle" menüsünü aç, Pixabay'e geç, ikisini de Escape ile kapat → video
  editörünün kendisi kapanmamalı (useModalA11y'deki güncel stack mantığı)
