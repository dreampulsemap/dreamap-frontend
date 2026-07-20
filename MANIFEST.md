# Değişiklik Manifestosu

Bu paket, sohbet boyunca DÜZENLENEN veya YENİ OLUŞTURULAN tüm dosyaları içerir.
Klasör yapısı proje kök dizinine göredir — dosyaları kendi projenizdeki
karşılıklarının üzerine kopyalayabilirsiniz (yeni dosyalar zaten doğru yolda).

## 1) DailyCompass çift-metin flaşı + genel dil flaşı
- `components/DailyCompass.jsx` — DÜZENLENDİ: Touch/Pointer event çifte tetiklemesi
  giderildi (iki interval'ın yarışıp iki farklı okuma metni göstermesi sorunu),
  interval sızıntısı ve unmount temizliği eklendi.
- `components/Navbar.jsx` — DÜZENLENDİ: nav linkleri + "Giriş" metni artık
  mount öncesi skeleton gösteriyor (İngilizce→Türkçe flaşı yok).
- `components/LanguageSwitcher.jsx` — DÜZENLENDİ: bayrak/dil adı skeleton'dan
  sonra beliriyor.
- `components/Hero.jsx` — DÜZENLENDİ: başlık bloğu mount olana kadar opacity-0,
  sonra fade-in.
- `pages/index.js`, `pages/explore.js`, `pages/profile.js` — DÜZENLENDİ: üst
  başlık/filtre barları aynı fade-in yaklaşımıyla.
- `pages/add-dream.js` — DÜZENLENDİ: "Loading..." metni skeleton'a çevrildi.
- `components/TextSkeleton.jsx` — YENİ: paylaşılan skeleton bileşeni.

## 2) "Kendi rüyana hediye analiz al" bug'ı
- `components/DreamCard.jsx` — DÜZENLENDİ: `isOwner` artık ebeveyn sayfadan
  gelen `currentUserId` prop'una öncelik veriyor (her kartın kendi başına
  yaptığı asenkron auth sorgusu yarış durumu yaratıyordu).
- `pages/index.js`, `pages/profile.js` — DÜZENLENDİ: `currentUserId={user?.id}`
  DreamCard'a geçiriliyor.
- `pages/explore.js` — DÜZENLENDİ: sayfada hiç olmayan `user` state'i eklendi,
  DreamCard'a `currentUserId` geçiriliyor.

## 3) Ana Akış filtreleri (Arketipler / Derin Duygular) zenginleştirmesi
- `pages/index.js` — DÜZENLENDİ: "Arketipler" artık feed'deki gerçek arketiplerden
  canlı bir chip listesi üretip filtreliyor (eskiden "arketip var mı" kontrolü her
  zaman true oluyordu). "Derin Duygular" 3 duygudan 8 duyguya çıkarıldı ve virgülle
  ayrılmış çoklu duygu değerlerini doğru işliyor.

## 4) Explore kullanıcı arama bug'ı + Instagram-tarzı arama UI (TAMAMLANDI)
- `pages/api/friends/search.js` — DÜZENLENDİ: arkadaşlık durumu sorgusundaki
  geçersiz PostgREST `OR` sözdizimi (`and()` eksikliği) düzeltildi, `.single()`
  yerine `.maybeSingle()` kullanıldı.
- `pages/explore.js` — DÜZENLENDİ: üst başlığın altına debounce'lu (350ms)
  kullanıcı arama kutusu eklendi. Arama aktifken rüya ızgarası yerine
  avatar/kullanıcı adı/Takip Et butonlu sonuç listesi gösteriliyor.
  Takip butonu `friendshipStatus`'a göre Takip Et / Bekliyor / Takipte olarak
  değişiyor, `/api/friends/request`'i çağırıyor.

## 8) Daily Seeds UI (TAMAMLANDI)
- `components/DailySeedsPanel.jsx` — YENİ: kullanıcının aktif hedefleri için
  bugünkü AI önerilerini listeler, henüz üretilmemiş hedefler için "Tohum Üret"
  butonu gösterir (`/api/daily-seeds/generate`), checkbox ile tamamlanma
  işaretlenir (`/api/daily-seeds/complete`, iyimser güncelleme).
- `pages/vision-board.js` — DÜZENLENDİ: panel header'ın altına eklendi,
  kullanıcının aktif hedefleri ayrıca `mode=own&status=active` ile çekiliyor.

## 9) Referral (Davet) UI (TAMAMLANDI)
- `components/ReferralWidget.jsx` — YENİ: davet linkini (`/auth?ref=<id>`)
  gösterir, kopyala butonu, toplam davet/kredi istatistiği (`/api/referrals/stats`).
- `pages/vision-board.js` — DÜZENLENDİ: widget header'ın altına eklendi.


## 5) Lunosfer.com pivotu — Supabase şeması (EK/idempotent)
- `002_lunosfer_schema_additive.sql` — YENİ: goals, micro_goals, daily_seeds,
  goal_reactions, goal_comments, lunos_points_ledger, image_credit_transactions,
  referrals, mental_wall_reports tabloları + trigger'lar + RLS policy'leri.
  Mevcut user_profiles/dreams/friendships/likes/comments tablolarına DOKUNMUYOR,
  yalnızca user_profiles'a 5 yeni kolon ekliyor.

## 6) Lunosfer.com pivotu — API route'ları (YENİ)
- `lib/supabaseAdmin.js` — ortak admin client + Bearer token doğrulama yardımcıları
- `pages/api/goals/create.js`, `list.js`, `update-status.js`, `delete.js`
- `pages/api/goals/give-mana.js` — mana verme/geri alma (bakiye kontrolü insert'ten önce)
- `pages/api/goals/comment.js` — hedef yorumları
- `pages/api/micro-goals/create.js`, `toggle.js`, `delete.js` — Yol Haritası
- `pages/api/daily-seeds/generate.js` — Gemini/OpenAI ile günlük AI önerisi üretimi
- `pages/api/daily-seeds/complete.js` — günün seed'lerini listele/tamamla
- `pages/api/referrals/claim.js`, `stats.js` — davet döngüsü

## 7) Lunosfer.com pivotu — Frontend (YENİ)
- `lib/visionBoardTranslations.js` — TR/EN metinler
- `components/GoalCard.jsx` — Vision Card, 3D flip (ön: kapak+başlık, arka: mana/yorum)
- `components/CreateGoalModal.jsx` — hedef oluşturma formu (opsiyonel ilk Yol Haritası)
- `components/GoalDetailModal.jsx` — Yol Haritası checklist, tamamla/vazgeç akışı, yorumlar
- `pages/vision-board.js` — Keşfet/Hedeflerim sekmeli ana sayfa
- `components/Navbar.jsx` — "Vision" linki eklendi (madde 1'deki dosyayla birleşik)
- `pages/auth.js` — DÜZENLENDİ: `?ref=` kodu yakalanıp ilk girişte claim ediliyor
- `styles/globals.css` — DÜZENLENDİ: 3D flip için `.flip-*` utility class'ları eklendi

## 10) Tasarım/kalite yol haritası — 8 madde (bu turda tamamlanan)

| # | Madde | Durum | Ne yapıldı |
|---|---|---|---|
| 1 | N+1 sorgu düzeltmesi | Tam | `friends/search.js`: 11 DB round-trip -> 2 |
| 2 | Tipografi token ölçeği | Tam | `tailwind.config.js`'e fontSize token'ları; Vision Board + GoalCard'a uygulandı |
| 3 | Erişilebilirlik | Tam | `useModalA11y` hook (Escape/focus-trap/auto-focus), CreateGoalModal+GoalDetailModal'a bağlandı, ikon butonlara aria-label |
| 4 | Component state standardizasyonu | Tam | EmptyState.jsx/ErrorState.jsx, vision-board.js + explore.js'e uygulandı |
| 5 | Emoji -> ikon geçişi | Kısmi | lucide-react eklendi, Vision Board component setinde uygulandı. Uygulamanın geri kalanı dokunulmadı. |
| 6 | Mikro-etkileşim animasyonu | Tam | Mana verince GoalCard'da scale+glow pulse |
| 7 | next/image geçişi | Kısmi | next.config.js'deki eksik AI görsel domain'leri (Replicate, DALL-E) eklendi. Explore ızgarası + arama avatarları + GoalCard kapak (Pinterest hariç) taşındı. DreamCard.jsx'e dokunulmadı (riskli). |
| 8 | Explore 4 sekmeli hub | Tam | explore.js: Dreamscape/Vision Board/Victory Wall/Phoenix Wall sekmeleri. /vision-board sayfası silinmedi, kişisel panel olarak kaldı. |

Test edilemedi: Bu ortamda npm install / next build çalıştırma imkanı yok (network kapalı) -
değişiklikler bracket-balance kontrolünden geçti ve manuel gözden geçirildi, ama gerçek bir
derleme/runtime testi sizin ortamınızda yapılmalı.

## 11) Kalan eksiklerin tamamlanması (bu turda)

- `components/Navbar.jsx` — DÜZENLENDİ: mana bakiyesi rozeti (💧) eklendi,
  `mana-balance-updated` custom event'i dinliyor (mana verince anında güncellenir).
  DÜZELTME SIRASINDA KENDİ HATAM: `.eq('id', currentUser.id)` filtresini
  yanlışlıkla silmiştim, hemen fark edip düzelttim.
- `pages/api/goals/generate-cover.js` — YENİ: hedef için AI kapak görseli üretimi,
  `image_credits` harcıyor (atomik RPC ile), Replicate→DALL-E fallback zinciri.
- `components/GoalDetailModal.jsx` — DÜZENLENDİ: "AI Kapak Üret" butonu eklendi.
- `pages/api/mental-wall/generate.js` — YENİ: Gölge Çalışması / Mental Duvar raporu
  üretimi (rüyalar × hedefler çapraz sorgulama), aura harcıyor (atomik RPC).
- `components/MentalWallPanel.jsx` — YENİ: rapor üretme UI'ı + geçmiş raporlar,
  `vision-board.js`'e bağlandı.
- `components/DeepAnalysisConfirmationModal.jsx`, `components/StoryModeModal.jsx` —
  DÜZENLENDİ: `useModalA11y` (focus-trap/Escape) + `aria-label` eklendi.
  NOT: Bu iki dosya + `DreamComposer.jsx` için önceki turda "loading/error state
  eksik" dediğim tespit YANLIŞTI — kaba bir grep taramasına dayanıyordu, dosyaları
  gerçekten okuyunca ikisinde de zaten düzgün state yönetimi olduğunu gördüm.
  Bunun yerine gerçek eksiklik olan erişilebilirliği düzelttim.

## 12) SQL Migration Sırası (Supabase SQL Editor'de bu sırayla çalıştırın)

1. **002_lunosfer_schema_additive.sql** — temel şema (goals, micro_goals, daily_seeds,
   goal_reactions, goal_comments, lunos_points_ledger, image_credit_transactions,
   referrals, mental_wall_reports + user_profiles'a yeni kolonlar)
2. **003_security_fixes.sql** — RLS güvenlik düzeltmeleri (self-react engeli,
   friends-visibility düzeltmesi)
3. **004_mana_reset_and_race_fix.sql** — günlük mana yenilenmesi + atomik/race-safe
   bakiye düşüşü
4. **005_atomic_credit_spending.sql** — aura ve image_credits için atomik harcama
   fonksiyonları (spend_auras, spend_image_credits)

**001_lunosfer_schema.sql ÇALIŞTIRMAYIN** — ilk taslaktı, mevcut canlı tablolarla
çakışıyordu (bu yüzden "relation already exists" hatası almıştınız), 002 onun
yerini aldı.
