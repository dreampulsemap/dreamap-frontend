-- 010_android_push_and_reactions.sql
-- Native Android FCM push token kaydı + mesaj tepkileri (reaction).
-- Bu dosyayı Supabase Dashboard > SQL Editor içinde çalıştırın.
-- Var olan push_subscriptions (web push) tablosuna DOKUNMUYOR, messages'a
-- tek bir nullable kolon ekliyor — idempotent (tekrar çalıştırmak güvenli).
--
-- Bağlam: lunosfer-app (native Android) zaten POST /api/push/subscribe ve
-- POST /api/messages/react'i çağırıyor, ama bu iki route ve altyapıları
-- backend'de yoktu (istemci kodu sessizce başarısız oluyordu). Bu migration
-- onların veri katmanını hazırlıyor.

-- 1) fcm_tokens — web'in push_subscriptions'ından (endpoint/p256dh/auth
-- üçlüsü) FARKLI bir şekli var (tek bir opak token string'i), bu yüzden
-- push_subscriptions'ı nullable kolonlarla kirletmek yerine ayrı bir tabloya
-- koyduk. lib/webPush.js > sendPushToUser() artık her iki tabloyu da aynı
-- anda okuyup gönderiyor, çağıran koddan (notify.js, messages/send.js)
-- HİÇBİR değişiklik gerekmedi.
create table if not exists public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

create index if not exists fcm_tokens_user_id_idx on public.fcm_tokens(user_id);

alter table public.fcm_tokens enable row level security;

-- goal_saves ile aynı desen: yalnızca kendi token'larını görebilsin diye
-- SELECT policy var, INSERT/UPDATE/DELETE bilerek yok — token kaydı
-- yalnızca /api/push/subscribe.js (service role) üzerinden yapılabilir.
drop policy if exists fcm_tokens_select_own on public.fcm_tokens;
create policy fcm_tokens_select_own on public.fcm_tokens
  for select using (auth.uid() = user_id);

-- Not: token UNIQUE olduğu için, aynı cihazda farklı bir hesaba giriş
-- yapılırsa (fiziksel FCM token'ı aynı kalır, nadir ama mümkün), API'deki
-- upsert(on_conflict: token) o token'ı otomatik olarak YENİ kullanıcıya
-- taşır — eski hesap o cihazdan bildirim almaya devam etmez.

-- 2) messages.reaction — mesaj balonuna tek bir emoji tepkisi (Slack
-- tarzı çoklu/çok-kullanıcılı tepki değil, WhatsApp/iMessage tarzı tekil
-- tepki: bir mesajın en fazla bir "reaction" değeri olur). Sabit bir emoji
-- listesiyle kısıtlamıyoruz (istemci tarafı değişebilir) — uzunluk
-- doğrulaması API route'unda yapılıyor.
alter table public.messages
  add column if not exists reaction text;
