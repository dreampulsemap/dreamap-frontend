-- 017_content_sharing.sql
-- Rüya / günce / vizyon paylaşımı.
--   * messages.shared_ref: DM'de paylaşılan içeriğin SUNUCUDA üretilen anlık
--     görüntüsü (tip, id, başlık, özet, görsel, sahip). İstemci yalnızca
--     {type, id} gönderir; metni sunucu yazar (bkz. lib/shareSnapshot.js),
--     böylece sahte içerikli "paylaşım" kartı üretilemez.
--   * 'content_shared' XP'si: DM paylaşımı (tetikleyici) + dış platform
--     paylaşımı (record_share RPC). Günde en fazla 5 kez, 5'er XP.
-- Uygulandı: 2026-09-29 (MCP apply_migration: content_sharing)

-- ---------------------------------------------------------------------------
-- 1) Mesajda paylaşılan içerik
-- ---------------------------------------------------------------------------
alter table public.messages add column if not exists shared_ref jsonb;

alter table public.messages drop constraint if exists messages_content_or_attachment;
alter table public.messages add constraint messages_content_or_attachment
  check (char_length(btrim(content)) > 0 or attachment_url is not null or shared_ref is not null);

alter table public.messages drop constraint if exists messages_shared_ref_valid;
alter table public.messages add constraint messages_shared_ref_valid check (
  shared_ref is null or (
    jsonb_typeof(shared_ref) = 'object'
    and (shared_ref ->> 'type') in ('dream', 'diary', 'vision')
    and length(coalesce(shared_ref ->> 'id', '')) between 1 and 64
    and pg_column_size(shared_ref) <= 8192
  )
);

-- ---------------------------------------------------------------------------
-- 2) XP kuralı
-- ---------------------------------------------------------------------------
alter table public.lunos_points_ledger drop constraint if exists lunos_points_ledger_reason_check;
alter table public.lunos_points_ledger add constraint lunos_points_ledger_reason_check check (reason = any (array[
  'mana_given', 'ai_image_generation', 'referral_bonus', 'admin_adjustment',
  'dream_posted', 'diary_posted', 'vision_created',
  'comment_posted', 'comment_received', 'like_given', 'like_received',
  'mana_sent', 'friend_made', 'referral_inviter', 'referral_joined',
  'compass_checkin', 'seed_completed', 'onboarding_completed', 'profile_completed',
  'daily_quests_bonus', 'badge_earned', 'content_shared'
]));

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
    ('daily_quests_bonus',   30, 1),
    ('content_shared',        5, 5)
  ) v(reason, xp, daily_cap)
$$;

-- ---------------------------------------------------------------------------
-- 3) DM paylaşımı: aynı içeriği aynı kişiye tekrar göndermek puanı çoğaltmaz
-- ---------------------------------------------------------------------------
create or replace function private.xp_on_message_share()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.award_xp(
    new.sender_id, 'content_shared',
    'share:dm:' || (new.shared_ref ->> 'type') || ':' || (new.shared_ref ->> 'id') || ':' || new.recipient_id::text
  );
  return null;
end $$;
revoke all on function private.xp_on_message_share() from public;

drop trigger if exists trg_xp_message_share on public.messages;
create trigger trg_xp_message_share after insert on public.messages
  for each row when (new.shared_ref is not null) execute function private.xp_on_message_share();

-- ---------------------------------------------------------------------------
-- 4) Dış platform paylaşımı (WhatsApp, Instagram, X...). Paylaşımın gerçekten
--    yapıldığı doğrulanamaz; bu yüzden içerik başına kanal başına günde bir
--    kez ve genel günlük 5 sınırıyla (award_xp) ödüllenir. Yalnızca sahibi
--    olunan ya da herkese açık içerik sayılır. 'compass' = günün pusulası.
-- ---------------------------------------------------------------------------
create or replace function public.record_share(p_type text, p_id text, p_channel text)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_vis text;
  v_day text := ((now() at time zone 'utc')::date)::text;
begin
  if v_uid is null then return 0; end if;
  if p_channel is null or p_channel not in (
    'whatsapp', 'instagram', 'instagram_story', 'x', 'facebook', 'messenger', 'telegram',
    'snapchat', 'tiktok', 'threads', 'linkedin', 'reddit', 'pinterest', 'discord', 'other'
  ) then
    return 0;
  end if;

  if p_type = 'compass' then
    return private.award_xp(v_uid, 'content_shared', 'share:ext:compass:' || p_channel || ':' || v_day);
  elsif p_type = 'dream' then
    if p_id !~ '^[0-9]{1,18}$' then return 0; end if;
    select d.user_id, d.visibility into v_owner, v_vis from public.dreams d where d.id = p_id::bigint;
  elsif p_type = 'diary' then
    if p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return 0; end if;
    select e.user_id, e.visibility into v_owner, v_vis from public.diary_entries e where e.id = p_id::uuid;
  elsif p_type = 'vision' then
    if p_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return 0; end if;
    select g.user_id, g.visibility into v_owner, v_vis from public.goals g where g.id = p_id::uuid;
  else
    return 0;
  end if;

  if v_owner is null then return 0; end if;
  if v_owner <> v_uid and v_vis is distinct from 'public' then return 0; end if;

  return private.award_xp(v_uid, 'content_shared',
    'share:ext:' || p_type || ':' || p_id || ':' || p_channel || ':' || v_day);
end $$;
revoke all on function public.record_share(text, text, text) from public, anon;
grant execute on function public.record_share(text, text, text) to authenticated;
