-- 018: Günün Pusulası okumasını sunucuda sakla + tanıtım turu ödülü 60 XP.
--   * user_profiles.last_compass_reading: o günün okuması. Pusula bugün
--     kullanıldıysa API 429 yerine bu okumayı döndürür (cihaz önbelleği yoksa
--     — yeniden kurulum / başka cihaz — kullanıcı sadece geri sayım görüyordu).
--   * xp_rules('onboarding_completed') 50 -> 60: tura "Menüleri tanı" bölümü
--     eklendi (6 bölüm x 10 XP; OnboardingScreen.XP_PER_CHAPTER ile aynı).
-- Uygulandı: 2026-09-29 (compass_store_daily_reading, onboarding_xp_60_for_menu_chapter)

alter table public.user_profiles add column if not exists last_compass_reading jsonb;

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
    ('mana_given',            1, null::integer),
    ('friend_made',          10, 5),
    ('referral_inviter',    100, null),
    ('referral_joined',      20, null),
    ('compass_checkin',       5, 1),
    ('seed_completed',       10, 3),
    ('onboarding_completed', 60, null),
    ('profile_completed',    30, null),
    ('daily_quests_bonus',   30, 1),
    ('content_shared',        5, 5)
  ) v(reason, xp, daily_cap)
$$;
