-- =====================================================================
-- dreams.dream_date: boş tarihleri doldur, varsayılan ekle
--
-- Temmuz 2026'da eklenen 60 rüyada dream_date NULL'dı. Android'in
-- DreamDetail modelinde dreamDate boş olamaz; bu rüyalara dokununca yanıt
-- çözülemiyor ve "Failed to load dream" görünüyordu.
-- Canlıya 13 Kasım 2026'da Supabase üzerinden uygulandı; dosya kayıt amaçlı.
-- =====================================================================

update public.dreams
   set dream_date = (created_at at time zone 'utc')::date
 where dream_date is null;

alter table public.dreams alter column dream_date set default current_date;
