-- =====================================================================
-- dream_translations: istemci erisimini kapat
--
-- "Allow public read" (USING true) gizli rüyalarin cevirilerini de herkese
-- aciyordu; "Allow public insert" (WITH CHECK true) herkesin herhangi bir
-- rüyaya sahte ceviri yazip cache'i zehirlemesine izin veriyordu.
-- Tabloyu sadece pages/api/translate.js kullaniyor ve artik service role
-- (supabaseAdmin) ile, metin dogrulamasindan sonra erisiyor.
-- RLS acik kalir; politika olmayinca anon/authenticated hicbir satir goremez.
-- =====================================================================

drop policy if exists "Allow public read" on public.dream_translations;
drop policy if exists "Allow public insert" on public.dream_translations;
drop policy if exists guests_no_insert on public.dream_translations;
drop policy if exists guests_no_update on public.dream_translations;
drop policy if exists guests_no_delete on public.dream_translations;

revoke all on public.dream_translations from anon, authenticated;
