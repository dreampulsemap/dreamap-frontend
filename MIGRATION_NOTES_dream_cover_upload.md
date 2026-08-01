# Rüya Kapak Görseli — Cihazdan Yükleme — Gerekli Supabase Değişikliği

Bu değişiklik seti (rüya oluştururken VE rüya kartı oluştuktan sonra
cihazdan görsel yükleme), kod tarafında hazır ama **Supabase projesinde
elle uygulanman gereken tek bir şey** var (bu repo sadece frontend,
migration/CLI erişimi yok).

## Yeni DB kolonu gerekmiyor

`dreams` tablosunda `ai_image_url` / `image_source` / `image_width` /
`image_height` zaten var (`006_dream_tags_and_image_quality.sql`).
`image_source` düz `text`, kısıtlaması yok — yeni değer olarak
`'user_upload'` sorunsuz yazılabiliyor (mevcut `'ai'` / `'pixabay'`
değerlerinin yanına).

## `dream-images` bucket'ı zaten var — sadece bir policy eksik

Bu bucket, görsel üretim/onarım pipeline'ı tarafından (`lib/repairDreamImage.js`,
`lib/persistRemoteImage.js`) **şimdiye kadar sadece sunucu tarafında**
(`supabaseAdmin`, service role — RLS'i bypass eder) yazılıyordu. Public
okuma zaten çalışıyor (görseller herkese açık gösteriliyor). Ama
**tarayıcıdan, normal kullanıcı oturumuyla** yükleyebilmek için yeni bir
INSERT policy'si gerekiyor — bu şimdiye kadar hiç eklenmemiş.

Supabase Dashboard → SQL Editor:

```sql
-- Kimliği doğrulanmış kullanıcılar kendi klasörüne yükleyebilsin
create policy "dream-images owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'dream-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- (opsiyonel ama önerilir) kendi yüklediğini silebilsin
create policy "dream-images owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'dream-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

Dosya yolu istemci tarafında (`lib/uploadDreamCoverImage.js`) şu şekilde
oluşturuluyor:
- Rüya henüz yokken (`pages/add-dream.js`): `${user.id}/${timestamp}-${rnd}.${ext}`
- Rüya zaten varken (`DreamCard.jsx`, `DreamEditModal.jsx`): `${user.id}/${dreamId}/${timestamp}-${rnd}.${ext}`

İkisinde de ilk segment `user.id` olduğu için yukarıdaki tek policy
her iki durumu da kapsıyor.

**Bu policy eklenmeden** cihazdan yükleme "Yükleme izni yok" hatasıyla
başarısız olur (kodda bu durum yakalanıp anlaşılır bir mesaja çevriliyor —
uygulamanın geri kalanı etkilenmez, sadece bu yeni buton çalışmaz).
Pixabay tarafı bu policy'ye ihtiyaç duymuyor (o zaten sunucu üzerinden,
`/api/dreams/pixabay-image` → `supabaseAdmin` ile yazıyor, öncekiyle aynı).
