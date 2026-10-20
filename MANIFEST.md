# MANIFEST — Organik Büyüme: Rüya Rehberleri, Teknik SEO, Rehberden Kayda Akış

Tarih: 20 Ekim 2026
Baz: `main` @ 3940447 ("Navbar: her zaman görünen Uygulamayı indir butonu…")
Build: `npm ci && next build` hatasız (sahte Supabase env ile). 112 URL'lik
sitemap, rehber sayfaları ve kayıt akışı headless Chromium'da test edildi.

Bu paket yalnızca değişen/eklenen dosyaları içeriyor. Aynı klasör yollarıyla
projenin üzerine kopyala; `public/sitemap.xml`'i SİL (aşağıda neden).

## 1) İçerik: 59 → 103 rehber, hepsinde SSS

| | Önce | Şimdi |
|---|---|---|
| Türkçe rehber (`/ruya-tabirleri/*`) | 42 | 51 |
| İngilizce rehber (`/dream-meanings/*`) | 17 | 52 |
| Sayfa başına metin | 110–330 kelime | 400–700 kelime + 3–4 SSS |

- **9 yeni konu, iki dilde:** uyku felci / karabasan, kâbus neden görülür,
  ayna, merdiven, kapı, ünlü birini görmek, okulda olmak, frenin tutmaması,
  sahte uyanış. Instagram/TikTok takvimindeki konularla örtüşüyor; "link
  biyografide" diyen gönderiler artık konusuna denk gelen sayfaya gidebilir.
- **Türkçe rehberlerin 26 İngilizce karşılığı** (köpek, kedi, bebek, deprem,
  kan, örümcek, aldatılmak, anne, baba…).
- **Mevcut 59 rehbere SSS + ince olanlara ek bölüm.** SSS soruları her
  rehberin kendi `keywords` listesindeki uzun kuyruk aramalara cevap veriyor
  ("Rüyada siyah yılan görmek ne demek?"). Eski FAQPage şeması başlığı soru,
  kısa cevabı cevap yapıyordu; artık gerçek SSS'ten üretiliyor.

Ton kuralları korunmuştur: kehanet/uğur/dini hüküm yok, "sen" hitabı, Jung +
Freud, kişisel bağlam vurgusu; uyku felci, kâbus, ölüm, kan gibi konularda
sık yaşanıyorsa uzmana başvurma cümlesi.

Dosyalar:
- `lib/dreamGuidesNewTr.js`, `lib/dreamGuidesNewEn.js` (yeni) — 9+9 yeni konu.
- `lib/dreamGuidesEnA.js`, `lib/dreamGuidesEnB.js` (yeni) — 26 İngilizce karşılık.
- `lib/guideExtrasTr1.js`, `lib/guideExtrasTr2.js`, `lib/guideExtrasEn.js` (yeni) — mevcut rehberlere SSS + ek bölümler.
- `lib/guideUtils.js` (yeni) — `mergeExtras()`: ek bölümleri "Kendine sorabileceğin sorular"dan önce yerleştirir; `cardOf()`.
- `lib/dreamGuides.js`, `lib/dreamGuidesEn.js` — yeni dosyaları birleştiriyor; tarih 2026-10-20.

## 2) Teknik SEO

- **hreflang TR↔EN (`lib/guidePairs.js` yeni, `components/Seo.jsx`):** Aynı
  konunun iki dili birbirini göstermiyordu (her sayfa yalnızca kendini
  `x-default` olarak veriyordu). Artık karşılıklı `alternate` etiketleri +
  `og:locale:alternate` basılıyor; `x-default` İngilizce sürüm (TR/EN dışı
  ziyaretçi için). `Seo`'ya iki yeni opsiyonel prop: `alternates`,
  `xDefaultPath` — diğer sayfalar etkilenmiyor.
- **`<html lang>` (`pages/_document.js`):** İngilizce rehberler `lang="tr"`
  ile sunuluyordu. `/dream-meanings*` artık `lang="en"`; diğer her şey eskisi
  gibi `tr`.
- **Dinamik sitemap (`pages/sitemap.xml.js` yeni, `public/sitemap.xml` SİLİNDİ):**
  Elle tutulan statik dosya yerine veriden üretiliyor; yeni rehber eklemek
  için artık sitemap'e dokunmak gerekmiyor. TR/EN eşleri `xhtml:link` ile
  bildiriliyor, `lastmod` var, `/app` eklendi. **public/sitemap.xml kalırsa
  Next.js "conflicting public file and page" hatası verir — silinmeli.**
  URL aynı (`/sitemap.xml`), robots.txt ve Search Console değişmez.
- **IndexNow (`public/e6f8…a7f5.txt`, `scripts/indexnow.mjs` yeni):** Bing,
  Yandex, Seznam, Naver'e "bu URL'ler güncellendi" bildirimi; hesap gerekmez.
  Deploy'dan sonra bir kez: `node scripts/indexnow.mjs`.
- **Liste sayfaları (`pages/ruya-tabirleri/index.js`, `pages/dream-meanings/index.js`):**
  `getStaticProps`'a taşındı; kartlar yalnızca başlık/açıklama/sembol alıyor
  (103 rehberin tam metni istemci paketine girmesin). Birbirine dil bağlantısı + hreflang.
- **Ortak şablon (`components/GuideArticle.jsx` yeni):** İki `[slug].js`
  aynı JSX'in kopyasıydı; SSS bölümü, "Read in English / Türkçe oku"
  bağlantısı ve Article `image` alanı ile tek yerde.

## 3) Dönüşüm: rehberi okuyan kişi kayda nasıl geçiyor

**Önceki akış:** Google'dan "rüyada yılan görmek" diye gelen kişi
(1) önce tam ekran tanıtım turunu görüyordu, (2) sayfanın sonundaki buton
onu `/auth?mode=signup`'a atıyordu ama `mode` parametresi hiç okunmadığı
için **giriş** formu açılıyordu, (3) kayıt olsa bile rüyasını baştan yazması
gerekiyordu.

**Yeni akış:**
1. `components/DreamDraftBox.jsx` (yeni) — rehberin sonunda rüya yazma kutusu.
   Kişi rüyasını burada yazıyor (en az 5 kelime; azsa "nerede, ne oldu, ne
   hissettin" ipucu). Metin yalnızca tarayıcıda (`localStorage`) bekliyor,
   sunucuya kayıttan önce hiçbir şey gitmiyor.
2. Oturum yoksa `/auth?mode=signup` → **kayıt formu** açılıyor
   (`pages/auth.js`: `mode=signup` artık okunuyor).
3. Kayıt/giriş biter bitmez (e-posta ya da Google) `/add-dream` açılıyor ve
   rüya kutuda hazır (`lib/pendingDream.js` yeni; `pages/auth.js`,
   `pages/auth/callback.js`, `pages/add-dream.js`). Bekleyen rüya yoksa
   davranış eskisi gibi `/profile`. Bekleyen metin 7 gün sonra düşüyor.
4. Kutunun altında ikinci yol: "ya da Android uygulamasında yaz" (Play Store,
   `utm_medium=guide_tr` / `guide_en`).

Psikoloji: kişi aklındaki rüya için gelmiş; boş bir kayıt formu yerine önce
kendi rüyasını yazdırmak (emek verdiği metin) kaydı tamamlama isteğini
artırır, kayıt sonrası metnin hazır beklemesi de "boşuna yazdım" hissini
önler.

**Tanıtım turu (`components/game/OnboardingTour.jsx`):** `/ruya-tabirleri`,
`/dream-meanings`, `/app`, `/auth`, `/add-dream` otomatik turdan hariç
tutuldu. Tur, ilk kez gelen herkese içeriği kapatan tam ekran bir pencere
olarak açılıyordu; Google mobilde bunu "intrusive interstitial" sayıp
sıralamada cezalandırıyor, ziyaretçi de cevabı okumadan geri dönüyordu.
Tur kaldırılmadı: kullanıcı rüyasını gönderdikten sonraki ilk sayfada (ör.
profil/ana sayfa) eskisi gibi açılır. "Turu tekrar oynat" her yerde çalışır.

**PostHog olayları (yeni):** `guide_dream_draft { source, lang, words, signed_in }`,
`guide_dream_restored { source, lang }`; indirme linki `get_app_click { placement: guide_tr|guide_en }`.
Huni: rehber görüntüleme → guide_dream_draft → guide_dream_restored → rüya gönderimi.

## 4) Pinterest görselleri

`public/pins/en/*.jpg` (52) ve `public/pins/tr/*.jpg` (15), 1000×1500, ~8 MB.
Deploy'dan sonra `https://www.lunosfer.com/pins/...` adresinden yayında
olacaklar; Pinterest toplu yükleme CSV'si bu adresleri kullanıyor (CSV ve
üretim scripti büyüme paketinde, repoda değil).

## Dokunulmayanlar / notlar

- `components/AnalyzeCta.jsx` artık hiçbir yerde kullanılmıyor; silmedim.
- `/dream/[id]`, `/u/[id]` noindex kararı aynen duruyor.
- **Kontrol et:** Supabase Auth SMTP ayarı daha önce onay e-postalarını
  engelliyordu. Hâlâ öyleyse e-postayla kayıt olan ziyaretçi onay maili
  alamaz ve bu akış kayıtta kopar (Google ile giriş etkilenmez). Kendi test
  e-postanla bir kayıt deneyip mailin geldiğini doğrula.
