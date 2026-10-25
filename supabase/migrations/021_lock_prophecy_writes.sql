-- =====================================================================
-- collective_predictions / daily_prophecy: istemci yazmasını kapat
--
-- "Allow public insert" (WITH CHECK true) ve "Allow public update"
-- (USING true) politikaları roles={public} ile tanımlıydı; guests_no_*
-- kısıtlayıcı politikaları ise yalnızca 'authenticated' rolünü kapsıyor.
-- Sonuç: uygulamaya gömülü anon anahtarı olan herkes dünya haritasında
-- (DreamGlobe) herkese gösterilen kolektif kehanetleri değiştirebiliyor ya
-- da sahte kehanet ekleyebiliyordu.
-- Bu tablolara yalnızca sunucu yazıyor (pages/api/cron/generate-prophecy.js,
-- pages/api/prophet.js) ve ikisi de service role ile RLS'i bypass ediyor.
-- Okuma politikaları (DreamGlobe istemciden okuyor) olduğu gibi kalır.
-- =====================================================================

drop policy if exists "Allow public insert" on public.collective_predictions;
drop policy if exists "Allow public update" on public.collective_predictions;
drop policy if exists "Allow public insert" on public.daily_prophecy;

revoke insert, update, delete, truncate, trigger, references
  on public.collective_predictions from anon, authenticated;
revoke insert, update, delete, truncate, trigger, references
  on public.daily_prophecy from anon, authenticated;
