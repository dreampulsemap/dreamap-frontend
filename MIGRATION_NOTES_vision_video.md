# Vizyon Videosu — Gerekli Supabase Değişiklikleri

"Vizyon Slaytlarını Düzenle" (eski `SlideEditor.jsx` — çoklu görsel +
başlık + süreden oluşan slayt gösterisi editörü) artık yerini gerçek bir
video editörüne (`VisionVideoEditor.jsx` — klip ekleme/kırpma/bölme,
filtreler, sürüklenebilir metin, arka plan müziği, hız/ses ayarı) bıraktı.
Kod tarafında hazır ama **Supabase projesinde elle uygulanması gereken**
iki şey var (bu repo sadece frontend, migration/CLI erişimi yok):

## 1. `goals` tablosuna yeni kolonlar

```sql
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS vision_video_url text,
  ADD COLUMN IF NOT EXISTS vision_video_updated_at timestamptz;
```

## 2. Yeni Storage bucket: `goal-videos`

Supabase Dashboard → Storage → New bucket:
- Name: `goal-videos`
- Public: **evet** (diğer vizyon medyası gibi herkese açık okunabilir olmalı)

Bucket policy'leri (`goal-images` ile birebir aynı desen):

```sql
create policy "goal-videos public read"
  on storage.objects for select
  using (bucket_id = 'goal-videos');

create policy "goal-videos owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'goal-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "goal-videos owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'goal-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

Dosya yolu deseni istemci tarafında (`lib/uploadVisionVideo.js`)
`${user.id}/${goalId}/${timestamp}-${rnd}.${ext}` şeklinde oluşturuluyor —
`goal-images` ile aynı desen, yukarıdaki policy'ler bununla eşleşiyor.

**Ayrıca kontrol et:** Supabase'in bucket başına varsayılan dosya boyutu
limiti bazı proje planlarında 50MB civarında olabilir — kısa dikey
videolar bunu aşabilir. Dashboard → Storage → `goal-videos` → bucket
ayarlarından **File size limit**'i en az 150MB'a çıkarman gerekebilir
(kod tarafındaki `MAX_BYTES` ile eşleşsin diye).

## Eski Vizyon Slaytları verisiyle ilişkisi

`goal_slides` tablosuna, `SlideCaptionEditor.jsx`'e ve `SlidesViewer.jsx`'e
dokunulmadı — hâlâ mevcutlar, sadece "Düzenle" butonundan artık
tetiklenmiyorlar:

- **Düzenle** butonu artık doğrudan `VisionVideoEditor`'ı açıyor (yeni
  video, eskisinin üzerine yazılır — `save-vision-video` ile).
- **İzle** butonu `goal.vision_video_url` doluysa videoyu oynatıyor;
  boşsa (henüz video oluşturmamış eski hedefler için) eski slayt
  gösterisine (`SlidesViewer`, `goal_slides`) düşüyor.

Yani geriye dönük veri kaybı yok — eski slaytları olan hedefler onları
izlemeye devam ediyor, sadece yeni düzenleme artık slayt değil video
üretiyor. `delete-vision-video` ile video kaldırılırsa hedef otomatik
olarak eski slayt gösterisine (varsa) geri döner.

Bu adımlar uygulanmadan video kaydetme 403/permission hatasıyla
başarısız olur — düzenleyicinin geri kalanı (klip ekleme, kesme, filtre,
metin, önizleme, hatta dışa aktarma) bundan etkilenmez, sadece son
"kaydet" adımı çalışmaz ve kullanıcıya anlaşılır bir hata mesajı gösterilir.
