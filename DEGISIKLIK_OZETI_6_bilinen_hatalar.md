# Değişiklik Özeti 6 — Bilinen 3 Hatanın Düzeltilmesi + Ek Bulgular

Bu paket `__43_.zip` baz alınarak hazırlandı. 7 dosya değişti (6 düzenlendi,
bu özet yeni eklendi) — üzerine kopyalayabilirsin.

## İstek
Bir önceki turda `DreamGlobe.jsx`, `DeepAnalysisConfirmationModal.jsx`,
`ErrorState.jsx` ve `DeepAnalysisCarouselModal.jsx` başka sebeplerle
düzenlenmiş ama 3 bilinen hata (gradient-text, text-body-sm,
useModalA11y) atlanmıştı. Üçü de kodda doğrulandı ve düzeltildi.

## 1) `gradient-text` tanımsızdı — düzeltildi (5 yer, 4 dosya)
`globals.css`'te yalnızca `.gold-gradient-text` tanımlı; bare
`gradient-text` hiçbir yerde yoktu — derlenince hiç CSS üretmiyordu, yani
o başlıklar altın parıltısı olmadan düz metin rengiyle görünüyordu.

- `DreamGlobe.jsx` — 2 yer (kolektif kehanetler paneli başlığı, kehanet
  detay modalı başlığı)
- `DeepAnalysisConfirmationModal.jsx` — onay modalı başlığı
- **Bildirilenin dışında bulundu:** `pages/explore.js` (Keşfet sayfa
  başlığı) ve `pages/profile.js` (Profili Düzenle modal başlığı) — aynı
  hata, aynı kök neden.

Hepsi `gold-gradient-text`'e çevrildi — kod tabanındaki tek gerçek
gradient-metin class'ı, zaten `Hero.jsx`/`Navbar.jsx`/`DailyCompass.jsx`/
`ProfileHeader.jsx`'te kullanılıyor.

## 2) `text-body-sm` kırıktı — düzeltildi, + 3 kardeş token
`DESIGN_SYSTEM.md` bunu zaten belgeliyor (§2, §12 madde 2): tanımlı bir
tipografi ölçeği hiç yoktu. Kodda referans verilen 4 token da (`text-h1`,
`text-h3`, `text-body-sm`, `text-label`) hiçbir font-size üretmiyordu:

- `text-body-sm` → `ErrorState.jsx`, `EmptyState.jsx`
- `text-h3` → `EmptyState.jsx`
- `text-h1` → `pages/vision-board.js`
- `text-label` → `ErrorState.jsx`, `EmptyState.jsx`

`tailwind.config.js`'e SADECE bu 4 token eklendi (mevcut kullanımlarla
tutarlı değerlerle: h1=text-3xl, h3=text-lg, label=text-sm,
body-sm=text-xs/sm arası). `DESIGN_SYSTEM.md`'nin bahsettiği TAM ölçek
(display/h2/caption dahil) bilerek eklenmedi — bu ayrı, kendi başına bir
ürün kararı gerektiriyor.

**Bonus bulgu:** `EmptyState.jsx`'teki aksiyon butonu
`from-brand-primary to-brand-secondary` kullanıyordu — ama
`brand.primary`/`brand.secondary` shade nesneleri, tek renk değil;
shade numarası olmadan bu class'lar da hiç üretilmiyordu (buton
gradyansız kalıyordu). `-500` shade'i eklendi.

## 3) `DeepAnalysisCarouselModal.jsx` hâlâ `useModalA11y`'ye bağlı değildi — düzeltildi
`StoryModeModal.jsx` ile birebir aynı `isOpen`/`premiumAnalysis` guard
desenini kullandığı için aynı çağrı biçimi uygulandı: hook,
early-return'den ÖNCE (hooks kuralları gereği) `isOpen ? onClose : null`
ile çağrılıyor — kapalıyken Escape/geri tuşu devre dışı kalıyor. `ref`
gerçek modal panele bağlandı (kapatma butonu onun içinde — ilk
odaklanabilir eleman olarak açılışta otomatik focus alacak).

**Not:** `lib/useModalA11y.js`'nin kendisi `__40_` ile `__43_` arasında
değişmiş (iç içe modal geçişinde geri tuşu yarış durumu düzeltmesi) —
public API (`useModalA11y(containerRef, onClose)`) aynı kaldığı için
buradaki entegrasyonu etkilemiyor.

## Değişen dosyalar
- `components/DreamGlobe.jsx`
- `components/DeepAnalysisConfirmationModal.jsx`
- `components/DeepAnalysisCarouselModal.jsx`
- `components/EmptyState.jsx`
- `pages/explore.js`
- `pages/profile.js`
- `tailwind.config.js`

## Test edilemedi / edildi
- **Sözdizimi:** `tailwind.config.js` `node --check` ile doğrulandı,
  hatasız. JSX dosyalarında (Node yerleşik olarak JSX ayrıştırmadığı
  için) satır satır elle gözden geçirme yapıldı.
- **Gerçek build:** Bu ortamda ağ erişimi olmadığından `npm install` /
  `npx next build` çalıştırılamadı — deploy öncesi bir kez sen
  çalıştırmalısın.
- **Görsel:** Yeni `gold-gradient-text` başlıkların ve yeni
  `h1/h3/body-sm/label` boyutlarının ekranda beklediğin gibi durduğunu
  bir kez kontrol etmen iyi olur (özellikle `body-sm` için seçtiğim
  0.8125rem/13px değeri bir tercih, kesin belirlenmiş bir ölçek değildi).
