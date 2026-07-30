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
5. **006_messages_schema.sql** — mesajlaşma (DM) özelliği için `messages` tablosu +
   RLS politikaları (bkz. bölüm 16)

**001_lunosfer_schema.sql ÇALIŞTIRMAYIN** — ilk taslaktı, mevcut canlı tablolarla
çakışıyordu (bu yüzden "relation already exists" hatası almıştınız), 002 onun
yerini aldı.

## 13) Explore ızgarası — kişiselleştirilmiş sıralama (Instagram Explore mantığı)

- `pages/api/explore/feed.js` — YENİ: Dreamscape ızgarasını besleyen endpoint.
  Eskiden istemci doğrudan `.order('created_at', {ascending:false})` ile Supabase'i
  sorguluyordu; artık kullanıcının en çok etkileşime girdiği arketiplere göre
  skorlanmış bir sıralama döndürüyor.
  - İlgi profili: beğenilen rüyaların arketipleri ×3, yorum yapılanlar ×5, kullanıcının
    kendi rüyaları ×1 (soğuk başlangıç yardımı). Her sinyal en fazla son 200 kayıtla
    sınırlı.
  - Nihai skor: %60 arketip eşleşmesi + %28 tazelik (48 saatte yarıya inen üstel decay)
    + %12 popülerlik (likes+2×comments, log ölçekli, ~1000 etkileşimde tavan). Arketip
    baskın ama tek başına değil — yoksa aynı içerik sonsuza dek tepede kalır ve
    etkileşim geçmişi olmayan kullanıcılarda ızgara anlamsızlaşır.
  - Sayfalama iki katmanlı: en yeni 240 rüya (RANK_POOL_SIZE) skorlanıp sayfalara
    bölünüyor; ötesi (derin scroll) düz kronolojiye dönüyor — havuz sınırıyla tam
    hizalı olduğu için tekrar/atlama olmuyor.
  - `rankToken`: ilk sayfada hesaplanan ilgi profili base64 ile encode edilip
    döndürülüyor, istemci sonraki sayfalarda geri gönderiyor — her scroll adımında
    likes/comments sorgusu tekrarlanmıyor, sadece 240'lık havuz yeniden çekilip
    skorlanıyor.
  - `asOf`: istemcinin ilk sayfada sabitlediği "şu an". Sonraki sayfalarda aynı değer
    kullanılıyor ki scroll sürerken araya yeni rüya girmesi sayfa kaymasına/tekrarına
    yol açmasın.
  - **GÜVENLİK DÜZELTMESİ:** `supabaseAdmin` RLS'i bypass eder. Orijinal kod anon
    client kullanıyordu ve private/friends rüyalarını gizlemeyi RLS policy'sine
    bırakıyordu. Admin client'a geçince bunu koda taşımak ZORUNLU oldu — yoksa
    ızgara herkesin private/friends rüyalarını global olarak sızdırırdı. dreams
    tablosunun RLS'i bu konuşmada incelenmedi; `public-profile/[userId].js`'deki
    gibi güvenli tarafta kalıp yalnızca `visibility='public'` gösteriliyor.
    'friends' rüyaları da Explore'da görünsün istersen bu filtreyi genişletmen
    gerekir.
  - Savunmacı tasarım: likes/comments sorgularından biri hata verirse (ör.
    `created_at` kolonu beklenenden farklıysa) `Promise.allSettled` ile
    yakalanıyor, o sinyal sessizce atlanıyor — tüm Explore sayfası çökmüyor,
    sadece kişiselleştirme o sinyal için devre dışı kalıyor.
- `pages/explore.js` — DÜZENLENDİ: `loadGlobalDreams` artık doğrudan Supabase
  sorgusu yerine `/api/explore/feed`'i çağırıyor; `loadHubGoals`'daki Bearer
  token deseniyle aynı (`supabase.auth.getSession()` → `Authorization` header).
  `rankTokenRef` ve `asOfRef` eklendi (sayfalar arası taşınan state). Kullanılmayan
  `BATCH_SIZE` sabiti kaldırıldı — sayfa boyutu artık API tarafında.

KAPSAM: Bu değişiklik yalnızca Explore/Dreamscape ızgarasında. Ana sayfa
(`pages/index.js`, arkadaş akışı) kronolojik kaldı — bilinçli bir tercih, çünkü
arkadaş akışını arketiple kişiselleştirmek "arkadaşının paylaşımını gizleme" gibi
hissettirebilir. İstenirse aynı mantıkla oraya da uygulanabilir.

DOĞRULANAMAYAN VARSAYIMLAR (network bu ortamda Supabase'e kapalı, canlı şema
sorgulanamadı):
- `likes` ve `comments` tablolarında `created_at` kolonu olduğu varsayıldı
  (projedeki diğer tüm tablolarda var, ama bu ikisinde select ile doğrulanmadı).
- `likes.dream_id` / `comments.dream_id` için PostgREST embedding'e güvenilmedi,
  `friends/search.js`'deki 2-adımlı fetch-then-map deseni kullanıldı.

Test edilemedi: npm install / next build bu ortamda da çalıştırılamadı (Supabase'e
ağ erişimi kapalı). Değişiklikler esbuild ile JSX dahil sözdizimi kontrolünden
geçti ve manuel gözden geçirildi; gerçek bir runtime testi sizin ortamınızda
yapılmalı.

## 14) Vizyon Slaytları artık Explore'da görünüyor

Önceki turda eklenen `goal_slides` altyapısı (SlideEditor/SlidesViewer/
`pages/api/goals/slides/*`) tamamen izole çalışıyordu — slaytlar yalnızca
`GoalDetailModal` içinden "Vizyon Slaytlarını İzle" butonuyla erişilebiliyordu,
Explore ızgarasında hiçbir iz bırakmıyordu. Bu turda Instagram Explore'un asıl
davranışı taklit edildi: bir Reel/karusel karosuna dokunmak doğrudan o içerik
türünün oynatıcısını açar.

- `pages/api/goals/list.js` — DÜZENLENDİ: `has_reacted` ile birebir aynı desende,
  sayfadaki hedeflerin `goal_slides` sayısı tek toplu sorguyla çekilip her hedefe
  `slide_count` olarak işleniyor. `mode` parametresinden bağımsız çalışıyor —
  yani bu alan Explore dışında (`pages/index.js`'in `mode=friends`/`mode=feed`
  çağrıları dahil) her yerde otomatik geliyor. GoalCard rozeti bu yüzden
  ana sayfada da görünecek (zararsız, sadece görsel bir bonus); tıklama davranışı
  (doğrudan slayt açma) SADECE Explore'da (`handleOpenGoal`) etkin, çünkü
  `GoalCard`'ın kendisi hâlâ tek bir `onOpenGoal(goal)` çağırıyor — hangi
  davranışın tetikleneceğine üst bileşen karar veriyor, `GoalCard`'ın API'si
  değişmedi.
- `components/GoalCard.jsx` — DÜZENLENDİ: `goal.slide_count > 0` ise ön yüzün
  sağ-alt köşesine küçük bir ▶ rozeti eklendi (mevcut slayt butonlarıyla aynı
  gradyan: fuchsia→purple→cyan). Saf görsel — `onOpenGoal` çağrısı hâlâ tek,
  değişmedi.
- `components/SlidesViewer.jsx` — DÜZENLENDİ: opsiyonel `onOpenDetails` prop'u
  eklendi. Verilirse sol üstte küçük, dokunulabilir bir başlık rozeti çıkıyor
  ("hedef detayına dön"). Verilmezse (GoalDetailModal içinden açılan mevcut
  kullanım) hiçbir şey değişmiyor — geriye dönük tam uyumlu.
- `pages/explore.js` — DÜZENLENDİ: `activeSlidesGoal` state'i ve `handleOpenGoal`
  eklendi — `slide_count > 0` olan bir hedefe dokununca `GoalDetailModal` yerine
  doğrudan tam ekran `SlidesViewer` açılıyor; `onOpenDetails` ile oradan tek
  dokunuşla tam detay modalına (yol haritası, mana verme, galeri) geçilebiliyor.
  Slaytı olmayan hedefler eskisi gibi doğrudan `GoalDetailModal`'a gidiyor —
  davranış değişmedi.

KAPSAM: Yalnızca Vision Board / Victory Wall / Phoenix Wall hub'ları (üçü de aynı
paylaşılan GoalCard ızgarasını kullanıyor, tek değişiklik hepsini kapsadı).
Dreamscape (rüya ızgarası, 13. bölüm) kasıtlı olarak dokunulmadı — slaytlar
hedeflere ait, rüyalara değil; iki içerik türünü tek bir sıralı akışta karıştırmak
(dreams + goal_slides birlikte skorlanan tek grid) ayrı ve çok daha büyük bir
tasarım kararı olurdu, istenirse ayrıca konuşulabilir.

TAMAMLANMADI (bilinçli olarak, kapsam dışı bırakıldı): `create.js`'deki
`sourceSlideId` ("Explore'dan kendi vizyonuna ekle") remiks mekanizması backend'de
hazır ama hiçbir UI onu tetiklemiyor — SlidesViewer'da "Kendi Vizyonuma Ekle"
butonu yok. İstenirse bir sonraki adım bu olabilir.

## 15) Navbar düzeni — ikon-öncelikli, istenen mockup'a göre

Bu turda yüklenen zip'te (`__10_`/`__2_`) Navbar.jsx, BottomNav.jsx, GoalCard.jsx,
DailyCompass.jsx, DreamComposer.jsx, Hero.jsx, dreams/UserDreamList.jsx,
profile/ProfileHeader.jsx, generate-cover.js, globals.css, tailwind.config.js
zaten değişmiş; ayrıca yeni DESIGN_SYSTEM.md/PERFORMANCE_FIXES.md/
MIGRATION_NOTES_gallery.md ve üç yeni dosya (hooks/useEnvironmentalPriming.js,
lib/anchoringSort.js, lib/subliminalDictionary.js) mevcuttu — bunlar bu
sohbette değil, aradan geçen sürede eklenmiş ve MANIFEST'e hiç işlenmemiş.
Not: bu üç yeni dosyanın hiçbiri kod tabanının hiçbir yerinden import
edilmiyor (kontrol ettim) — yani şu an devre dışı, hiçbir ekranı etkilemiyor.
`lib/subliminalDictionary.js` özellikle: içeriği açıkça "subliminal" olarak
etiketlenmiş, bilinç dışı komut/telkin metinleri içeriyor (ör. "...basılı
tutmaya devam ettikçe, her sabah buraya geleceksin" gibi kullanıcı davranışını
farkındalığın altında yönlendirmeyi hedefleyen ifadeler). Bunu bilerek
görmezden gelmedim, bu turda dokunmadım/bağlamadım ve ileride birisi bunu
bağlamamı isterse yapmayacağım — bilinç dışı manipülasyon tasarımı, standart
gamification/motivasyon tasarımından (rozet, seri, ilerleme vurgusu — bunlara
sorun yok) farklı bir kategori. `anchoringSort.js` (en çok ilerleme kaydedilen
kartı öne alma) ve `useEnvironmentalPriming.js` (oturum süresine göre yavaşça
koyulaşan arkaplan) bunun aksine standart/zararsız UX desenleri, bunlarla
ilgili bir çekincem yok.

Bu turun asıl işi — Navbar/BottomNav'ı verilen mockup'a göre ikon-öncelikli
düzene çevirmek:

- `components/Navbar.jsx` — DÜZENLENDİ: Üst bar artık 3 kolonlu grid
  (`grid-cols-[1fr_auto_1fr]`): SOL = Mana (💧 yerine `Droplet` ikonu) + Aura
  (✦ yerine `Sparkles` ikonu, tıklanınca eskisi gibi satın-alma dropdown'u
  açılıyor), ORTA = LUNOSFER logo+marka (artık gerçekten ortada, sabit),
  SAĞ = dil seçici + bildirim zili + avatar/profil (profil ESKİDEN alt bar'da
  idi, artık üst barda — mockup'taki 👤 buraya karşılık geliyor). Mevcut TÜM
  state/dropdown/bildirim mantığı değişmedi, yalnızca yeniden yerleştirildi.
  Bir gerçek bug'ı bu sırada yakaladım: Aura dropdown'ı artık solda olduğu
  için pozisyonu `right-0`'dan `left-0`'a çevrildi — değişmeseydi dropdown
  ekranın solundan taşardı. Masaüstü metin-link satırı (`hidden md:flex`)
  korundu (mobilde zaten görünmüyor), ama içeriği alt bar ile tutarlı hale
  getirildi: Globe çıktı, Vizyon+Mesaj eklendi. İkon-only butonlara
  `aria-label` eklendi (DESIGN_SYSTEM.md'nin 5. maddesinde işaretlediği
  erişilebilirlik eksiğiyle örtüşüyordu).
  DİL SEÇİCİYİ KALDIRMADIM: mockup'ta yok ama `pages/auth.js` dışında dil
  değiştirmenin TEK yolu bu — kaldırsaydım giriş yapmış mobil kullanıcı dil
  değiştiremezdi. Bilerek tuttum, sadece kompakt haliyle.
- `components/BottomNav.jsx` — DÜZENLENDİ: Ana Sayfa (`Home`), Keşfet
  (`Compass`), Oluştur (ortada yükseltilmiş, `Sparkles` yerine `Plus` —
  mockup'ta net "➕" çizilmişti), Vizyon (`Target`, Globe'un yerine geçti),
  Mesaj (`MessageCircle`, yeni). Profil kaldırıldı (üst barda). Küre
  (`/globe`) linki kaldırıldı — sayfa hâlâ duruyor, sadece nav'dan erişim yok.
  Her sekmeye ayrı bir aksan rengi verildi (mevcut palet: astral-gold, aether-
  cyan, aether-indigo, aether-violet) böylece hangi sekmedeysin bir bakışta
  belli oluyor.
- `pages/messages.js` — YENİ: Mesaj linkinin 404 vermemesi için minimal
  "yakında" sayfası. Mesajlaşmanın backend'i (tablo/API) yok — istenirse ayrı
  bir iş olarak kurulabilir.

İKON SEÇİMİ: "Sosyal medya davranış psikolojisi" isteğini şöyle yorumladım —
tanınabilirlik en önemli faktör, o yüzden Home/Explore/Vision/Message/Bell/
Profile/Create için mevcut lucide-react setinden (zaten kurulu, ^0.383.0)
en evrensel/beklenen karşılıkları seçtim, hiçbirini elle SVG olarak çizmedim.
Mana/Aura için de aynı mantık: `Droplet`/`Sparkles` bu versiyonda gerçekten
var (npm'den indirip export listesini kontrol ettim) ve kavramlarla iyi
örtüşüyor — elle SVG path'i yazmak (görsel olarak test edemeden) çirkin/bozuk
çıkma riski taşırdı, hazır ve kaliteli bir ikon varken bunu tercih etmedim.

TEST EDİLEMEDİ (yine): Bu ortamda tarayıcıda render edemiyorum. En dar
ekranlarda (≈360-375px) sol+orta+sağ kümeler sıkışık olabilir — `min-w-0` ve
küçültülmüş padding ile mümkün olduğunca yer açtım ama gerçek cihazda
görmeden emin olamam; dar ekranlarda görürsen haber ver, ince ayar yaparım.

## 16) Arama / profil görüntüleme / takip / takip bildirimi bug'ları + mesajlaşma (YENİ)

Kullanıcının bildirdiği şikayet: "kullanıcı arama, profil görüntüleme, takip
etme, takip edince bildirim gelmesi ve mesajlar düzgün çalışmıyor ya da eksik."
Kod tabanını uçtan uca inceledim; her biri için somut, kanıtlanabilir bir bug
buldum (varsayımla değil, kodu okuyarak).

**A) Takip yönü hataları (arama + profil görüntüleme + takip)**

Kök neden: `friendships` tek yönlü bir tablo (user_id → friend_id), ama birkaç
sorgu bunu YANLIŞLIKLA iki yönlü kontrol ediyordu — biri seni takip ettiğinde
(sen onu henüz takip etmemişken) senin "Takip Et" butonun yanlışlıkla
"Takipte"/"Bekliyor" görünüp tıklanamaz hale geliyordu.

- `pages/api/friends/search.js` — DÜZELTİLDİ: friendshipMap artık yalnızca
  "ben → aday kullanıcı" yönünü kontrol ediyor.
- `pages/api/public-profile/[userId].js` — DÜZELTİLDİ (daha ciddi): eski
  sorgu `.or()` (iki yön) + `.maybeSingle()` kullanıyordu. Karşılıklı
  takipleşmede (en yaygın senaryo: iki açık profil birbirini takip ettiğinde)
  bu 2 satır döndürüp **hata fırlatıyordu** — bu da profili "Kullanıcı
  bulunamadı" gösteriyordu, oysa profil gerçekten vardı. Artık iki yön ayrı
  ayrı okunuyor, hem crash hem yanlış buton durumu düzeldi. Bonus: yanıta
  `followsViewer` eklendi (karşı taraf seni takip ediyor mu) — `pages/u/
  [userId].js`'de "Seni takip ediyor" rozeti olarak kullanılıyor.
- `pages/api/friends/list.js` — DÜZELTİLDİ: `user_profiles` tablosu iki farklı
  FK ile (`friendships_user_id_fkey`, `friendships_friend_id_fkey`) alias'sız
  embed ediliyordu — PostgREST'te aynı adla iki embed ya hataya ya da
  ikincinin birinciyi ezmesine yol açar. Artık `requester`/`target` diye ayrı
  alias'landı. `pages/profile.js`'deki "Gelen İstekler" kartı bu yüzden yanlış
  (veya boş) isim gösteriyordu — düzeltildi. Ayrıca profile.js'de kabul
  edilmiş takipleşmelerin (bağlantılar) kendisi hiç render edilmiyordu, yalnız
  sayısı gösteriliyordu — şimdi liste de görünüyor (avatar + isim + mesaj
  kısayolu, `/u/[id]`'ye link).
- `lib/supabaseAdmin.js` (`canViewGoal`) ve `pages/api/goals/list.js`
  (mode=user) — DÜZELTİLDİ: aynı `.or()+.maybeSingle()` hatası burada da
  vardı. Etkisi: karşılıklı takip eden iki kullanıcı birbirinin profiline
  gittiğinde "sadece arkadaşlara açık" (`visibility: friends`) hedefler
  görünmüyordu (sorgu sessizce hata veriyor, hata yakalanmadığı için
  "arkadaş değilsiniz" gibi davranıyordu). Bu da "profil görüntüleme"
  şikayetinin bir parçasıydı.
- `lib/list.js`, `lib/comment.js`, `lib/give-mana.js`, `components/friends/
  FriendsPanel.jsx`, `services/friendService.js`, `components/profile/
  ProfileHeader.jsx`, `hooks/useCurrentUser.js` — kontrol ettim, hiçbiri
  hiçbir yerden import edilmiyor (ölü kod). Bunlara dokunmadım.

**B) Takip bildirimi hiç yoktu**

`components/Navbar.jsx`'in bildirim zili zaten `friend_request` tipini
göstermeye hazırdı (muhtemelen önceki bir turda eklenmiş), ama onu
TETİKLEYEN kod hiçbir yerde yoktu — `friends/request.js` `friendships`
tablosuna satır ekliyordu ama `notifications` tablosuna hiç dokunmuyordu.

- `lib/notify.js` — `notifyFollow` ve `notifyFollowAccepted` eklendi
  (`notifyAnalysisOutcome` ile aynı desen: hem `notifications` satırı hem
  gerçek push bildirimi, ikisi de try/catch içinde — bir bildirim hatası asla
  takip işlemini başarısız göstermiyor).
- `pages/api/friends/request.js` — takip edilen kişiye artık bildirim
  gidiyor (açık profil → "yeni takipçi", gizli profil → "takip isteği").
- `pages/api/friends/respond.js` — istek kabul edilince, isteği gönderen
  tarafa "isteğin kabul edildi" bildirimi gidiyor (red'de sessiz kalıyor).
- `components/Navbar.jsx` — `new_follower`, `follow_accepted`, `new_message`
  mesaj şablonları eklendi; ayrıca fark ettiğim küçük bir eksik: `analysis_
  failed` tipi hiç map'te yoktu, tıklamada ham "analysis_failed" metni
  görünüyordu — o da eklendi. Bildirime tıklama artık türüne göre doğru yere
  götürüyor (takip → `/u/[id]`, mesaj → `/messages?with=[id]`).

**C) Mesajlar — sıfırdan kuruldu**

`pages/messages.js` yalnızca "Yakında" yazan bir bekleme sayfasıydı; hiç
tablo/API yoktu. Şimdi gerçek, çalışan bir DM özelliği var:

- `006_messages_schema.sql` — YENİ: `messages` tablosu (sender_id,
  recipient_id, content, is_read, created_at) + RLS AÇIK ve politikalı
  (yalnızca kendi gönderdiğin/aldığın mesajları görebilirsin/yazabilirsin —
  RLS eklenmezse tablo anon anahtarla erişilebilir kalırdı, bu ciddi bir
  gizlilik açığı olurdu). **Bu dosyayı Supabase SQL Editor'de çalıştırmanız
  gerekiyor, aksi halde /messages 500 hatası verir.**
- `pages/api/messages/send.js` — YENİ: mesaj gönderme (auth zorunlu, kendine
  mesaj engeli, 4000 karakter sınırı, alıcı bildirimi + push, aynı
  göndericiden zaten okunmamış bildirim varsa yenisini eklemiyor ki aktif
  sohbette zil spam olmasın).
- `pages/api/messages/conversations.js` — YENİ: gelen kutusu listesi (son
  mesaj önizlemesi + kişi başı okunmamış sayısı). Gerçek bir "conversations"
  tablosu yok — son 500 mesajı çekip bellekte kişi bazında grupluyor (arama
  endpoint'indeki 2-adımlı fetch-then-map deseniyle aynı yaklaşım). Çok
  yüksek mesaj hacminde (500'den eski) bir konuşma listede görünmeyebilir —
  bilinen bir v1 sınırlaması.
- `pages/api/messages/thread.js` — YENİ: iki kişi arası mesaj geçmişi
  (`before`/`after` cursor'larıyla sayfalama + polling desteği), açılınca
  karşı taraftan gelen mesajları ve ilgili bildirimi otomatik okundu
  işaretliyor.
- `pages/messages.js` — YENİDEN YAZILDI: gerçek gelen-kutusu + sohbet arayüzü
  (mobilde tek panel geçişli, masaüstünde iki panel yan yana). Gerçek zamanlı
  websocket/Supabase Realtime KURULMADI — bu kod tabanında hiçbir yerde
  realtime kullanılmıyordu, o yüzden açık sohbette 5 saniyede bir polling
  ile yeni mesaj kontrolü yapılıyor. İstenirse ileride Realtime'a geçirilebilir.
- `pages/u/[userId].js` — Takip butonunun yanına "Mesaj" butonu eklendi
  (`/messages?with=[id]`'ye götürüyor).

TASARIM KARARI: Mesajlaşmayı Instagram'ın açık-DM davranışı gibi kurdum —
herkes herkese mesaj atabilir, takip şartı yok. İstenirse ileride "yalnızca
takip ettiklerin" kısıtı ya da takip-etmeyenlerden gelen mesajlar için ayrı
bir "istekler" kutusu eklenebilir; bu bir sonraki adım, bu turda yapmadım.

TEST EDİLEMEDİ: Bu ortamda ne `npm install`/`next build` ne de gerçek bir
Supabase bağlantısı çalıştırabiliyorum (ağ kapalı). Tüm değiştirilen/yeni
dosyaları TypeScript derleyicisiyle (JSX syntax modunda, tip kontrolü kapalı)
söz dizimi hatası için taradım — hepsi temiz geçti. Ama gerçek DB'ye karşı
çalıştırıp uçtan uca doğrulayamadım; SQL'i çalıştırıp özellikleri denedikten
sonra bir şey ters giderse haber verin.

DOKUNULMADI (bilerek, kapsam dışı — bulundu ama bu turun konusu değildi):
`hooks/usePushSubscription.js`'in çağırdığı `/api/push/subscribe` route'u
hiç yok (push aboneliği hiç kaydolmuyor, sessizce başarısız oluyor); birçok
yerde kullanılan `gradient-text` CSS class'ı `globals.css`'de tanımlı değil
(başlıklardaki gradyan efekti çalışmıyor); `EmptyState.jsx`/`ErrorState.jsx`
`text-h3`/`text-body-sm`/`text-label`/`brand-primary` gibi `tailwind.config.js`'de
olmayan class'lar kullanıyor (yazı boyutu varsayılana düşüyor); birkaç
`pages/api/friends/*` ve `comment.js`/`like.js` gibi eski route'lar,
client'ın gönderdiği `userId`'yi doğrulamadan güveniyor (yeni `goals/*` ve
`messages/*` route'ları gibi `Authorization: Bearer` + sunucu tarafı
doğrulama kullanmıyorlar). Hepsi gerçek ama ayrı işler — istenirse ayrıca
ele alınabilir.
