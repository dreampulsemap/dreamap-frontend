# Vizyon Galerisi — Gerekli Supabase Değişiklikleri

Bu değişiklik seti (çoklu görsel yükleme + yana kaydırmalı galeri), kod
tarafında hazır ama **Supabase projesinde elle uygulanması gereken** iki
şey var (bu repo sadece frontend, migration/CLI erişimi yok):

## 1. `goals` tablosuna yeni kolon

```sql
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS gallery_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
```

## 2. Yeni Storage bucket: `goal-images`

Supabase Dashboard → Storage → New bucket:
- Name: `goal-images`
- Public: **evet** (kapak görselleri gibi herkese açık okunabilir olmalı)

Bucket policy'leri (avatars bucket'ıyla aynı mantık):

```sql
-- Herkes okuyabilir
create policy "goal-images public read"
  on storage.objects for select
  using (bucket_id = 'goal-images');

-- Sadece kimliği doğrulanmış kullanıcılar kendi klasörüne yükleyebilir
create policy "goal-images owner upload"
  on storage.objects for insert
  with check (
    bucket_id = 'goal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Sadece kendi yüklediğini silebilir
create policy "goal-images owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'goal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

Dosya yolu deseni istemci tarafında `${user.id}/${goalId}/${timestamp}-${filename}`
şeklinde oluşturuluyor, yukarıdaki policy bununla eşleşiyor.

Bu iki adım uygulanmadan galeri görsel yükleme/silme 403/404 ile
başarısız olur — kart/detay modalının geri kalanı bundan etkilenmez.
