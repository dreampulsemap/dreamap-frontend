-- =====================================================================
-- KAHIN (PROPHET) — UCRETSIZ KULLANIM KOTASI
--
-- pages/api/prophet.js artik iki modda calisiyor:
--   general : kullanicinin kendi ruya + vizyonlarindan kisisel kehanet
--   ask     : kullanicinin yazdigi soruya cevap
--
-- Ucretsiz kullanici her mod icin gunde N istek yapabilir; premium uye
-- sinirsiz. Sayac ISTEMCIDE TUTULAMAZ (uygulama verisi silinerek sifirlanir),
-- bu yuzden sunucu tarafinda, kullanici+gun+mod bazinda tutuluyor.
--
-- Kota AI cagrisindan ONCE atomik olarak dusuluyor; boylece ayni anda
-- gonderilen paralel istekler limiti asamiyor. AI cagrisi basarisiz olursa
-- route dusulen hakki geri veriyor (bkz. refundProphetQuota).
-- =====================================================================

create table if not exists public.prophet_usage (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  usage_date date    not null,
  mode       text    not null check (mode in ('general', 'ask')),
  used_count integer not null default 0,
  primary key (user_id, usage_date, mode)
);

-- Gecmis gunlerin satirlarini toplu temizlemek isteyince ise yarar.
create index if not exists prophet_usage_date_idx
  on public.prophet_usage (usage_date);

-- Tabloya yalnizca service_role (sunucu) yazar. RLS acik ve hic politika
-- tanimli degil => anon/authenticated istemci satirlari goremez, yazamaz.
alter table public.prophet_usage enable row level security;

-- ---------------------------------------------------------------------
-- Kotayi atomik dusur. Donen: allowed (izin var mi), remaining (kalan hak).
--
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING tek ifadede satir kilidi
-- aldigi icin, ayni kullanicinin es zamanli iki istegi ayni sayaci iki kez
-- okuyup ikisi de gecemiyor.
-- ---------------------------------------------------------------------
create or replace function public.consume_prophet_quota(
  p_user_id uuid,
  p_mode    text,
  p_limit   integer
)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into public.prophet_usage (user_id, usage_date, mode, used_count)
  values (p_user_id, (now() at time zone 'utc')::date, p_mode, 1)
  on conflict (user_id, usage_date, mode)
    do update set used_count = public.prophet_usage.used_count + 1
  returning used_count into v_used;

  -- Limit asildiysa sayaci geri almiyoruz; gun icinde buyumesi zararsiz ve
  -- geri alma ikinci bir ifade gerektirip yarisa kapi acardi.
  return query select (v_used <= p_limit), greatest(0, p_limit - v_used);
end;
$$;

-- Fonksiyon yalnizca sunucudan (service_role) cagrilir.
revoke all on function public.consume_prophet_quota(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_prophet_quota(uuid, text, integer)
  to service_role;
