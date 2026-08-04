-- 009_goal_saves_and_reports.sql
-- Vizyon (goal) seviyesinde "Kaydet" butonu + üç nokta menüsündeki "Bildir".
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde çalıştırın.
-- Var olan goals/goal_slides/goal_slide_saves tablolarına DOKUNMUYOR, yalnızca
-- ekliyor — idempotent (tekrar çalıştırmak güvenli).
--
-- NOT: user_id/reporter_id kolonları public.user_profiles(id)'e referans
-- veriyor — auth.users(id) değil. Projedeki tüm goal_* tabloları (goals,
-- goal_reactions, goal_comments, goal_slide_saves) bu deseni kullanıyor;
-- user_profiles.id zaten auth.users.id ile birebir aynı (user_profiles_id_fkey),
-- bu yüzden RLS policy'lerinde auth.uid() = user_id karşılaştırması hâlâ doğru
-- çalışıyor.

-- 1) goals.saves_count — goal_slides.saves_count ile aynı desen, ama slayt
-- değil doğrudan goal'e bağlı (VisionVideoPlayer'da tek bir video var, slayt
-- kavramı yok).
alter table public.goals
  add column if not exists saves_count integer not null default 0;

-- 2) goal_saves — bir kullanıcının kaydettiği vizyonlar. goal_slide_saves ile
-- birebir aynı desen (user_id + hedef id'si). goal_slide_saves'te unique
-- constraint yoktu, ben yine de ekledim (veri bütünlüğü için zararsız —
-- API zaten check-then-act ile toggle yapıyor, bu yalnızca ek güvence).
create table if not exists public.goal_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, goal_id)
);

create index if not exists goal_saves_goal_id_idx on public.goal_saves(goal_id);
create index if not exists goal_saves_user_id_idx on public.goal_saves(user_id);

alter table public.goal_saves enable row level security;

-- goal_slide_saves ile birebir aynı: yalnızca SELECT policy'si var. Bu
-- tabloya INSERT/DELETE bilerek client'a açılmıyor — tüm yazmalar
-- /api/goals/save.js üzerinden, RLS'i bypass eden supabaseAdmin (service
-- role) ile yapılıyor. RLS enabled + policy yok = client için varsayılan red.
drop policy if exists goal_saves_select_own on public.goal_saves;
create policy goal_saves_select_own on public.goal_saves
  for select using (auth.uid() = user_id);

-- goals.saves_count'u otomatik güncelleyen trigger — handle_goal_slide_save_change
-- ile aynı desen (AFTER INSERT/DELETE, +1/-1, 0'ın altına düşmesin diye greatest).
create or replace function public.handle_goal_save_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.goals set saves_count = coalesce(saves_count, 0) + 1 where id = new.goal_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.goals set saves_count = greatest(coalesce(saves_count, 0) - 1, 0) where id = old.goal_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_goal_save_change on public.goal_saves;
create trigger on_goal_save_change
  after insert or delete on public.goal_saves
  for each row execute function public.handle_goal_save_change();

-- 3) goal_reports — üç nokta menüsündeki "Bildir". Aynı kullanıcı aynı
-- hedefi ikinci kez bildiremez (unique çift) — API bunu hata değil, sessiz
-- "zaten bildirildi" olarak ele alıyor (bkz. pages/api/goals/report.js).
create table if not exists public.goal_reports (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  reporter_id uuid not null references public.user_profiles(id) on delete cascade,
  reason text not null check (reason in ('spam', 'inappropriate', 'harassment', 'misinformation', 'hate_speech', 'other')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (goal_id, reporter_id)
);

create index if not exists goal_reports_goal_id_idx on public.goal_reports(goal_id);

alter table public.goal_reports enable row level security;

-- Yine goal_slide_saves deseni: yalnızca kendi bildirdiklerini görebilsin
-- diye bir SELECT policy var, INSERT bilerek yok — bildirim yalnızca
-- /api/goals/report.js (service role) üzerinden oluşturulabilir.
drop policy if exists goal_reports_select_own on public.goal_reports;
create policy goal_reports_select_own on public.goal_reports
  for select using (auth.uid() = reporter_id);

-- Sertleştirme: handle_goal_save_change yalnızca trigger olarak çalışsın,
-- /rest/v1/rpc/handle_goal_save_change üzerinden anon/authenticated
-- tarafından direkt çağrılamasın (Supabase security advisor'ın
-- "SECURITY DEFINER function executable" uyarısı — trigger ateşlemesi bu
-- grant'e bağlı değil, yalnızca doğrudan RPC çağrısı yüzeyini kapatıyor).
revoke execute on function public.handle_goal_save_change() from anon, authenticated;
