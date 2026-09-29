-- 016_gamification_xp_ranks
--
-- XP / rütbe / günlük görev / rozet sistemi.
--
-- Tek gerçek kaynak: public.lunos_points_ledger (her XP hareketi bir satır).
-- public.user_progress bu ledger'ın özeti (xp + rütbe), ledger AFTER INSERT
-- trigger'ı ile güncel tutulur. XP miktarları, günlük limitler, rütbe
-- eşikleri, rozetler ve günlük görevler SADECE bu dosyadaki fonksiyonlarda
-- tanımlı; istemciler bunları get_my_progress() üzerinden okur.
--
-- Neden user_profiles.lunos_points değil: protect_user_profile_economy_columns
-- trigger'ı o kolonu yalnızca service_role bağlamında değiştirilebilir kılıyor;
-- Android rüyaları doğrudan (authenticated rolüyle) eklediği için rüya
-- trigger'ı oraya yazamazdı. Ayrı tablo bu çakışmayı tamamen ortadan kaldırıyor.
--
-- Güvenlik ilkeleri:
--  * Tüm ödül yazımları private şemadaki SECURITY DEFINER fonksiyonlardan;
--    istemcinin user_progress/ledger'a yazma yetkisi yok.
--  * Ödül hatası kullanıcının asıl işlemini (yorum, beğeni...) ASLA bozmaz:
--    award_xp / evaluate_badges kendi hatalarını yutar.
--  * Misafir (anonim) hesaplar XP kazanmaz.
--  * Kötüye kullanım: günlük limitler + dedupe_key (beğen/geri al/beğen,
--    arkadaşlık sil/ekle, tohum işaretle/kaldır döngüleri puan üretmez).

-- ---------------------------------------------------------------------------
-- 1) Ledger genişletme
-- ---------------------------------------------------------------------------
alter table public.lunos_points_ledger add column if not exists dedupe_key text;

alter table public.lunos_points_ledger drop constraint if exists lunos_points_ledger_reason_check;
alter table public.lunos_points_ledger add constraint lunos_points_ledger_reason_check check (reason = any (array[
  'mana_given', 'ai_image_generation', 'referral_bonus', 'admin_adjustment',
  'dream_posted', 'diary_posted', 'vision_created',
  'comment_posted', 'comment_received', 'like_given', 'like_received',
  'mana_sent', 'friend_made', 'referral_inviter', 'referral_joined',
  'compass_checkin', 'seed_completed', 'onboarding_completed', 'profile_completed',
  'daily_quests_bonus', 'badge_earned'
]));

create unique index if not exists lunos_points_ledger_user_dedupe_uidx
  on public.lunos_points_ledger (user_id, dedupe_key) where dedupe_key is not null;
create index if not exists lunos_points_ledger_user_reason_created_idx
  on public.lunos_points_ledger (user_id, reason, created_at desc);
create index if not exists idx_dreams_user_created
  on public.dreams (user_id, created_at desc);

comment on column public.user_profiles.lunos_points is
  'Eski sayaç (yalnızca alınan mana). Oyun puanı için public.user_progress.xp kullan.';

-- ---------------------------------------------------------------------------
-- 2) Kurallar (tek kaynak)
-- ---------------------------------------------------------------------------
create or replace function public.xp_rules()
returns table (reason text, xp integer, daily_cap integer)
language sql immutable set search_path = '' as $$
  select * from (values
    ('dream_posted',         20, 3),
    ('diary_posted',         10, 3),
    ('vision_created',       25, 2),
    ('comment_posted',        5, 10),
    ('comment_received',      3, 30),
    ('like_given',            1, 20),
    ('like_received',         2, 50),
    ('mana_sent',             3, 10),
    ('mana_given',            1, null::integer), -- alınan her mana için (handle_goal_reaction yazar)
    ('friend_made',          10, 5),
    ('referral_inviter',    100, null),
    ('referral_joined',      20, null),
    ('compass_checkin',       5, 1),
    ('seed_completed',       10, 3),
    ('onboarding_completed', 50, null),
    ('profile_completed',    30, null),
    ('daily_quests_bonus',   30, 1)
  ) v(reason, xp, daily_cap)
$$;

-- Rütbe eşikleri — değiştirirsen user_progress.rank'ı yeniden hesapla:
--   update public.user_progress set rank = public.xp_rank(xp);
create or replace function public.xp_rank_thresholds()
returns integer[]
language sql immutable set search_path = '' as $$
  select array[0, 100, 300, 700, 1500, 3000, 5500, 9000, 14000, 21000]
$$;

create or replace function public.xp_rank(p_xp integer)
returns smallint
language sql immutable set search_path = '' as $$
  select (count(*) - 1)::smallint
    from unnest(public.xp_rank_thresholds()) t
   where t <= greatest(coalesce(p_xp, 0), 0)
$$;

create or replace function public.badge_defs()
returns table (code text, xp integer, sort smallint)
language sql immutable set search_path = '' as $$
  select * from (values
    ('first_dream',        25, 1::smallint),
    ('streak_3',           20, 2::smallint),
    ('first_vision',       25, 3::smallint),
    ('first_diary',        15, 4::smallint),
    ('dreams_10',          50, 5::smallint),
    ('streak_7',           70, 6::smallint),
    ('mana_giver_10',      40, 7::smallint),
    ('friends_5',          40, 8::smallint),
    ('comments_25',        40, 9::smallint),
    ('quest_master',       50, 10::smallint),
    ('ambassador',         50, 11::smallint),
    ('likes_received_50',  60, 12::smallint),
    ('dreams_50',         150, 13::smallint),
    ('streak_30',         300, 14::smallint)
  ) v(code, xp, sort)
$$;

-- Günlük 3 görev: bir üretim, bir sosyal, bir ritüel. Gün numarasına göre
-- deterministik döner (UTC günü). code -> istemci metni, reason -> ledger.
create or replace function public.daily_quests(p_day date)
returns table (ord smallint, code text, reason text, target integer)
language sql immutable set search_path = '' as $$
  with d as (select (p_day - date '2026-01-01') as n)
  select 1::smallint,
         case when ((d.n % 3) + 3) % 3 = 2 then 'post_diary' else 'post_dream' end,
         case when ((d.n % 3) + 3) % 3 = 2 then 'diary_posted' else 'dream_posted' end,
         1
    from d
  union all
  select 2::smallint,
         (array['comment_2', 'like_3', 'mana_1'])[((d.n % 3) + 3) % 3 + 1],
         (array['comment_posted', 'like_given', 'mana_sent'])[((d.n % 3) + 3) % 3 + 1],
         (array[2, 3, 1])[((d.n % 3) + 3) % 3 + 1]
    from d
  union all
  select 3::smallint, 'compass', 'compass_checkin', 1 from d
$$;

-- ---------------------------------------------------------------------------
-- 3) Özet tablo
-- ---------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  rank smallint not null default 0,
  onboarding_status text not null default 'none'
    check (onboarding_status in ('none', 'skipped', 'completed')),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;
revoke all on public.user_progress from anon;
revoke insert, update, delete, truncate, references, trigger on public.user_progress from authenticated;
grant select on public.user_progress to authenticated;

drop policy if exists user_progress_select_own on public.user_progress;
create policy user_progress_select_own on public.user_progress
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 4) Ödül çekirdeği (private şema, istemciye kapalı)
-- ---------------------------------------------------------------------------
create or replace function private.award_xp(p_user uuid, p_reason text, p_dedupe text, p_delta integer default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_anon boolean;
  v_xp integer;
  v_cap integer;
  v_count integer;
begin
  if p_user is null then return 0; end if;

  select u.is_anonymous into v_anon from auth.users u where u.id = p_user;
  if v_anon is distinct from false then return 0; end if; -- misafir ya da bilinmeyen

  select r.xp, r.daily_cap into v_xp, v_cap from public.xp_rules() r where r.reason = p_reason;
  v_xp := coalesce(p_delta, v_xp);
  if coalesce(v_xp, 0) <= 0 then return 0; end if;

  if v_cap is not null then
    select count(*) into v_count
      from public.lunos_points_ledger l
     where l.user_id = p_user
       and l.reason = p_reason
       and l.created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc';
    if v_count >= v_cap then return 0; end if;
  end if;

  insert into public.lunos_points_ledger (user_id, delta, reason, dedupe_key)
  values (p_user, v_xp, p_reason, p_dedupe)
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  if not found then return 0; end if;
  return v_xp;
exception when others then
  raise warning 'award_xp(%, %) failed: % %', p_user, p_reason, sqlstate, sqlerrm;
  return 0;
end $$;

create or replace function private.award_badge(p_user uuid, p_code text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_xp integer;
begin
  select b.xp into v_xp from public.badge_defs() b where b.code = p_code;
  if v_xp is null then return 0; end if;
  return private.award_xp(p_user, 'badge_earned', 'badge:' || p_code, v_xp);
end $$;

create or replace function private.ledger_count(p_user uuid, p_reason text)
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.lunos_points_ledger l where l.user_id = p_user and l.reason = p_reason
$$;

-- Bugün ya da dün biten en uzun ardışık rüya günü (UTC, created_at).
-- dream_date değil created_at: geçmiş tarihli toplu rüyayla seri sahtelenemez.
create or replace function private.dream_streak(p_user uuid)
returns integer
language sql stable security definer set search_path = '' as $$
  with days as (
    select distinct (d.created_at at time zone 'utc')::date as d_day
      from public.dreams d
     where d.user_id = p_user
       and not coalesce(d.is_bot_generated, false)
       and d.created_at >= now() - interval '400 days'
  ), grp as (
    select d_day, d_day - (row_number() over (order by d_day))::integer as g from days
  ), last_run as (
    select g, max(d_day) as last_day, count(*)::integer as len from grp group by g order by max(d_day) desc limit 1
  )
  select coalesce((select len from last_run where last_day >= (now() at time zone 'utc')::date - 1), 0)
$$;

create or replace function private.evaluate_badges(p_user uuid, p_scope text default 'all')
returns void
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  if p_user is null then return; end if;

  if p_scope in ('dream', 'all') then
    v_n := private.ledger_count(p_user, 'dream_posted');
    if v_n >= 1 then perform private.award_badge(p_user, 'first_dream'); end if;
    if v_n >= 10 then perform private.award_badge(p_user, 'dreams_10'); end if;
    if v_n >= 50 then perform private.award_badge(p_user, 'dreams_50'); end if;
    v_n := private.dream_streak(p_user);
    if v_n >= 3 then perform private.award_badge(p_user, 'streak_3'); end if;
    if v_n >= 7 then perform private.award_badge(p_user, 'streak_7'); end if;
    if v_n >= 30 then perform private.award_badge(p_user, 'streak_30'); end if;
  end if;

  if p_scope in ('vision', 'all') and private.ledger_count(p_user, 'vision_created') >= 1 then
    perform private.award_badge(p_user, 'first_vision');
  end if;

  if p_scope in ('diary', 'all') and private.ledger_count(p_user, 'diary_posted') >= 1 then
    perform private.award_badge(p_user, 'first_diary');
  end if;

  if p_scope in ('social', 'all') then
    if private.ledger_count(p_user, 'comment_posted') >= 25 then perform private.award_badge(p_user, 'comments_25'); end if;
    if private.ledger_count(p_user, 'like_received') >= 50 then perform private.award_badge(p_user, 'likes_received_50'); end if;
    if private.ledger_count(p_user, 'mana_sent') >= 10 then perform private.award_badge(p_user, 'mana_giver_10'); end if;
  end if;

  if p_scope in ('friend', 'all') and private.ledger_count(p_user, 'friend_made') >= 5 then
    perform private.award_badge(p_user, 'friends_5');
  end if;

  if p_scope in ('referral', 'all') and private.ledger_count(p_user, 'referral_inviter') >= 1 then
    perform private.award_badge(p_user, 'ambassador');
  end if;

  if p_scope in ('quest', 'all') and private.ledger_count(p_user, 'daily_quests_bonus') >= 7 then
    perform private.award_badge(p_user, 'quest_master');
  end if;
exception when others then
  raise warning 'evaluate_badges(%) failed: % %', p_user, sqlstate, sqlerrm;
end $$;

create or replace function private.maybe_award_quest_bonus(p_user uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_open integer;
begin
  select count(*) into v_open
    from public.daily_quests(v_day) q
   where (select count(*) from public.lunos_points_ledger l
           where l.user_id = p_user
             and l.reason = q.reason
             and l.created_at >= v_day::timestamp at time zone 'utc') < q.target;

  -- İç içe IF bilerek: SQL'de AND kısa devresi garanti değil, award_xp'nin
  -- görevler bitmeden çalışmaması gerekiyor.
  if v_open = 0 then
    if private.award_xp(p_user, 'daily_quests_bonus', 'quests:' || v_day::text) > 0 then
      perform private.evaluate_badges(p_user, 'quest');
    end if;
  end if;
end $$;

-- Ledger -> özet. Her XP hareketi user_progress'i günceller; bugünkü bir
-- görev hareketiyse görev sandığını kontrol eder.
create or replace function private.ledger_apply_progress()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_progress as up (user_id, xp, rank, updated_at)
  values (new.user_id, greatest(new.delta, 0), public.xp_rank(greatest(new.delta, 0)), now())
  on conflict (user_id) do update
     set xp = greatest(up.xp + new.delta, 0),
         rank = public.xp_rank(greatest(up.xp + new.delta, 0)),
         updated_at = now();

  if new.created_at >= ((now() at time zone 'utc')::date)::timestamp at time zone 'utc'
     and new.reason in (select q.reason from public.daily_quests((now() at time zone 'utc')::date) q) then
    perform private.maybe_award_quest_bonus(new.user_id);
  end if;
  return null;
end $$;

drop trigger if exists trg_ledger_apply_progress on public.lunos_points_ledger;
create trigger trg_ledger_apply_progress
  after insert on public.lunos_points_ledger
  for each row execute function private.ledger_apply_progress();

-- ---------------------------------------------------------------------------
-- 5) Kaynak trigger'ları
-- ---------------------------------------------------------------------------
create or replace function private.xp_on_dream_insert()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.is_bot_generated, false) then return null; end if;
  perform private.award_xp(new.user_id, 'dream_posted', 'dream:' || new.id);
  perform private.evaluate_badges(new.user_id, 'dream');
  return null;
end $$;

drop trigger if exists trg_xp_dream_insert on public.dreams;
create trigger trg_xp_dream_insert after insert on public.dreams
  for each row execute function private.xp_on_dream_insert();

-- Ortak yorum ödülü: yazan +, sahip +. Kendi içeriğine yorum, çok kısa yorum
-- (<6 karakter, "👍" gibi) ve bot içerik sahibi ödül almaz. Aynı gönderiye
-- aynı gün ikinci yorum ödül üretmez.
create or replace function private.award_comment(p_author uuid, p_owner uuid, p_owner_is_bot boolean, p_target text, p_content text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_day text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
begin
  if p_owner is null or p_owner = p_author or char_length(btrim(coalesce(p_content, ''))) < 6 then return; end if;
  perform private.award_xp(p_author, 'comment_posted', 'comment:' || p_target || ':' || v_day);
  if not p_owner_is_bot then
    perform private.award_xp(p_owner, 'comment_received', 'comment_rcv:' || p_target || ':' || p_author || ':' || v_day);
  end if;
  perform private.evaluate_badges(p_author, 'social');
end $$;

create or replace function private.xp_on_dream_comment()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_bot boolean;
begin
  select d.user_id, coalesce(d.is_bot_generated, false) into v_owner, v_bot from public.dreams d where d.id = new.dream_id;
  perform private.award_comment(new.user_id, v_owner, coalesce(v_bot, false), 'dream:' || new.dream_id, new.content);
  return null;
end $$;

drop trigger if exists trg_xp_dream_comment on public.comments;
create trigger trg_xp_dream_comment after insert on public.comments
  for each row execute function private.xp_on_dream_comment();

create or replace function private.xp_on_goal_comment()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select g.user_id into v_owner from public.goals g where g.id = new.goal_id;
  perform private.award_comment(new.user_id, v_owner, false, 'goal:' || new.goal_id, new.content);
  return null;
end $$;

drop trigger if exists trg_xp_goal_comment on public.goal_comments;
create trigger trg_xp_goal_comment after insert on public.goal_comments
  for each row execute function private.xp_on_goal_comment();

create or replace function private.xp_on_diary_comment()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select e.user_id into v_owner from public.diary_entries e where e.id = new.diary_entry_id;
  perform private.award_comment(new.user_id, v_owner, false, 'diary:' || new.diary_entry_id, new.content);
  return null;
end $$;

drop trigger if exists trg_xp_diary_comment on public.diary_comments;
create trigger trg_xp_diary_comment after insert on public.diary_comments
  for each row execute function private.xp_on_diary_comment();

-- Ortak beğeni ödülü: dedupe hedef başına (beğen/geri al/beğen puan üretmez).
create or replace function private.award_like(p_liker uuid, p_owner uuid, p_owner_is_bot boolean, p_target text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_owner is null or p_owner = p_liker then return; end if;
  perform private.award_xp(p_liker, 'like_given', 'like:' || p_target);
  if not p_owner_is_bot then
    perform private.award_xp(p_owner, 'like_received', 'like_rcv:' || p_target || ':' || p_liker);
    perform private.evaluate_badges(p_owner, 'social');
  end if;
end $$;

create or replace function private.xp_on_dream_like()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_bot boolean;
begin
  select d.user_id, coalesce(d.is_bot_generated, false) into v_owner, v_bot from public.dreams d where d.id = new.dream_id;
  perform private.award_like(new.user_id, v_owner, coalesce(v_bot, false), 'dream:' || new.dream_id);
  return null;
end $$;

drop trigger if exists trg_xp_dream_like on public.likes;
create trigger trg_xp_dream_like after insert on public.likes
  for each row execute function private.xp_on_dream_like();

create or replace function private.xp_on_diary_like()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  select e.user_id into v_owner from public.diary_entries e where e.id = new.diary_entry_id;
  perform private.award_like(new.user_id, v_owner, false, 'diary:' || new.diary_entry_id);
  return null;
end $$;

drop trigger if exists trg_xp_diary_like on public.diary_likes;
create trigger trg_xp_diary_like after insert on public.diary_likes
  for each row execute function private.xp_on_diary_like();

-- Mana gönderen ödülü (alıcı zaten handle_goal_reaction ile 'mana_given' alıyor).
create or replace function private.xp_on_mana_sent()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_xp(new.sender_id, 'mana_sent',
    'mana_sent:' || new.goal_id || ':' || to_char(now() at time zone 'utc', 'YYYY-MM-DD'));
  perform private.evaluate_badges(new.sender_id, 'social');
  return null;
end $$;

drop trigger if exists trg_xp_mana_sent on public.goal_reactions;
create trigger trg_xp_mana_sent after insert on public.goal_reactions
  for each row execute function private.xp_on_mana_sent();

create or replace function private.xp_on_goal_insert()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.source_goal_id is not null then return null; end if; -- kopyalanan vizyon ödül almaz
  perform private.award_xp(new.user_id, 'vision_created', 'vision:' || new.id);
  perform private.evaluate_badges(new.user_id, 'vision');
  return null;
end $$;

drop trigger if exists trg_xp_goal_insert on public.goals;
create trigger trg_xp_goal_insert after insert on public.goals
  for each row execute function private.xp_on_goal_insert();

create or replace function private.xp_on_diary_insert()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_xp(new.user_id, 'diary_posted', 'diary:' || new.id);
  perform private.evaluate_badges(new.user_id, 'diary');
  return null;
end $$;

drop trigger if exists trg_xp_diary_insert on public.diary_entries;
create trigger trg_xp_diary_insert after insert on public.diary_entries
  for each row execute function private.xp_on_diary_insert();

create or replace function private.xp_on_friendship()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_pair text;
begin
  if new.status <> 'accepted' then return null; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'accepted' then return null; end if;
  end if;
  v_pair := least(new.user_id::text, new.friend_id::text) || ':' || greatest(new.user_id::text, new.friend_id::text);
  perform private.award_xp(new.user_id, 'friend_made', 'friend:' || v_pair);
  perform private.award_xp(new.friend_id, 'friend_made', 'friend:' || v_pair);
  perform private.evaluate_badges(new.user_id, 'friend');
  perform private.evaluate_badges(new.friend_id, 'friend');
  return null;
end $$;

drop trigger if exists trg_xp_friendship on public.friendships;
create trigger trg_xp_friendship after insert or update of status on public.friendships
  for each row execute function private.xp_on_friendship();

create or replace function private.xp_on_referral()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_xp(new.inviter_id, 'referral_inviter', 'referral:' || new.invited_user_id);
  perform private.award_xp(new.invited_user_id, 'referral_joined', 'referral_joined');
  perform private.evaluate_badges(new.inviter_id, 'referral');
  return null;
end $$;

drop trigger if exists trg_xp_referral on public.referrals;
create trigger trg_xp_referral after insert on public.referrals
  for each row execute function private.xp_on_referral();

create or replace function private.xp_on_seed_completed()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_completed and not coalesce(old.is_completed, false) then
    perform private.award_xp(new.user_id, 'seed_completed', 'seed:' || new.id);
  end if;
  return null;
end $$;

drop trigger if exists trg_xp_seed_completed on public.daily_seeds;
create trigger trg_xp_seed_completed after update of is_completed on public.daily_seeds
  for each row execute function private.xp_on_seed_completed();

create or replace function private.xp_on_profile_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_compass_changed boolean;
  v_profile_changed boolean;
begin
  -- INSERT'te OLD'a hiç dokunmuyoruz.
  if tg_op = 'INSERT' then
    v_compass_changed := true;
    v_profile_changed := true;
  else
    v_compass_changed := new.last_compass_check_in is distinct from old.last_compass_check_in;
    v_profile_changed := new.avatar_url is distinct from old.avatar_url or new.bio is distinct from old.bio;
  end if;

  if v_compass_changed and new.last_compass_check_in is not null then
    perform private.award_xp(new.id, 'compass_checkin',
      'compass:' || to_char(new.last_compass_check_in at time zone 'utc', 'YYYY-MM-DD'));
  end if;

  if v_profile_changed
     and nullif(btrim(coalesce(new.avatar_url, '')), '') is not null
     and nullif(btrim(coalesce(new.bio, '')), '') is not null then
    perform private.award_xp(new.id, 'profile_completed', 'profile_completed');
  end if;
  return null;
end $$;

drop trigger if exists trg_xp_profile_change on public.user_profiles;
create trigger trg_xp_profile_change after insert or update of last_compass_check_in, avatar_url, bio on public.user_profiles
  for each row execute function private.xp_on_profile_change();

-- ---------------------------------------------------------------------------
-- 6) İstemci RPC'leri
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: yalnızca çağıranın kendi satırları okunuyor, RLS yeterli.
create or replace function public.get_my_progress()
returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_day_start timestamptz := ((now() at time zone 'utc')::date)::timestamp at time zone 'utc';
  v_week_start timestamptz := date_trunc('week', now() at time zone 'utc') at time zone 'utc';
  v_thr integer[] := public.xp_rank_thresholds();
  v_xp integer := 0;
  v_rank smallint := 0;
  v_onb text := 'none';
begin
  if v_user is not null then
    select p.xp, p.rank, p.onboarding_status into v_xp, v_rank, v_onb
      from public.user_progress p where p.user_id = v_user;
  end if;
  v_xp := coalesce(v_xp, 0);
  v_rank := coalesce(v_rank, 0);
  v_onb := coalesce(v_onb, 'none');

  return jsonb_build_object(
    'xp', v_xp,
    'rank', v_rank,
    'max_rank', array_length(v_thr, 1) - 1,
    'rank_min_xp', v_thr[v_rank + 1],
    'next_rank_xp', v_thr[v_rank + 2],
    'thresholds', to_jsonb(v_thr),
    'onboarding_status', v_onb,
    'is_guest', v_user is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false),
    'today_xp', coalesce((select sum(l.delta) from public.lunos_points_ledger l
                           where l.user_id = v_user and l.created_at >= v_day_start), 0),
    'weekly_xp', coalesce((select sum(l.delta) from public.lunos_points_ledger l
                            where l.user_id = v_user and l.created_at >= v_week_start), 0),
    'quests', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', q.code,
               'target', q.target,
               'xp', (select r.xp from public.xp_rules() r where r.reason = q.reason),
               'progress', least(q.target, (select count(*) from public.lunos_points_ledger l
                                             where l.user_id = v_user and l.reason = q.reason
                                               and l.created_at >= v_day_start))
             ) order by q.ord)
        from public.daily_quests(v_day) q), '[]'::jsonb),
    'quests_bonus_xp', (select r.xp from public.xp_rules() r where r.reason = 'daily_quests_bonus'),
    'quests_bonus_claimed', exists (select 1 from public.lunos_points_ledger l
                                     where l.user_id = v_user and l.dedupe_key = 'quests:' || v_day::text),
    'quests_reset_at', (v_day + 1)::timestamp at time zone 'utc',
    'badges', (select jsonb_agg(jsonb_build_object(
                 'code', b.code,
                 'xp', b.xp,
                 'earned_at', (select l.created_at from public.lunos_points_ledger l
                                where l.user_id = v_user and l.dedupe_key = 'badge:' || b.code)
               ) order by b.sort)
                 from public.badge_defs() b),
    'rules', (select jsonb_agg(jsonb_build_object('reason', r.reason, 'xp', r.xp, 'daily_cap', r.daily_cap))
                from public.xp_rules() r),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
               'reason', x.reason, 'delta', x.delta, 'created_at', x.created_at, 'badge', x.badge
             ) order by x.created_at desc)
        from (select l.reason, l.delta, l.created_at,
                     case when l.reason = 'badge_earned' then substr(l.dedupe_key, 7) end as badge
                from public.lunos_points_ledger l
               where l.user_id = v_user
               order by l.created_at desc
               limit 15) x), '[]'::jsonb)
  );
end $$;

create or replace function public.finish_onboarding(p_completed boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_anon boolean;
  v_awarded integer := 0;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select u.is_anonymous into v_anon from auth.users u where u.id = v_user;
  if v_anon is distinct from false then
    return jsonb_build_object('awarded', 0, 'status', 'guest');
  end if;

  if p_completed then
    v_awarded := private.award_xp(v_user, 'onboarding_completed', 'onboarding_completed');
    insert into public.user_progress as up (user_id, onboarding_status) values (v_user, 'completed')
    on conflict (user_id) do update set onboarding_status = 'completed', updated_at = now();
  else
    insert into public.user_progress as up (user_id, onboarding_status) values (v_user, 'skipped')
    on conflict (user_id) do update
       set onboarding_status = case when up.onboarding_status = 'completed' then 'completed' else 'skipped' end,
           updated_at = now();
  end if;

  return jsonb_build_object(
    'awarded', v_awarded,
    'status', (select p.onboarding_status from public.user_progress p where p.user_id = v_user)
  );
end $$;

-- Liderlik: yalnızca herkese açık, misafir olmayan ve bot/sistem içeriği
-- olmayan hesaplar; çağıran kendisi (gizli profil olsa bile) her zaman görür.
create or replace function public.get_leaderboard(p_period text default 'week', p_limit integer default 20)
returns table (pos bigint, user_id uuid, display_name text, username text, avatar_url text, xp bigint, rank smallint, is_me boolean)
language sql stable security definer set search_path = '' as $$
  with me as (select auth.uid() as id),
  scores as (
    select p.user_id, p.xp::bigint as xp
      from public.user_progress p
     where p_period = 'all' and p.xp > 0
    union all
    select l.user_id, sum(l.delta)::bigint
      from public.lunos_points_ledger l
     where p_period <> 'all'
       and l.created_at >= date_trunc('week', now() at time zone 'utc') at time zone 'utc'
     group by l.user_id
    having sum(l.delta) > 0
  ),
  eligible as (
    select s.user_id, s.xp, up.display_name, up.username, up.avatar_url,
           coalesce(pr.rank, 0)::smallint as rank,
           (s.user_id = (select id from me)) as is_me
      from scores s
      join public.user_profiles up on up.id = s.user_id
      left join public.user_progress pr on pr.user_id = s.user_id
     where not up.is_guest
       and (s.user_id = (select id from me)
            or (up.profile_visibility = 'public'
                and not exists (select 1 from public.dreams d
                                 where d.user_id = s.user_id and d.is_bot_generated)))
  ),
  ranked as (
    select row_number() over (order by e.xp desc, e.user_id) as pos, e.* from eligible e
  )
  select r.pos, r.user_id, r.display_name, r.username, r.avatar_url, r.xp, r.rank, r.is_me
    from ranked r
   where r.pos <= least(greatest(coalesce(p_limit, 20), 1), 100) or r.is_me
   order by r.pos
$$;

-- Başkasının rütbe/rozetleri — profil görünürlüğüne saygılı.
create or replace function public.get_public_progress(p_user uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_viewer uuid := auth.uid();
  v_vis text;
  v_guest boolean;
begin
  select up.profile_visibility, up.is_guest into v_vis, v_guest
    from public.user_profiles up where up.id = p_user;
  if v_vis is null or v_guest then return null; end if;

  if not (v_vis = 'public'
          or v_viewer = p_user
          or (v_vis = 'friends' and v_viewer is not null and exists (
                select 1 from public.friendships f
                 where f.status = 'accepted'
                   and ((f.user_id = v_viewer and f.friend_id = p_user)
                     or (f.user_id = p_user and f.friend_id = v_viewer))))) then
    return null;
  end if;

  return jsonb_build_object(
    'xp', coalesce((select p.xp from public.user_progress p where p.user_id = p_user), 0),
    'rank', coalesce((select p.rank from public.user_progress p where p.user_id = p_user), 0),
    'badges', coalesce((select jsonb_agg(substr(l.dedupe_key, 7) order by l.created_at)
                          from public.lunos_points_ledger l
                         where l.user_id = p_user and l.reason = 'badge_earned'), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------------
-- 7) Yetkiler
-- ---------------------------------------------------------------------------
revoke all on function private.award_xp(uuid, text, text, integer) from public, anon, authenticated;
revoke all on function private.award_badge(uuid, text) from public, anon, authenticated;
revoke all on function private.ledger_count(uuid, text) from public, anon, authenticated;
revoke all on function private.dream_streak(uuid) from public, anon, authenticated;
revoke all on function private.evaluate_badges(uuid, text) from public, anon, authenticated;
revoke all on function private.maybe_award_quest_bonus(uuid) from public, anon, authenticated;
revoke all on function private.award_comment(uuid, uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function private.award_like(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function private.ledger_apply_progress() from public, anon, authenticated;
revoke all on function private.xp_on_dream_insert() from public, anon, authenticated;
revoke all on function private.xp_on_dream_comment() from public, anon, authenticated;
revoke all on function private.xp_on_goal_comment() from public, anon, authenticated;
revoke all on function private.xp_on_diary_comment() from public, anon, authenticated;
revoke all on function private.xp_on_dream_like() from public, anon, authenticated;
revoke all on function private.xp_on_diary_like() from public, anon, authenticated;
revoke all on function private.xp_on_mana_sent() from public, anon, authenticated;
revoke all on function private.xp_on_goal_insert() from public, anon, authenticated;
revoke all on function private.xp_on_diary_insert() from public, anon, authenticated;
revoke all on function private.xp_on_friendship() from public, anon, authenticated;
revoke all on function private.xp_on_referral() from public, anon, authenticated;
revoke all on function private.xp_on_seed_completed() from public, anon, authenticated;
revoke all on function private.xp_on_profile_change() from public, anon, authenticated;

revoke all on function public.get_my_progress() from public, anon;
revoke all on function public.finish_onboarding(boolean) from public, anon;
revoke all on function public.get_leaderboard(text, integer) from public, anon;
revoke all on function public.get_public_progress(uuid) from public, anon;
grant execute on function public.get_my_progress() to authenticated;
grant execute on function public.finish_onboarding(boolean) to authenticated;
grant execute on function public.get_leaderboard(text, integer) to authenticated;
grant execute on function public.get_public_progress(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Geçmiş aktiviteyi aynı kurallarla XP'ye çevir (orijinal tarihleriyle,
--    günlük limitler o günlere göre uygulanır). Dedupe anahtarları canlı
--    trigger'larla aynı: sonradan tekrar ödül üretilmez.
-- ---------------------------------------------------------------------------
with real_users as (
  select u.id from auth.users u where not coalesce(u.is_anonymous, false)
),
src as (
  select d.user_id, 'dream_posted'::text as reason, d.created_at, 'dream:' || d.id as dedupe
    from public.dreams d where not coalesce(d.is_bot_generated, false)
  union all
  select e.user_id, 'diary_posted', e.created_at, 'diary:' || e.id from public.diary_entries e
  union all
  select g.user_id, 'vision_created', g.created_at, 'vision:' || g.id
    from public.goals g where g.source_goal_id is null
  union all
  select c.user_id, 'comment_posted', c.created_at,
         'comment:dream:' || c.dream_id || ':' || to_char(c.created_at at time zone 'utc', 'YYYY-MM-DD')
    from public.comments c join public.dreams d on d.id = c.dream_id
   where d.user_id <> c.user_id and char_length(btrim(coalesce(c.content, ''))) >= 6
  union all
  select d.user_id, 'comment_received', c.created_at,
         'comment_rcv:dream:' || c.dream_id || ':' || c.user_id || ':' || to_char(c.created_at at time zone 'utc', 'YYYY-MM-DD')
    from public.comments c join public.dreams d on d.id = c.dream_id
   where d.user_id <> c.user_id and not coalesce(d.is_bot_generated, false)
     and char_length(btrim(coalesce(c.content, ''))) >= 6
  union all
  select c.user_id, 'comment_posted', c.created_at,
         'comment:goal:' || c.goal_id || ':' || to_char(c.created_at at time zone 'utc', 'YYYY-MM-DD')
    from public.goal_comments c join public.goals g on g.id = c.goal_id
   where g.user_id <> c.user_id and char_length(btrim(coalesce(c.content, ''))) >= 6
  union all
  select g.user_id, 'comment_received', c.created_at,
         'comment_rcv:goal:' || c.goal_id || ':' || c.user_id || ':' || to_char(c.created_at at time zone 'utc', 'YYYY-MM-DD')
    from public.goal_comments c join public.goals g on g.id = c.goal_id
   where g.user_id <> c.user_id and char_length(btrim(coalesce(c.content, ''))) >= 6
  union all
  select l.user_id, 'like_given', l.created_at, 'like:dream:' || l.dream_id
    from public.likes l join public.dreams d on d.id = l.dream_id
   where d.user_id <> l.user_id
  union all
  select d.user_id, 'like_received', l.created_at, 'like_rcv:dream:' || l.dream_id || ':' || l.user_id
    from public.likes l join public.dreams d on d.id = l.dream_id
   where d.user_id <> l.user_id and not coalesce(d.is_bot_generated, false)
  union all
  select r.sender_id, 'mana_sent', r.created_at,
         'mana_sent:' || r.goal_id || ':' || to_char(r.created_at at time zone 'utc', 'YYYY-MM-DD')
    from public.goal_reactions r
  union all
  select x.uid, 'friend_made', coalesce(f.updated_at, f.created_at) at time zone 'utc',
         'friend:' || least(f.user_id::text, f.friend_id::text) || ':' || greatest(f.user_id::text, f.friend_id::text)
    from public.friendships f
    cross join lateral (values (f.user_id), (f.friend_id)) x(uid)
   where f.status = 'accepted'
  union all
  select s.user_id, 'seed_completed', s.created_at, 'seed:' || s.id
    from public.daily_seeds s where s.is_completed
  union all
  select p.id, 'compass_checkin', p.last_compass_check_in,
         'compass:' || to_char(p.last_compass_check_in at time zone 'utc', 'YYYY-MM-DD')
    from public.user_profiles p where p.last_compass_check_in is not null
  union all
  select p.id, 'profile_completed', coalesce(p.updated_at, p.created_at) at time zone 'utc', 'profile_completed'
    from public.user_profiles p
   where nullif(btrim(coalesce(p.avatar_url, '')), '') is not null
     and nullif(btrim(coalesce(p.bio, '')), '') is not null
),
dedup as (
  select distinct on (s.user_id, s.dedupe) s.* from src s
   where s.user_id in (select id from real_users)
   order by s.user_id, s.dedupe, s.created_at
),
capped as (
  select d.*, row_number() over (
           partition by d.user_id, d.reason, (d.created_at at time zone 'utc')::date
           order by d.created_at) as rn
    from dedup d
)
insert into public.lunos_points_ledger (user_id, delta, reason, dedupe_key, created_at)
select c.user_id, r.xp, c.reason, c.dedupe, c.created_at
  from capped c
  join public.xp_rules() r on r.reason = c.reason
 where r.daily_cap is null or c.rn <= r.daily_cap
on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

select private.evaluate_badges(u.id, 'all') from auth.users u where not coalesce(u.is_anonymous, false);

-- Özet = ledger toplamı (eski 'mana_given' satırları dahil; trigger'dan önce
-- yazılmış satırlar da sayılsın diye sonda tam yeniden hesap).
insert into public.user_progress (user_id, xp, rank, updated_at)
select l.user_id, greatest(sum(l.delta), 0)::integer, public.xp_rank(greatest(sum(l.delta), 0)::integer), now()
  from public.lunos_points_ledger l
  join auth.users u on u.id = l.user_id
 group by l.user_id
on conflict (user_id) do update set xp = excluded.xp, rank = excluded.rank, updated_at = now();
