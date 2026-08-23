-- 012_dream_symbol_and_collective_stats.sql
-- Üç share-card boşluğunu kapatır (Android ui/components/sharecards/ tarafında
-- yorumla işaretlenmişti):
--   1) DreamArchetypeCard "Kilit Sembol" — tags KULLANILMAMALI (update-dream.js'te
--      kullanıcının serbest metin etiketleri, AI'dan gelmiyor). Onun yerine
--      analyze-dream.js artık title/summary/motiv ile aynı desende ayrı bir
--      "symbol" alanı üretiyor. (Android tarafı düzeltildi: DreamArchetypeCard.kt
--      artık symbol'ü okuyor, tags'e sadece eski analizler için fallback yapıyor.)
--   2) VisionMessageCard "gelecek benliğinden mesaj" — goals tablosunda hiç
--      yoktu, goals/generate-future-message.js bunu dolduruyor.
--   3) CollectiveNightReportCard — hiç aggregate endpoint yoktu,
--      dreams/collective-stats.js bunu üretiyor; bu tablo onun ucuz önbelleği.
-- Idempotent: birden fazla kez çalıştırılabilir.

-- 1) Rüya sembolü — ai_title/ai_summary/ai_motiv ile birebir aynı desen
--    (ana dil + her zaman dolu en/tr kısayolları; diğer 5 dil ai_jungian_analysis
--    JSON'ında kalıyor, tıpkı title/summary/motiv gibi).
alter table dreams add column if not exists ai_symbol text;
alter table dreams add column if not exists ai_symbol_en text;
alter table dreams add column if not exists ai_symbol_tr text;

-- 2) Vizyon "gelecek benliğinden mesaj". Goal.description/title tek dilli
--    düz string olduğu için (dreams'teki gibi çoklu dil map'i yok), bu da
--    aynı konvansiyona uyuyor — tek dilli, kullanıcının profil dilinde.
alter table goals add column if not exists ai_future_message text;

-- 3) Kolektif gece raporu önbelleği. Her istek 24 saatlik pencereyi yeniden
--    taramasın diye (dreams tablosu büyüdükçe pahalılaşır) — summaries/generate.js'teki
--    "son N saatte üretildiyse onu döndür" deseninin çapraz-kullanıcı hali.
create table if not exists collective_dream_stats (
  id uuid primary key default gen_random_uuid(),
  window_start timestamptz not null,
  window_end timestamptz not null,
  top_archetype text,
  percentage int,
  sample_size int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_collective_dream_stats_created_at
  on collective_dream_stats (created_at desc);
