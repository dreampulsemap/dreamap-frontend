# Pixabay Entegrasyonu — Gerekli Supabase Değişiklikleri

Vizyon panosunda "Pixabay'dan Seç" özelliği için kod tarafı hazır, ama
Supabase projesinde elle uygulanması gereken 3 şey var.

## 0. Env var (Vercel + `.env.local`)

```
PIXABAY_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

Ücretsiz key: https://pixabay.com/api/docs/ (hesap açıp "API" sekmesinden
alınıyor, saniyede/dakikada istek limiti var ama günlük kullanım için
fazlasıyla yeterli — bkz. dokümantasyondaki "Rate Limit" bölümü).

**Bu key `NEXT_PUBLIC_` ile başlamıyor** — bilerek, çünkü arama isteği
`/api/pixabay/search` üzerinden sunucu tarafında atılıyor, key client'a hiç
gitmiyor.

## 1. Yeni tablo: `image_library`

Kullanıcıların Pixabay'den seçip indirdiği her görsel, tekrar tekrar
indirilmesin diye burada etiketleriyle birlikte önbelleğe alınıyor. Aynı
Pixabay görselini başka bir kullanıcı da seçerse, tekrar Pixabay'e gidip
indirmek yerine doğrudan bizim storage'ımızdaki kopya kullanılıyor.

```sql
create table if not exists image_library (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'pixabay',
  source_id text not null,
  tags text[] not null default '{}',
  original_url text not null,
  stored_url text not null,
  width int,
  height int,
  pixabay_user text,
  downloads_count int not null default 1,
  created_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists idx_image_library_tags on image_library using gin (tags);

alter table image_library enable row level security;

-- Herkes okuyabilir (görseller zaten public storage'da, galeri gibi gösterilecek)
create policy "image_library public read"
  on image_library for select
  using (true);

-- Insert/update sadece service role (API route) üzerinden yapılıyor —
-- bu yüzden authenticated/anon için ayrı bir insert policy YOK, RLS zaten
-- service role'ü bypass ediyor.
```

## 2. Yeni Storage bucket: `image-library`

Supabase Dashboard → Storage → New bucket:
- Name: `image-library`
- Public: **evet**

```sql
create policy "image-library public read"
  on storage.objects for select
  using (bucket_id = 'image-library');

-- Yükleme yalnızca sunucu tarafında (service role, /api/goals/add-image-from-pixabay)
-- yapılıyor — kullanıcı doğrudan bu bucket'a yazamıyor, bu yüzden insert/update/delete
-- için ayrı bir public policy YOK (goal-images bucket'ından farkı bu).
```

## Akış özeti

1. Kullanıcı "Pixabay'dan Seç" → arama yapar → `/api/pixabay/search`
   (sunucu, `PIXABAY_API_KEY` ile Pixabay'e proxy istek atar, sonuçları
   sadeleştirip döner).
2. Bir görsele tıklayınca → `/api/goals/add-image-from-pixabay`:
   - `image_library`'de bu görsel var mı bakar (varsa direkt kullanır)
   - Yoksa Pixabay'den indirir → `image-library` bucket'ına yükler →
     `image_library` tablosuna etiketleriyle kaydeder
   - Elde edilen kalıcı URL'i `goals.gallery_image_urls`'e ekler (aynı
     `add-image.js`'deki mantık)

Bu üç adım uygulanmadan Pixabay araması "pixabay_not_configured" hatası
verir, seçim ise 500/404 ile başarısız olur — sayfanın geri kalanı
bundan etkilenmez.
