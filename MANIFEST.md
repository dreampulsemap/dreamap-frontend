# MANIFEST — Pixabay Görsel/Kapak Kaybolma Sorunu (Kök Neden + Onarım)

Tarih: 5 Eylül 2026
Kapsam: "Ruyalara ve vizyonlara Pixabay'den eklenen görseller 2-3 gün
içinde kayboluyor" raporu — kök neden bulundu, canlı veri onarıldı,
kalıcı önleme eklendi.

## Kök neden

Pixabay'in çıplak `pixabay.com/get/...` linki birkaç gün içinde kalıcı
olarak geçersiz oluyor (yeniden de üretilemiyor). Web kodunun tamamı
(PixabayPicker, CreateGoalModal, GoalDetailModal, DreamCard,
DreamEditModal, add-dream.js) `cachePixabayImage()` ile bu linki doğru
şekilde indirip `image-library` bucket'ına kaydediyordu — orada hata
yoktu.

Asıl kırık nokta üç API route'uydu: `update-dream.js` (rüya kapağı),
`goals/create.js` ve `goals/set-cover.js` (vizyon kapağı). Bu route'lar,
kendilerine gelen URL'in **zaten cache'lenmiş olduğunu varsayıp**
doğrulamadan direkt DB'ye yazıyordu (`update-dream.js` içindeki yorum:
"Yeni URL zaten kalıcı... bu yüzden doğrudan 'ok'"). `dreams` tablosu
ayrıca client-side doğrudan insert'e de açık (submit-dream.js'teki not)
— yani bu üç route'u hiç kullanmayan bir yazar (ör. Android) çıplak
Pixabay linkini bu varsayımı tamamen es geçerek kaydedebiliyordu.

## Canlı veri onarımı (Supabase'e doğrudan uygulandı — kod değil)

- 1 rüya (id 852) ve 5 vizyon kapağı gerçekten çıplak Pixabay linkiyle
  kayıtlı bulundu.
- **4 vizyon kapağı düzeltildi**: zaten kalıcı bir galeri görselleri
  vardı, onu kapak yaptık ("being a great cook", "to live in england",
  "learn spanish", "lunosferi yayinlamak").
- **1 vizyon ("Tus calismak") + 1 rüya (852) kurtarılamadı**: orijinal
  Pixabay linki gerçekten ölmüş (tarayıcı header'larıyla bile
  indirilemiyor), yedek görsel de yoktu — alan `null`'a çekildi.
- Bonus: aynı taramada ~35 rüyanın (bugünkü konuyla ilgisiz,
  `replicate.delivery` kaynaklı) görseli de kalıcı depoya taşındı;
  ~14 tanesi zaten ölmüştü (404), dokunulmadı — bu ayrı, önceden
  bilinen bir konu (`persistRemoteImage.js` yorumunda belgeli).

## Kalıcı önleme — DB tarafı (Supabase'e doğrudan uygulandı)

- `dreams` tablosuna trigger: `ai_image_url` kalıcı depoda değilse
  otomatik `image_status='needs_persist'` işaretler.
- `goals` tablosuna yeni kolonlar (`image_status`, `image_checked_at`,
  `image_repair_attempts` — dreams ile birebir aynı desen) + aynı
  mantıkta trigger (`cover_image_url` veya `gallery_image_urls`).
- Kaynaktan bağımsız çalışır (web API, Android'in doğrudan Supabase
  insert'i, admin panel) — `013_profile_visibility_and_post_clamp.sql`'de
  görünürlük kısıtlaması için kullanılan aynı desen.

## Yeni dosyalar

- `lib/repairGoalImage.js` — `repairDreamImage.js`'in vizyon karşılığı.
  Kapak kalıcı değilse taşımayı dener; olmazsa galeriden kalıcı bir
  görseli kapak yapar; o da yoksa `broken` işaretler. AI ile yeniden
  üretim YAPMAZ (Aura kredisi harcamasın diye — zaten Pixabay linki
  yeniden üretilemez).
- `pages/api/cron/repair-broken-goal-images.js` —
  `repair-broken-images.js`'in vizyon karşılığı, günlük tarar.

## Değiştirilen dosyalar

- `vercel.json` — yeni cron eklendi (12:15, dreams cron'undan 15 dk
  sonra).
- `pages/api/update-dream.js` — `ai_image_url` yazılmadan önce kalıcı
  olup olmadığı kontrol ediliyor, değilse anında indirip cache'leniyor.
- `pages/api/goals/set-cover.js` — aynı kontrol `coverImageUrl` için.
  Yanlış varsayıma dayanan eski yorum kaldırıldı.
- `pages/api/goals/create.js` — aynı kontrol, oluşturma anında gönderilen
  `cover_image_url` için.

## Yapman gerekenler

1. Bu dosyaları repona uygula, commit'le, Vercel'e deploy et.
2. Supabase tarafı zaten canlı — yeni migration'a gerek yok.
3. İstersen Android tarafında da rüya/vizyon oluştururken Pixabay'in
   çıplak linkini doğrudan kaydeden yeri bulup düzelt — ama artık DB
   trigger'ı + bu üç route sayesinde Android düzeltilmese bile görseller
   kaybolmayacak, en geç ertesi günkü cron'da otomatik onarılacak.
