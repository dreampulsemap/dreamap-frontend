-- 013_profile_visibility_and_post_clamp.sql
-- Profil gizliliği (herkese açık / sadece arkadaşlar / tamamen gizli) ve bunun
-- paylaşımların (dreams/goals/diary_entries) gizlilik seçeneklerini kısıtlaması.
-- Idempotent: birden fazla kez çalıştırılabilir.
--
-- NEDEN DB SEVİYESİNDE TRİGGER (sadece API route değil):
-- pages/add-dream.js (web) VE Android CreateDreamScreen.kt, dreams tablosuna
-- API'yi (submit-dream.js) hiç kullanmadan DOĞRUDAN client-side Supabase
-- insert'i ile yazıyor. Yani "profili gizliyse paylaşım da gizli olsun"
-- kuralını yalnızca bir API route'una eklemek dreams için hiçbir şey ifade
-- etmez — kural bypass edilebilir. goals ve diary_entries API üzerinden
-- gidiyor ama savunma amaçlı (defense-in-depth) onlara da aynı trigger
-- ekleniyor; tek kod yolu = tutarlı davranış.

-- 1) user_profiles.profile_visibility — 'public' | 'friends' | 'private'.
--    Var olan satırları mevcut is_private değerine göre dolduruyoruz ki
--    şu an gizli olan hesaplar sessizce "public"e düşmesin.
alter table public.user_profiles
  add column if not exists profile_visibility text;

update public.user_profiles
  set profile_visibility = case when is_private then 'private' else 'public' end
  where profile_visibility is null;

alter table public.user_profiles
  alter column profile_visibility set default 'public';

alter table public.user_profiles
  alter column profile_visibility set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_profile_visibility_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_profile_visibility_check
      check (profile_visibility in ('public', 'friends', 'private'));
  end if;
end $$;

-- 2) Ortak trigger fonksiyonu: bir dreams/goals/diary_entries satırı yazılırken
--    (INSERT veya visibility UPDATE'i), sahibinin profile_visibility'sine göre
--    NEW.visibility'yi kısıtlar:
--      profil 'private' -> paylaşım zorunlu 'private'
--      profil 'friends' -> paylaşım 'public' OLAMAZ, 'friends'e düşürülür
--      profil 'public'  -> kısıtlama yok
--    Sessizce kısıtlıyoruz (hata fırlatmıyoruz) çünkü istemciler (Android/web)
--    zaten aynı kısıtlamayı UI'da uyguluyor — burada olağan durum, arka arkaya
--    gelen bir profil değişikliği/gecikme gibi uç durumlar için son güvence.
create or replace function public.clamp_post_visibility_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_visibility text;
begin
  select profile_visibility into owner_visibility
  from public.user_profiles
  where id = new.user_id;

  if owner_visibility = 'private' then
    new.visibility := 'private';
  elsif owner_visibility = 'friends' and new.visibility = 'public' then
    new.visibility := 'friends';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dreams_clamp_visibility on public.dreams;
create trigger trg_dreams_clamp_visibility
  before insert or update of visibility on public.dreams
  for each row execute function public.clamp_post_visibility_to_profile();

drop trigger if exists trg_goals_clamp_visibility on public.goals;
create trigger trg_goals_clamp_visibility
  before insert or update of visibility on public.goals
  for each row execute function public.clamp_post_visibility_to_profile();

drop trigger if exists trg_diary_entries_clamp_visibility on public.diary_entries;
create trigger trg_diary_entries_clamp_visibility
  before insert or update of visibility on public.diary_entries
  for each row execute function public.clamp_post_visibility_to_profile();

-- Sertleştirme: 009_goal_saves_and_reports.sql'deki aynı desen — SECURITY
-- DEFINER fonksiyonun /rest/v1/rpc/... üzerinden anon/authenticated
-- tarafından doğrudan çağrılabilmesini kapatıyoruz. Trigger olarak ateşlenmesi
-- bu grant'e bağlı değil, yalnızca doğrudan RPC çağrısı yüzeyini kapatıyor.
revoke execute on function public.clamp_post_visibility_to_profile() from anon, authenticated;
