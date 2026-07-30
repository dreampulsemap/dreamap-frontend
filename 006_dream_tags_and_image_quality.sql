-- 006_dream_tags_and_image_quality.sql
-- Rüyalara: etiketler (max 10), Pixabay görsel kaynağı, görsel kalite/onarım takibi.
-- Idempotent: birden fazla kez çalıştırılabilir.

-- 1) Etiketler (max 10 — app tarafında da zorlanıyor, burada CHECK ile ikinci savunma hattı)
alter table dreams add column if not exists tags text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dreams_tags_max10'
  ) then
    alter table dreams add constraint dreams_tags_max10
      check (array_length(tags, 1) is null or array_length(tags, 1) <= 10);
  end if;
end $$;

create index if not exists idx_dreams_tags on dreams using gin (tags);

-- 2) Görsel kaynağı + boyut (Pixabay'den gelenler width/height biliyor, AI-üretilenler bilmeyebilir)
alter table dreams add column if not exists image_source text; -- 'ai' | 'pixabay' | null
alter table dreams add column if not exists image_width int;
alter table dreams add column if not exists image_height int;

-- 3) Görsel sağlık takibi — kesif (Explore) kalite filtresi ve otomatik onarım cron'u bunu kullanır.
--    'ok'            -> kalıcı depoda, gösterilebilir
--    'needs_persist' -> URL hâlâ çalışıyor ama kalıcı depoya kopyalanmadı (geçici sağlayıcı linki)
--    'broken'        -> indirilemedi / kalıcı depoya taşınamadı, Explore'dan gizlenir
alter table dreams add column if not exists image_status text not null default 'ok';
alter table dreams add column if not exists image_checked_at timestamptz;
alter table dreams add column if not exists image_repair_attempts int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dreams_image_status_check'
  ) then
    alter table dreams add constraint dreams_image_status_check
      check (image_status in ('ok', 'needs_persist', 'broken'));
  end if;
end $$;

create index if not exists idx_dreams_image_status
  on dreams (image_status)
  where image_status != 'ok';

-- 4) Geriye dönük tarama: kalıcı storage domainimizde OLMAYAN (ör. image.pollinations.ai
--    canlı-render linkleri, replicate.delivery / DALL-E'nin geçici linkleri) mevcut
--    ai_image_url'leri 'needs_persist' olarak işaretle — onarım cron'u bunları toplayıp
--    kalıcı hale getirecek. Zaten kalıcı olanlara (supabase.co) dokunmaz, bu yüzden
--    migration tekrar çalıştırılsa da güvenli.
update dreams
set image_status = 'needs_persist'
where ai_image_url is not null
  and image_status = 'ok'
  and ai_image_url not ilike '%.supabase.co%';
