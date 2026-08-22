-- 011_account_deletion_readiness.sql
-- Google Play "Hesap Silme" politikası (2023) gereği eklenen
-- POST /api/account/delete endpoint'inin çalışabilmesi için ÖN KOŞUL.
--
-- Canlı veritabanına (pg_constraint + information_schema.referential_constraints)
-- doğrudan bağlanıp auth.users'a referans veren TÜM foreign key'leri
-- tek tek doğruladım. Sonuç: google_play_purchases DIŞINDA HER ŞEY zaten
-- doğru yapılandırılmış (CASCADE veya SET NULL). Tek gerçek sorun:
--
--   google_play_purchases.user_id -> auth.users(id)  ON DELETE NO ACTION, NOT NULL
--
-- Bu, satın alma yapmış (abonelik/Aura paketi) HERHANGİ bir kullanıcı
-- supabaseAdmin.auth.admin.deleteUser(userId) ile silinmeye
-- çalışıldığında foreign-key ihlaliyle BAŞARISIZ olur.
--
-- ÇÖZÜM: aynı işlevi gören gumroad_sales.user_id / gumroad_webhook_events
-- ile TAMAMEN AYNI, projenin kendi içinde zaten kullandığı desen
-- (ON DELETE SET NULL) uygulanıyor. Satır silinmez, yalnızca kişisel
-- bağ kaldırılır — satın alma kaydı (tutar/ürün/tarih) muhasebe için
-- korunur.
--
-- Idempotent: birden fazla kez çalıştırılabilir.

alter table public.google_play_purchases
  alter column user_id drop not null;

alter table public.google_play_purchases
  drop constraint if exists google_play_purchases_user_id_fkey;

alter table public.google_play_purchases
  add constraint google_play_purchases_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
