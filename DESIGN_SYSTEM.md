# Lunosfer — Tasarım Sistemi & Ölçek Stratejisi

**Dürüst çerçeve:** Bu doküman "her piksel bitti" iddiasında değil. Burada
üç şey var: (1) kod tabanında **gerçekten var olan** token'lar/desenler ve
arkasındaki davranış-psikolojisi gerekçesi, (2) mevcut gerçek tutarsızlıklar,
(3) önceliklendirilmiş bir yol haritası.

**Güncelleme notu:** Bu dosyanın önceki bir sürümü `tailwind.config.js`'e
`brand`/`semantic` token'ları eklendiğini söylüyordu ama kontrol edilince
dosyada olmadığı görüldü — planlanmış, hiç uygulanmamıştı. O iş şimdi
gerçekten tamamlandı: token'lar eklendi VE kod tabanındaki tüm kullanım
yerleri (~15 dosya, 255 yer) yeni token'lara taşındı (bkz. §1.1).

---

## 1. Renk Paleti (`tailwind.config.js`)

| Token | Hex | Kullanım |
|---|---|---|
| `void-950` | `#04060E` | Ana zemin (Obsidyen Derinliği) |
| `void-900` | `#090D1A` | Derin paneller, modal arka planları |
| `void-800` | `#121826` | Dumanlı cam içi |
| `astral-gold` | `#E6C687` | Simya / ödül — Aura, mana, "değerli" her şey |
| `astral-amber` | `#F59E0B` | Sıcak enerji, uyarı vurguları |
| `astral-glow` | `rgba(230,198,135,0.25)` | Altın parıltı gölgesi |
| `aether-cyan` | `#38BDF8` | Berrak zihin / sezgi |
| `aether-indigo` | `#818CF8` | Bilinçaltı |
| `aether-violet` | `#A855F7` | Arketip |
| `shadowWork-rose` | `#E11D48` | Bastırılmış gölge / çatışma (rüya analizinde) |

Bunlar Dreamap'in ORİJİNAL, "mistik" katmanı — rüya analizi, aura/mana
ekonomisi gibi anlatı-ağırlıklı yerlerde kullanılıyor.

### 1.1 Marka & Semantik Token'ları (Reels-dönemi ikinci katman)

Pixabay seçici, slayt editörü, vizyon oluşturma, silme/onay akışları gibi
daha yeni, "aksiyon odaklı" arayüzlerde organik olarak ortaya çıkan ve
kendi içinde zaten tutarlı olan bir vurgu dili — artık isimlendirildi:

| Token ailesi | Taban rengi | Kullanım | Örnek shade'ler |
|---|---|---|---|
| `brand-primary-*` | fuchsia | Birincil aksiyon, seçili durum, odak | `400/500/600` en sık |
| `brand-secondary-*` | cyan | AI özellikleri, ikincil vurgu | `400/500` en sık |
| `brand-accent-*` | purple | Gradyan ara rengi (`aether-violet` ile aynı aile) | `500/600` en sık |
| `semantic-danger-*` | rose | Silme, hata, geri alınamaz aksiyon uyarısı | `400/500` en sık |
| `semantic-success-*` | emerald | Tamamlandı, başarı, onay | `400/500` en sık |

Her aile Tailwind'in standart renk skalasının **birebir aynısı** — hiçbir
mevcut görsel değişmedi, sadece `bg-fuchsia-500` → `bg-brand-primary-500`
gibi isim değişti. Artık örneğin birincil aksiyon rengini değiştirmek
istenirse tek yer: `tailwind.config.js`'deki `brand.primary` objesi.

**Kural:** Anlatı/mistik bağlamda (rüya analizi, aura, arketip) `astral`/
`aether`/`shadowWork` kullan. Aksiyon/UI bağlamında (buton, form, silme
onayı, AI üretim durumu) `brand`/`semantic` kullan. İkisini karıştırma —
ayrımın kendisi anlamlı (biri "anlatı", biri "arayüz").

**Bilinen kalan tutarsızlık:** `astral-gold`/`aether-cyan` gibi orijinal
token'lar da HÂLÂ bazı yerlerde `brand-primary`/`brand-secondary` ile aynı
işlevde (buton vurgusu) kullanılıyor — yani iki katman şu an paralel
yaşıyor. Bunları tek bir sisteme indirmek (hangi ekranın "mistik", hangisinin
"aksiyon" olduğuna karar vermek) ayrı, ürün kararı gerektiren bir iş,
mekanik bir bul-değiştir değil — bilerek bu turda yapmadım.

### Vizyon Kategori Renkleri (`lib/goalTheme.js`)

Hedefin başlığı/açıklamasındaki anahtar kelimelere göre otomatik seçilen,
kategoriye özgü ikincil palet — **sembolizm ilkesi**: kart, içeriğiyle hissen
tutarlı görünsün.

| Kategori | Renk geçişi | Köşe yarıçapı | İkon |
|---|---|---|---|
| `growth` (sağlık, spor, doğa) | `#34D399 → #5EEAD4` (organik yeşil) | `28px` (yumuşak) | Sprout |
| `power` (kariyer, para, başarı) | `#E6C687 → #94A3B8` (yüksek kontrast) | `10px` (keskin) | Zap |
| `love` (ilişki, aile) | `#FB7185 → #F0ABFC` (sıcak pembe) | `26px` (yumuşak) | Heart |
| `creativity` (sanat, seyahat) | `#A78BFA → #22D3EE` (mor-camgöbeği) | `20px` (orta) | Compass |
| `default` (vizyon/ruh) | `#E6C687 → #38BDF8` (kozmik) | `24px` (`rounded-card`) | Sparkles |

Sınıflandırma anlık, deterministik anahtar kelime eşleşmesiyle yapılıyor —
API çağrısı yok, ücretsiz. Yeni kategori eklemek için `THEMES` objesine bir
girdi + anahtar kelime listesi yeterli.

**Teknik not:** Bu radius değerleri `lib/goalTheme.js`'de ham piksel
string'i olarak tutulup `style={{ borderRadius }}` ile inline uygulanıyor,
Tailwind class'ı DEĞİL — çünkü `lib/` dosyaları Tailwind'in `content`
tarama yoluna dahil değil, `rounded-[28px]` gibi bir string orada yazılsa
derlenmiş CSS'e hiç girmez (purge edilir).

---

## 2. Tipografi

```js
fontFamily: {
  serif: ['Cormorant Garamond', 'Cinzel', 'Georgia', 'serif'],
  sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
}
```

- **Serif** → başlıklar, hedef adları, duygusal ağırlığı olan metin.
- **Sans** (varsayılan) → gövde metni, UI etiketleri, butonlar.
- Slayt/Reels metin overlay'lerinde kullanıcı `sans`/`serif`/`mono`
  arasından seçebiliyor — `mono` sadece burada var, "not" hissi için.

**Bilinen eksik:** Tanımlı bir boyut ölçeği (`display/h1/h2/h3/body/caption`)
yok, `text-2xl`/`text-lg` gibi keyfi seçimler component'ten component'e
değişiyor. **Öncelik listesindeki madde 3.**

---

## 3. Boşluk, Köşe, Gölge

```js
borderRadius: { card: '24px', pill: '9999px' }
boxShadow: {
  'astral-glow': '0 0 35px rgba(230,198,135,0.18)',
  'aether-glow': '0 0 35px rgba(56,189,248,0.15)',
  'inner-light': 'inset 0 1px 1px 0 rgba(255,255,255,0.12)',
}
```

- Kartlar varsayılan `rounded-card` (24px); vizyon kartları kategoriye göre
  bunu ezer (§1).
- Pill → etiketler, durum rozetleri, sekme butonları.
- `inner-light` her zaman dış gölgeyle birlikte kullanılır — tek başına
  donuk durur, ikisi birlikte cam üzerinde ışık yansıması hissi verir.

---

## 4. Cam ve Doku Efektleri

**`.glass-card`** — her modal/kart yüzeyinin temeli: `backdrop-blur` + yarı
saydam `void` zemin + `inner-light`. Yeni bir panel yaparken bunu miras al.

**`.satin-sheen`** — kartın üst-sol köşesinden geçen çok hafif, statik ışık
huzmesi (`::before`, diagonal gradient). **Dokunsal/duyusal yanılsama**:
fiziksel bir yüzeyi andırarak sahiplenme hissini güçlendirir. Sadece vizyon
kartlarının ön yüzünde — her yere sürülürse etkisini kaybeder.

**`.flip-perspective` / `.flip-card-inner` / `.flip-face`** — 3B çevirme
kartı. `is-flipped` class'ı → `rotateY(180deg)`.

---

## 5. Reels Sistemi Animasyonları

| Class | Ne zaman | Süre | Hissiyat |
|---|---|---|---|
| `.reel-active` | Reels kartı/slaytı ekranda "aktif" olduğunda | 180ms | Hızlı kesme (fast cut) |
| `.pulse-ring` | Beğeni/mana butonuna dokunulduğunda | 550ms | Ritmik nabız — anlık karşılık |
| `.animate-fade-in` | Genel amaçlı beliren UI öğeleri | 180ms | Nötr giriş |

Reels animasyonları kasıtlı olarak KISA (≤ 600ms) — ana sayfanın geri kalanı
(nefes alan orb'lar, yıldız kayması) yavaş ve meditatif. Tezat bilinçli:
Reels "şimdi, hızlı"; ana sayfa "sakin, sonsuz" hissetmeli.

### Slayt Metin Overlay Kuralları

`goal_slides.caption_font/color/x/y/size` (bkz. `SlideCaptionEditor.jsx`).
Konum serbest (x/y %, sürüklenerek), boyut `0.4×–3.5×`, renk 6 preset'ten
(`#ffffff #0a0a0f #f5c451 #e879f9 #22d3ee #fb7185` — §1 paletinden türetildi).
Her zaman `textShadow: 0 1px 6px rgba(0,0,0,0.5)` — hangi görselin üzerine
gelirse gelsin okunabilirlik garantisi.

---

## 6. Davranış Psikolojisi İlkeleri (Uygulanmış)

**Bilişsel Kolaylık** — vizyon kartının ön yüzünde tek odak (görsel) +
minimal metin; durum rozeti sadece `status !== 'active'` iken görünür.

**Şimdiki Zaman Dili** (`lib/affirmationLanguage.js`) — kullanıcı hedefi
gelecek zamanda yazarsa dismissible bir ipucu çıkar, örnekle şimdiki zamanı
gösterir. Kullanıcının cümlesi otomatik "düzeltilmez" (Türkçe çekim riskli),
sadece ilke öğretilir.

**Mikro-Taahhüt** — `GoalDetailModal`'daki "Gerçek Kıl" paylaşım kutusu:
bir vizyonu paylaşmak ona olan bağlılığı sosyal olarak görünür kılar (public
commitment). Paylaşım metni hep şimdiki zamanda ("manifest ediyorum").

**Sembolizm** — §1, kartın rengi/köşesi hedefin temasıyla uyumlu.

**Reels Mekaniği (Algılanan Kontrol)** — slaytlar/besleme tamamen kullanıcı
kontrolünde kaydırılıyor, zorla ilerleme yok. Algılanan kontrol, bağımlılık
yapan ürünlerin temel bileşenlerinden biri — ve akış-durumu (flow) dostu.

**Bilinen eksik:** Mana verme gibi eylemler şu an sadece "sayı artıyor"
seviyesinde — parçacık efekti/count-up animasyonu yok (`.pulse-ring` bunun
başlangıcı, tam değil). **Öncelik listesindeki madde 7.**

---

## 7. Bileşen Konvansiyonları

- Her tam ekran görüntüleyici (`SlidesViewer`, `VisionReelsFeed`,
  `ImageCropModal`, `SlideCaptionEditor`, `PixabayPicker`) `useModalA11y`
  kullanır — ESC ile kapama + paylaşılan tarayıcı geçmişi yığını (iç içe
  modallarda "geri" artık dıştaki modalı da kapatmıyor).
- Kırpma/konumlandırma araçları (`ImageCropModal`, `SlideCaptionEditor`,
  `StoryModeModal`'daki rüya çerçevesi) aynı matematik modelini paylaşır:
  `baseScale = cover-fit`, `displayScale = baseScale × zoom`, pozisyon CSS
  `translate(x,y)` px cinsinden, kenarlar `clamp()` ile sınırlı. Yeni bir
  sürükle/yakınlaştır aracı yaparken bu deseni kopyala.
- Dil metinleri merkezi obje dosyalarında (`lib/visionBoardTranslations.js`
  vb.), component içine hardcode edilmiyor — 7 dil destekleniyor.

---

## 8. Component Durumları (Loading / Empty / Error / Success)

Explore ve ana sayfa beslemesinde bu dörtlü var; `DreamComposer.jsx` ve
`StoryModeModal.jsx` gibi AI-üretimi bekleyen ekranlarda net bir
loading/error deseni yok. **Kural:** her veri-bağımlı component 4 durumu da
açıkça ele almalı.

## 9. Ölçek İçin Performans

- **Görsel optimizasyonu**: Explore grid ve `GoalCard`'da `<img src=...>`
  doğrudan kullanılıyor. `next/image` otomatik boyutlandırma/lazy-load/
  WebP-AVIF sağlar — trafik büyüdükçe bant genişliği maliyeti fark yaratır.
- **Liste sanallaştırma**: Explore/Vision Board şu an tüm DOM'u render
  ediyor. Binlerce öğeye çıkınca (`react-window` vb.) gerekir, şimdilik
  sayfalama yeterli.
- **N+1 sorgu**: `friends/search.js` her sonuç için ayrı arkadaşlık sorgusu
  atıyor. Düşük trafikte sorun değil, tek `IN (...)` sorgusuna toplanabilir.

## 10. Erişilebilirlik

- Kontrast genel olarak iyi (`text-slate-400/500` siyah zemin üzerinde
  WCAG AA geçiyor).
- İkon-only butonlarda (`✕`, `→`) `aria-label` eksikliği yaygın.
- Modal'larda ESC/focus-trap artık `useModalA11y` ile standart — ama her
  modal bu hook'u kullanmıyor, taranıp eksik olanlara eklenmeli.

## 11. Bilgi Mimarisi

Navbar düz bir link listesi (Home / Explore / Globe / Vision). `vision-board.js`
ayrı bir sayfa olarak duruyor — uzun vadede Explore'un 4 sekmeli
(Dreamscape/Vision/Victory/Phoenix) yapısının içine taşınması, tutarlı bir
bilgi mimarisi için daha doğru olur.

---

## 12. Önceliklendirilmiş Yol Haritası

| Öncelik | Madde | Neden |
|---|---|---|
| 1 | `next/image`'a geçiş | Bant genişliği, Core Web Vitals |
| ~~2~~ | ~~Ham Tailwind renklerini token'lara taşımak~~ | **Tamamlandı** — §1.1 |
| 2 | Tipografi boyut ölçeği | Görsel tutarlılık |
| 3 | Component state standardizasyonu (`DreamComposer`, `StoryModeModal`) | "Donmuş" hissi olmasın |
| 4 | `aria-label` taraması + eksik `useModalA11y` entegrasyonları | Erişilebilirlik |
| 5 | N+1 sorgu temizliği (`friends/search.js`) | Ölçekte gecikme |
| 6 | Mana verme için parçacık/count-up animasyonu | Retention |
| 7 | Explore'u 4 sekmeli hub'a genişletme | Bilgi mimarisi tutarlılığı |
| 8 | `astral`/`aether` ile `brand`/`semantic` katmanlarını tek karara bağlamak | Ürün kararı gerektiriyor, mekanik değil |

**Hepsini aynı anda "tamam" demek gerçekçi değil** — birini seçip gerçekten
iyi yapmak, hepsine yüzeysel dokunmaktan daha değerli.
