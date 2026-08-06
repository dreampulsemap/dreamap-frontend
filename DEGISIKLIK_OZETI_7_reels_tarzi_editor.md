# Değişiklik Özeti 7 — Video Editörü: Instagram Reels Tarzı UI/UX

## İstek
Video editörünün (`VisionVideoEditor.jsx`) arayüzü klasik masaüstü-editör
görünümündeydi. İstenen: Instagram'ın Reels oluşturucusu gibi — video tam
ekranı kaplasın, kontroller videonun üstüne yüzen katmanlar olarak binsin.

## Not: taban kodla çakışma ve birleştirme
Bu değişikliğin ilk turu, `components/AddMediaMenu.jsx`'in henüz ayrı bir
dosya olmadığı, `VisionVideoEditor.jsx`'in henüz `initialMedia` prop'unu
almadığı bir taban üzerine yazılmıştı. Aradan geçen sürede (bkz.
`DEGISIKLIK_OZETI_6_vizyon_olusturma_video.md`) proje tarafında şu ikisi
oldu:
1. `AddMediaMenu` `VisionVideoEditor.jsx` içinden çıkarılıp
   `components/AddMediaMenu.jsx`'e taşındı (artık `CreateGoalModal.jsx` da
   kullanıyor) — kendi `<style jsx>` (scoped, global değil) stiline sahip.
2. `VisionVideoEditor` yeni bir `initialMedia` prop'u aldı: vizyon oluşturma
   akışında önceden seçilmiş medyayla editörün dolu açılmasını sağlıyor.

İlk turdaki dosyayı olduğu gibi geri vermek bu ikisini sessizce SİLERDİ
(yerel/eski `AddMediaMenu` fonksiyonunu geri getirip yeni dosyayı devre dışı
bırakır, `initialMedia`'yı kaybederdi) — yani gerçek bir çalışma bozuşması
olurdu. Bu turda **taze yüklenen proje taban alınıp** Reels tasarımı onun
üzerine yeniden uygulandı; `AddMediaMenu` ayrımı ve `initialMedia` akışı
aynen korundu.

## Değişen dosyalar
- `components/VisionVideoEditor.jsx`
- `components/AddMediaMenu.jsx`

Başka hiçbir dosyaya dokunulmadı — `CreateGoalModal.jsx`, `PixabayPicker.jsx`,
`useModalA11y.js`, `uploadVisionVideo.js` vb. aynen bırakıldı, motor
davranışı (klip/kırpma/dışa aktarma) değiştirilmedi.

## Ne değişti — VisionVideoEditor.jsx

**1) Tam ekran vizör.** Ayrı `<header>` kaldırıldı; kapatma (X), hedef
başlığı ve "Kaydet" butonu artık `.vve-viewfinder`'ın üstüne binen
`.vve-float-topbar` (üstte karartma gradyanı ile). Alttaki transport
(oynat/duraklat, süre, en-boy oranı) aynı şekilde videonun altına biniyor.
`resizeStage()`'deki sabit boşluk düşümü küçültüldü — canvas artık ekranın
neredeyse tamamını kaplıyor.

**2) Sağda yüzen araç rayı + alttan açılan araç sayfası.** 4 sekme butonu
(Filtreler/Metin/Müzik/Ayarla, lucide ikonlu) videonun sağ kenarına yüzen
dikey bir raya taşındı. `.vve-side-panel` mobilde varsayılan ekran dışında;
bir rayı ikonuna dokununca alttan yukarı kayan bir sayfa (bottom sheet)
olarak açılıyor, kapatma tutamacı veya arka plana dokunma kapatıyor.
Masaüstünde (≥900px) her zaman sabit sağ sütun olarak kalıyor.

**3) Dokunarak oynat/duraklat + kısa yanıp sönen ikon.** Metne denk
gelmeyen bir vizör dokunuşu artık `togglePlay()` çağırıyor.
`VisionVideoPlayer.jsx`'teki (izleme tarafı) `.animate-tap-flash` deseni
editöre de uygulandı.

**4) İlerleme çizgisi**, **camsı (glass/blur) kontroller**, **gradyan
"Kaydet" butonu**, **yatay kaydırmalı filtre şeridi**, zaman çizelgesi
araç çubuğunda emoji yerine lucide ikonlar (`Plus`/`Scissors`/`Trash2`).
Kamera-vizörü köşe parantezleri kaldırıldı.

## Ne değişti — AddMediaMenu.jsx
Aynı Reels dili buraya da taşındı (bu dosya hem editörden hem
`CreateGoalModal`'dan açıldığı için ikisinde de tutarlı olsun diye):
emoji'ler yerine lucide ikonları (`Video`/`ImagePlus`/`Search`), her
seçenek artık gradyan ikon rozetiyle, üstte sürükleme tutamacı
(`.amm-handle`), dokunma geri bildirimi (`:active{scale(0.98)}`).
Kasıtlı olarak **scoped `<style jsx>`** ve kendi hardcoded renk paleti
korundu (dosyanın kendi yorumunda açıkladığı gibi: VisionVideoEditor hiç
mount olmamış olsa bile kendi başına çalışsın diye) — sadece
`VisionVideoEditor.jsx`'teki gradyanla aynı ton değerleri (fuchsia→mor→
cyan) kullanıldı, global `.vve-*` sınıflarına bağımlılık eklenmedi.

## Doğrulama
Bu ortamda `next dev`/`next build` çalıştırılamadı (paket kurulum ağı
kapalı). Her iki dosya TypeScript'in JSX parser'ıyla (`ts.transpileModule`,
sıfır diagnostic) ve `node --check` ile ayrı ayrı doğrulandı; motorun
aradığı 63 `id` ile JSX'teki tanımlar script'le birebir karşılaştırıldı
(fark yok). `initialMedia` prop'u ve `createVideoClipFromUrl`/
`createImageClip` çağrısı taze taban ile birebir aynı konumda ve aynı
biçimde korundu. Yine de gerçek tarayıcıda bir kere elle denenmesi
öneriliyor.
