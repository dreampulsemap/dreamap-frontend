-- gumroad_webhook_events'in Google Play karşılığı: her doğrulanan satın
-- almanın bir kaydı, purchase_token üzerinden idempotency sağlar (aynı
-- token iki kez işlenmez). Dosya adındaki xxxx'i migration numaralandırma
-- sıranıza göre değiştirin (ör. mevcut en son migration + 1).

create table if not exists google_play_purchases (
  id bigint generated always as identity primary key,
  purchase_token text not null unique,
  product_id text not null,
  purchase_type text not null check (purchase_type in ('subscription', 'aura_pack')),
  user_id uuid not null references auth.users(id),
  status text not null,
  auras_added integer not null default 0,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index if not exists google_play_purchases_user_id_idx
  on google_play_purchases(user_id);

-- Servis-rolü client (supabaseAdmin) her zaman RLS'i bypass eder; bu satır
-- yalnızca dashboard'dan yanlışlıkla anon/authenticated erişim açılırsa diye
-- güvenlik ağı olarak ekleniyor (diğer tablolarla tutarlı).
alter table google_play_purchases enable row level security;
