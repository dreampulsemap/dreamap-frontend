# Lunosfer — Tasarım Sistemi & Ölçek Stratejisi

**Dürüst çerçeve:** Bu doküman "her pikseli tek seferde ayarladım" iddiasında değil.
Milyonlarca kullanıcılı bir üründe tasarım asla "bitmiş" olmaz — sürekli ölçülür,
test edilir, iyileştirilir. Burada yaptığım: (1) somut bir temel atmak
(design token'ları — az önce `tailwind.config.js`'e uyguladım), (2) mevcut
kod tabanındaki gerçek tutarsızlıkları göstermek, (3) profesyonel bir ürünün
sahip olması gereken katmanları önceliklendirilmiş bir yol haritasıyla vermek.

---

## 1. Şu Ana Kadar Uygulanan (Kod Tabanında Gerçek)

- **Design token'ları** (`tailwind.config.js`): `brand.primary/secondary/accent`,
  `semantic.success/warning/danger/neutral`, `surface.*`, tutarlı `borderRadius`
  (`card`, `pill`) ve `transitionDuration` (`fast/base/slow`) ölçekleri eklendi.
  **Neden önemliydi:** Önceden dosya taraması yapınca `fuchsia-500`, `cyan-400`,
  `purple-800`, `rose-400`, `emerald-500` gibi ham renkler ~15 farklı component'te
  elle, tutarsız kombinasyonlarla kullanılıyordu. Marka rengini değiştirmek
  isteseniz 15 dosyayı tek tek düzeltmeniz gerekirdi. Artık tek yerden kontrol var.
- **Skeleton/fade-in deseni** (önceki turlarda): dil flash'ı ve hydration
  sorunları için `TextSkeleton.jsx` + opacity-fade deseni.
- **Component state tutarsızlığı tespiti**: `DreamComposer.jsx`, `DreamAnalysisView.jsx`,
  `StoryModeModal.jsx` gibi veri/AI-üretimi bekleyen component'lerde açık bir
  loading/error state deseni yok — bir sonraki adımda bunlar `TextSkeleton` ve
  ortak bir `<ErrorState/>` component'iyle standartlaştırılmalı.

## 2. Görsel Kimlik

**Mevcut yön korunmalı, disipline edilmeli:** Koyu tema, cam-panel (glassmorphism)
kartlar, fuchsia→purple→cyan gradyanları, `font-serif` başlıklar — "mistik ama
premium" bir ton tutturmuş, bunu değiştirmeyi önermiyorum. Sorun renk paleti
değil, **disiplinsiz uygulanması**.

- **Tipografi ölçeği eksik**: Şu an `text-2xl`, `text-3xl`, `text-lg` gibi
  keyfi seçimler var, tanımlı bir ölçek (`display/h1/h2/h3/body/caption`) yok.
  Sonraki adım: `tailwind.config.js`'e `fontSize` token'ları eklemek.
- **İkonografi tutarsız**: Emoji (🌙 🔮 ✨) ile gerçek ikon setleri (Lucide,
  zaten `lucide-react` kurulu) karışık kullanılıyor. Emoji telefon/OS'e göre
  farklı render olur — marka tutarlılığını bozar. **Öneri: emoji'leri kademeli
  olarak Lucide ikonlarıyla değiştirin**, özellikle buton/nav içindekiler.

## 3. Component Durumları (Loading / Empty / Error / Success)

Milyonlarca kullanıcıda "her şey her zaman anında yüklenir" varsayımı yanlıştır
— yavaş bağlantı, API hatası, boş veri her zaman olacak. Denetimde şunu gördüm:
bazı ekranlarda (Explore, index feed) bu üçlü var; bazılarında (`DreamComposer`,
`StoryModeModal`) yok. **Kural**: her veri-bağımlı component 4 durumu da
açıkça ele almalı, "veri gelene kadar boş görünüm" kabul edilemez.

## 4. Ölçek İçin Performans

- **Görsel optimizasyonu**: `<img src=...>` doğrudan kullanılıyor (Explore
  grid, GoalCard). Next.js'in `next/image`'ı otomatik boyutlandırma/lazy-load/
  format dönüşümü (WebP/AVIF) sağlar — milyonlarca kullanıcıda bant genişliği
  maliyeti ciddi fark yaratır. **Öncelikli teknik borç.**
- **Liste sanallaştırma**: Explore grid ve Vision Board şu an tüm DOM'u
  render ediyor (infinite scroll + `.map()`). Binlerce öğeye çıkınca
  (`react-window` veya benzeri) sanallaştırma gerekir — şimdilik `BATCH_SIZE`
  ile sayfalama yeterli ama izlenmeli.
- **N+1 sorgu deseni**: `friends/search.js` her sonuç için ayrı arkadaşlık
  sorgusu atıyor (10 sonuç = 11 DB round-trip). Düşük trafikte sorun değil,
  ölçekte gecikme kaynağı — tek sorguda `IN (...)` ile toplanabilir.

## 5. Erişilebilirlik (Accessibility)

- Kontrast oranları genel olarak iyi (`text-slate-400`/`500` siyah zemin
  üzerinde WCAG AA'yı geçiyor), ama **hiçbir yerde `aria-label` yok** —
  ikon-only butonlar (✕ kapat, → geçiş okları) ekran okuyucu kullanıcılar için
  anlamsız. Küçük ama gerçek bir eksik.
- Klavye navigasyonu test edilmemiş görünüyor — modal'larda (CreateGoalModal,
  GoalDetailModal) `Escape` ile kapama veya focus-trap yok.

## 6. Bilgi Mimarisi

Navbar şu an düz bir link listesi: Home / Explore / Globe / Vision. Ürün
büyüdükçe (brief'teki 4 sekmeli Explore: Dreamscape/Vision Board/Victory
Wall/Phoenix Wall) bu düz yapı yetersiz kalacak — **öneri: Explore'u kendi
içinde sekmeli bir hub'a çevirin**, ayrı üst-seviye nav item'ları yerine.
Şu anki `vision-board.js` ayrı bir sayfa olarak durması geçici bir çözüm,
uzun vadede Explore'un bir sekmesi olmalı (brief'in orijinal mimarisiyle
tutarlı).

## 7. Büyüme/Bağımlılık Mekanikleri — Tasarım Açısından

Mana/Lunos Puanı gibi mekanikler UI'da şu an "sayı gösterme" seviyesinde
(GoalCard'da believers count). Profesyonel ürünlerde bu tarz mekanikler
**anlık geri bildirim** ister: mana verdiğinde mikro-animasyon (parçacık
efekti, sayının artışının count-up animasyonu), günlük mana yenilendiğinde
bildirim/rozet. Şu an bunların hiçbiri yok — fonksiyonel ama "hissettirmiyor".
Bu, "milyonlarca kullanıcı" hedefiyle doğrudan ilişkili: retention'ı bu tür
mikro-etkileşimler sürükler.

## 8. Önceliklendirilmiş Yol Haritası

| Öncelik | Madde | Neden |
|---|---|---|
| 1 | `next/image`'a geçiş | Bant genişliği maliyeti, Core Web Vitals |
| 2 | Tipografi token ölçeği | Görsel tutarlılık, önceki adımın devamı |
| 3 | Component state standardizasyonu | Kullanıcı "uygulama donmuş" hissi yaşamasın |
| 4 | Emoji → ikon geçişi (nav/butonlar) | Platformlar arası tutarlılık |
| 5 | `aria-label` + focus-trap | Erişilebilirlik, App Store/yasal uyumluluk |
| 6 | N+1 sorgu temizliği (`friends/search.js`) | Ölçekte gecikme |
| 7 | Mikro-etkileşim animasyonları (mana verme vb.) | Retention |
| 8 | Explore'u 4 sekmeli hub'a genişletme | Brief'teki orijinal mimariyle uyum |

**Şimdi hangisiyle devam edelim?** Hepsini aynı anda "tamam" demek gerçekçi
değil — birini seçip gerçekten iyi yapmak, hepsine yüzeysel dokunmaktan
daha değerli.
