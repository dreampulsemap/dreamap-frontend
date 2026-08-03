-- 008_admin_dream_image_gift.sql
-- Yeni /admin/dream-images panelinden bir rüyaya Pixabay görseli
-- hediye edildiğinde kullanıcıya uygulama-içi bildirim (notifications
-- tablosu → Navbar zili) gönderebilmek için notifications.type
-- listesine 'dream_image_gift' ekliyor.
-- Idempotent: birden fazla kez çalıştırılabilir.

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'notifications_type_check'
  ) then
    alter table notifications drop constraint notifications_type_check;
  end if;

  alter table notifications add constraint notifications_type_check
    check (type = ANY (ARRAY[
      'mana_received'::text,
      'goal_comment'::text,
      'friend_request'::text,
      'friend_accepted'::text,
      'dream_image_gift'::text
    ]));
end $$;
