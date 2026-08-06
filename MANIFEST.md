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

## 17) Mesajlara fotoğraf/video/dosya eki (YENİ)

`pages/api/messages/send.js`, `thread.js`, `unread-count.js` ile
`hooks/useUnreadMessages.js`'in (bölüm 16'dan sonra, bu konuşmanın dışında
başka bir turda eklenmiş olan zil-yerine-rozet mimarisi) yerinde durduğunu
doğruladım ve onun üzerine inşa ettim — mesaj bildirimini tekrar
`notifications` tablosuna eklemedim, mevcut `messages.is_read`
tabanlı rozet deseniyle tutarlı kaldı.

- `007_message_attachments.sql` — YENİ: `messages` tablosuna `attachment_url/
  type/name/mime/size` kolonları + "içerik boş olamaz" kısıtının "içerik YA DA
  ek olmalı" şeklinde gevşetilmesi + `message-attachments` adında herkese-açık
  bir Storage bucket (avatars/goal-covers ile AYNI desen: public URL, ama yol
  kullanıcı id'si + rastgele isim içerdiği için tahmin edilemez) + RLS
  (yalnızca kendi klasörüne yükleyebilir/silebilir). 20 MB sınır, resim/video/
  pdf/zip/office belgesi izinli tip listesi — genişletmek istersen bu dosyadaki
  `allowed_mime_types` dizisini düzenleyip tekrar çalıştırman yeterli
  (idempotent). **Bunu da SQL Editor'de çalıştırman gerekiyor.**
- `pages/api/messages/send.js` — DÜZENLENDİ: `attachmentUrl/Type/Name/Mime/
  Size` alanlarını kabul ediyor, en az biri (metin veya ek) zorunlu, ek
  varsa gerçekten gönderenin kendi klasöründen geldiğini doğruluyor (URL
  spoofing'e karşı ucuz bir sağlık kontrolü — bucket zaten herkese-açık
  olduğu için bu sert bir güvenlik sınırı değil, veri tutarlılığı için).
  Push bildirimi artık ek-tipine göre "📷 Fotoğraf" gibi bir metin gösteriyor
  (metinsiz ek gönderiminde push body'si boş kalmasın diye).
- `pages/api/messages/thread.js`, `conversations.js` — DÜZENLENDİ: attachment
  kolonlarını da SELECT ediyor.
- `pages/messages.js` — DÜZENLENDİ: ataç (Paperclip) butonu → gizli dosya
  input'u → seçilen dosya önizlemesi (resimse thumbnail, değilse dosya
  ikonu+adı, kaldırma butonuyla) → gönderirken ÖNCE dosya doğrudan
  istemciden Supabase Storage'a yükleniyor (Vercel API route body limitini
  atlamak için `/api/messages/send`'e dosyanın kendisi DEĞİL, yalnızca
  sonuçtaki URL gidiyor) → mesaj balonlarında resim satır-içi gösteriliyor
  (tıklayınca orijinali yeni sekmede açılıyor), video `<video controls>`
  ile oynatılıyor, dosyalar indirilebilir bir kart olarak görünüyor.
  Konuşma listesindeki son-mesaj önizlemesi, metin yoksa "📷 Fotoğraf" gibi
  bir etiket gösteriyor (önceden boş satır kalırdı).

TASARIM KARARI: Basit tutmak için gerçek bir lightbox/galeri kurmadım —
resme tıklayınca orijinali yeni sekmede açıyor. İstersen sonraki turda
tam ekran önizleme (modal, `useModalA11y` ile) ekleyebilirim.

TEST EDİLEMEDİ: Yine ağ/Supabase erişimim yok; tüm dosyaları sözdizimi
için taradım (temiz), ama gerçek bir dosya yükleyip uçtan uca deneyemedim.
En çok dikkat edeceğin nokta: `message-attachments` bucket'ının SQL'de
`public: true` ile oluşturulduğunu, projende Storage'ın genel olarak
aktif olduğunu varsayıyorum — ilk denemede "bucket not found" gibi bir
hata alırsan SQL'in gerçekten çalıştığını (Supabase Dashboard > Storage'da
bucket'ı görerek) doğrula.

## 18) ACİL DÜZELTME: mesaj gönderilemiyordu + "eski mesajlar silindi" görünüyordu + tam ekran mesajlaşma

**Ne oldu:** 17. bölümdeki `007_message_attachments.sql` iki kez hata verdi
(önce "onay alınamadı", sonra `storage.objects` üzerinde "must be owner of
table objects" — bu tablo Supabase'in kendi iç rolüne ait, benim bağlandığım
rol üzerinde ALTER TABLE hakkı yok). Ama bu sırada `pages/messages.js`,
`send.js`, `thread.js` kodları (17. bölümde teslim edilen) zaten yeni
`attachment_*` kolonlarını sorguluyordu — kolonlar veritabanında YOKKEN.
Sonuç: her mesaj sorgusu arka planda "column does not exist" hatası
veriyordu → gönderim başarısız oluyordu VE thread sorgusu tamamen
patladığı için var olan mesajlar hiç yüklenmiyor, ekranda "silinmiş" gibi
görünüyordu. **Gerçekte hiçbir mesaj silinmedi** — veritabanını kontrol
ettim, 6 mesaj hep oradaydı, sorun yalnızca kod/şema uyuşmazlığıydı.

**Düzeltme (Supabase MCP bağlantısı üzerinden bizzat uyguladım):**
- `public.messages`'a `attachment_url/type/name/mime/size` kolonlarını ve
  ilgili kısıtları ekledim (`storage.objects` satırını çıkararak, sorunun
  asıl kaynağı oydu — o satır zaten gereksizdi, RLS Supabase projelerinde
  varsayılan olarak açık geliyor).
- `message-attachments` bucket'ını ve yükleme/silme RLS politikalarını
  oluşturdum.
- İkisini de sorguyla doğruladım: kolonlar var, bucket var, mesaj sayısı
  hâlâ 6 (veri kaybı yok).

Artık `007_message_attachments.sql`'i SEN çalıştırman GEREKMİYOR — canlı
veritabanına zaten uygulandı.

**Tam ekran WhatsApp-tarzı mesajlaşma:**
- `pages/_app.js` — `/messages` artık `hideNavbarPaths` içinde: bu sayfada
  Navbar/Sidebar/BottomNav hiç render edilmiyor.
- `pages/messages.js` — düzen `h-[100dvh]` ile gerçek tam ekran (kenardan
  kenara, yuvarlatılmış kart/max-width kaldırıldı). Navbar gitmediği için
  kendi dönüş yollarını ekledim: konuşma listesi başlığında bir **Ana Sayfa**
  (ev ikonu, `/`'e gider) butonu; açık bir sohbette (yalnızca mobilde,
  masaüstünde liste zaten yanda görünür durumda) bir **Geri** butonu
  (konuşma listesine döner). Tam istediğin gibi: yalnızca bu iki buton.

TEST EDİLEMEDİ: Yine tarayıcıda render edemiyorum; JSX'i sözdizimi için
taradım (temiz). SQL tarafını ise gerçekten Supabase'e karşı ÇALIŞTIRDIM
ve sorgularla doğruladım — o kısım "tahmin" değil, doğrulanmış durum.

## 19) Kartlarda GERİ tuşu sorunu + dil menüsü kapanmıyordu

Bu paketi (`__22_.zip`) başka bir turda yapılan büyük bir ana-sayfa/keşif
yeniden tasarımıyla (Instagram-tarzı tek sütun akış, `DEGISIKLIK_OZETI_3.md`)
birlikte aldım — görsellerin akışta görünmeme sorunu ORADA zaten kök
nedeniyle düzeltilmiş (aşırı sıkı bir filtre `needs_persist` görselleri de
gizliyordu). Ben ekran görüntülerindeki o sorunu ayrıca düzeltmedim, zaten
çözülmüştü; yeni pakette olmalı.

**Dil menüsü kapanmıyordu:** `components/LanguageSwitcher.jsx` menüyü CSS
`:hover` ile açıp kapatıyordu — dokunmatik ekranda "hover" güvenilir değildir,
bir dile dokunduktan sonra menü açık kalabiliyordu. Gerçek bir açık/kapalı
state'e geçirdim: butona dokun → açılır, bir dil seç ya da dışarı dokun →
kapanır.

**Kartlarda "Geri tuşu yok, çıkmak zor, geri basınca çok geri gidiyor":**
Kök neden, modal'ların (rüya/vizyon detayı) tarayıcı geçmişine hiç
girmemesiydi — fiziksel/tarayıcı GERİ tuşu modal'ı kapatmak yerine asıl
sayfa geçmişinde geriye gidiyordu (bazen siteden bile çıkarıyordu).
`GoalDetailModal` gibi bazılarında görünür bir X butonu vardı ama GERİ
tuşuna basınca yine de bu sorun oluyordu; rüya kartının modal'ında (ana
sayfada) görünür bir kapatma butonu bile yoktu, yalnızca karartılmış
arka plana tıklayarak kapanıyordu.

- `lib/useModalA11y.js` — DÜZENLENDİ (TEK YERDEN, HER MODAL'I DÜZELTİR):
  modal açılırken sahte bir tarayıcı geçmişi girdisi ekleniyor; fiziksel
  GERİ tuşuna basılınca bu girdi düşüyor (popstate) ve modal kapanıyor —
  kullanıcı sayfadan hiç ayrılmamış, aynı scroll konumunda kalıyor. Modal
  X/arka-plan/Escape ile kapatılırsa, açılışta eklenen girdi de otomatik
  temizleniyor (yoksa kullanıcı asıl sayfadan çıkmak için GERİ'ye bir kez
  daha boşuna basardı). Bu hook zaten `CreateGoalModal`, `StoryModeModal`,
  `DeepAnalysisConfirmationModal`, `PixabayPicker`, `GoalDetailModal`,
  `SlidesViewer`, `SlideEditor` tarafından kullanılıyordu — hepsi bu
  düzeltmeyi otomatik olarak aldı, tek tek dokunmadım.
- `components/VisionReelsFeed.jsx` — `useModalA11y` eklendi (zaten görünür
  bir Geri butonu vardı, şimdi fiziksel GERİ tuşu da çalışıyor).
- `pages/index.js` — rüya kartı artık çıplak bir overlay değil, yeni bir
  `DreamCardModal` sarmalayıcısı kullanıyor: `useModalA11y` + her zaman
  görünür bir kapatma (X) butonu.

DOKUNULMADI (bilinen, benzer ama ayrı bir boşluk): `DeepAnalysisCarouselModal`
kendi X butonuna sahip ama `useModalA11y` kullanmıyor — `isOpen` prop'uyla
açılıp kapanıyor (mount/unmount değil), bu yüzden mevcut hook'u oraya
doğrudan eklemek güvenli değildi (hook, "mount = açık" varsayıyor). Düzgün
desteklemek için hook'un `isOpen` tabanlı bileşenleri de anlayacak şekilde
genişletilmesi gerekir — istersen ayrı bir iş olarak yaparım.

BİLİNEN SINIRLAMA: Aynı anda birden fazla modal açıksa (ör. vizyon detayı
içinden slayt düzenleyici açılması), GERİ'ye TEK basış şu an ikisini de
kapatıyor (her ikisi de aynı global `popstate` olayını dinliyor) — düzgün
bir modal-yığını (her seviye kendi derinliğini bilecek şekilde) kurmak daha
büyük bir iş, bu turda yapmadım. Pratikte en sık karşılaşılan durum (tek
modal açıkken GERİ'ye basmak) artık doğru çalışıyor.

TEST EDİLEMEDİ: Sözdizimi için taradım (temiz), ama gerçek bir tarayıcıda
GERİ tuşu davranışını deneyemedim — bu özellikle dikkatle test etmen
gereken bir değişiklik.

## 20) Vizyon videosunda "Kaydet" + üç nokta menüsü (Düzenle/Videoyu Sil/Bildir)

Anasayfadaki vizyon videosu oynatıcısında (VisionVideoPlayer) yorumların
yanına bir Kaydet (bookmark) butonu ve bir üç nokta menüsü eklendi — aynı
turda SlidesViewer'ın üç nokta menüsü de sahip olmayanlara açıldı (tutarlılık
için, çünkü ikisi kasıtlı olarak birebir aynı deseni paylaşıyor).

**SQL — Supabase'e UYGULANDI (Supabase MCP ile bağlanıp bizzat çalıştırdım):**
- `009_goal_saves_and_reports.sql`:
  - `goals.saves_count` kolonu (goal_slides.saves_count ile aynı desen)
  - `goal_saves` tablosu + `saves_count`'u otomatik güncelleyen trigger
    (`handle_goal_save_change`)
  - `goal_reports` tablosu (goal_id + reporter_id, unique çift — aynı kişi
    aynı hedefi iki kez bildiremez)
  - Uygulamadan önce gerçek şemayı sorguladım ve ilk taslağımda bir hata
    buldum: projede `user_id` gibi kolonlar `auth.users(id)`'e değil
    `public.user_profiles(id)`'e referans veriyor (goals, goal_reactions,
    goal_comments, goal_slide_saves hepsi böyle) — düzelttim. RLS de
    `goal_slide_saves`'in birebir aynısı: yalnızca "kendi kayıtların"
    SELECT policy'si var, INSERT/DELETE bilerek yok (tüm yazmalar
    supabaseAdmin/service-role ile API üzerinden). Ayrıca security
    advisor'ın uyardığı bir noktayı da kapattım: `handle_goal_save_change`
    trigger fonksiyonunun `/rest/v1/rpc/...` üzerinden anon/authenticated
    tarafından direkt çağrılabilmesini `revoke execute` ile engelledim
    (trigger ateşlemesini etkilemiyor, yalnızca gereksiz bir RPC yüzeyini
    kapatıyor).

**Yeni API route'ları:**
- `pages/api/goals/save.js` — YENİ: goal seviyesinde kaydet/kaldır toggle
  (`goals/slides/save.js` ile birebir aynı desen, ama slayt değil goal'e
  bağlı). unique constraint'e çarpan yarış durumunu (23505) da "zaten
  kaydedilmiş" olarak sessizce ele alıyor.
- `pages/api/goals/report.js` — YENİ: bildirim gönderir, kendi hedefini
  bildiremezsin, aynı hedefi ikinci kez bildirirsen hata değil "zaten
  bildirildi" (unique constraint'in 23505 hatasını yakalayıp 200 dönüyor)

**Değişen API route'ları (has_saved alanı eklendi — has_reacted ile aynı desen):**
- `pages/api/home-feed.js` — `fetchVisions`: goal_saves'ten giriş yapmış
  kullanıcının kaydettiklerini tek sorguda çekip her vizyona işliyor
- `pages/api/goals/list.js` — aynı ekleme (explore/profile/vision-board/
  u/[userId] hepsi bu route'u kullandığı için tek yerden düzeliyor)

**Frontend:**
- `lib/reportReasons.js` — YENİ: Bildir sheet'indeki sebep listesi
  (Spam/Uygunsuz içerik/Taciz/Yanlış bilgi/Nefret söylemi/Diğer), iki
  bileşen de aynı listeyi kullansın diye tek yerden.
- `components/VisionVideoPlayer.jsx` — DÜZENLENDİ: aksiyon şeridine Kaydet
  butonu (Bookmark ikonu, dolu/boş durum) eklendi. Yanına her zaman görünen
  bir üç nokta butonu eklendi: sahip için Düzenle (mevcut onOpenDetails
  akışına giriyor, ayrı bir ekran yok) + Videoyu Sil (önceden hiçbir
  arayüzden çağrılmayan `delete-vision-video.js`'i kullanıyor — goal'ü değil
  yalnızca videoyu kaldırır, hedef eski slaytlarına/detayına döner, iki adımlı
  onay SlidesViewer'daki "Sil" ile aynı). Sahip olmayanlar için Bildir —
  sebep seçilip gönderilen bir alt sheet (yorum sheet'inin üstünde, z-40).
- `components/SlidesViewer.jsx` — DÜZENLENDİ: üç nokta menüsü artık
  `{isOwner && ...}` ile tamamen gizlenmek yerine herkese açık; sahip yine
  Düzenle/Sil görüyor, diğerleri Bildir görüyor. Kaydet butonu zaten vardı
  (slayt seviyesinde, `goal_slides.saves_count` ile), dokunulmadı.

TEST EDİLEMEDİ: Bu ortamda npm install / next build çalıştırma imkanı yok
(network kapalı) — frontend değişikliklerini esbuild ile (JSX/ES modül
sözdizimi) tek tek doğruladım, hepsi temiz derlendi. Gerçek bir tarayıcıda
deneyemedim.

SQL İSE TEST EDİLDİ: 009'u Supabase MCP ile canlı projene (dreampulsemap's
Project) uyguladıktan sonra gerçek bir satırla uçtan uca doğruladım —
`goal_saves`'e test kaydı ekleyip `goals.saves_count`'un 0'dan 1'e çıktığını,
sonra sildiğimde tekrar 0'a döndüğünü gördüm, test kaydını temizledim
(canlı veride kalıcı bir iz yok). `get_advisors` (security) çalıştırıp yeni
tablolarda RLS/policy eksiği olmadığını da doğruladım.

## 21) Günce (Diary/Stories) özelliği (YENİ)

Anasayfanın en üstüne, Instagram Hikayeleri tarzı yuvarlak bir "Günce"
satırı eklendi: foto/video/metin günlük girdisi paylaşılabiliyor, kendi
halkan her zaman ilk sırada, arkadaşların okunmamış girdisi varsa altın
(şampanya) renkli halkayla öne çıkıyor. Ürün tartışmasından çıkan üç karar:
girdiler KALICI (IG gibi 24 saatte silinmiyor — "günce" kelimesi bunu
gerektiriyor), gizlilik varsayılanı PRIVATE (vizyonların aksine), ve
opsiyonel olarak bir vizyona bağlanabiliyor (o vizyonun ilerleme kaydı gibi).

**SQL — Supabase'e UYGULANDI (Supabase MCP ile):** İlk migration denemem
"already exists" hatası verdi — meğerse bu görevin daha önceki bir
oturumda/denemede zaten tamamlanmış hâli canlıda duruyormuş (muhtemelen bu
konuşmanın bağlantısının koptuğu an). Kendi tasarımımla neredeyse birebir
aynı ama farklı isimlendirilmiş bir şema buldum — kendi migration'ımı tekrar
göndermek yerine olanı benimsedim:
- `diary_entries`: user_id, goal_id (nullable, `goals`'a FK), media_type
  (photo/video/text), media_url, caption, visibility (public/friends/
  private), created_at. CHECK: metin girdisi caption'sız, foto/video
  media_url'siz olamaz. RLS: kendi + public + (arkadaşsa) friends
  görünürlüğü tek `diary_entries_select_visible` policy'sinde.
- `diary_views` (viewer_id, owner_id, last_viewed_at): Instagram gibi girdi
  başına değil KİŞİ başına tek "en son ne zaman baktım" satırı — halkanın
  altın/gri durumunu belirlemek için yeterli, çok daha az satır.
- `diary-media` bucket: goal-images/goal-videos ile birebir aynı desen
  (herkese açık okuma, `{userId}/{dosya}` klasör kuralıyla sahibi
  yükler/siler), 150MB limit.
- `is_accepted_friend(a,b)` SQL fonksiyonu (RLS policy'si için) — admin
  client zaten RLS'i bypass ettiğinden API route'ları kendi JS-taraflı
  arkadaşlık kontrolünü kullanıyor (`getAcceptedFriendIds`), fonksiyon
  sadece savunma katmanı.
- `get_advisors` (security) çalıştırıldı: tek uyarı `diary-media`'nın public
  listing'e izin vermesi — bu goal-images/goal-videos/dream_images/
  image-library/goal-covers'ın HEPSİNDE zaten var olan, kabul edilmiş bir
  risk; yeni bir şey değil, bilerek dokunulmadı.

**Yeni API route'ları (`pages/api/diary/`):**
- `create.js` — girdi oluştur (medya zaten istemcide yüklenmiş oluyor,
  `lib/uploadDiaryMedia.js`), hedefe bağlanıyorsa sahiplik doğrulanıyor.
- `feed.js` — story satırının veri kaynağı: kendisi + arkadaşları, kişi
  başına özet (kaç girdi, en son ne zaman, okundu mu, kendi serisi kaç gün).
- `list-for-user.js` — tek bir kişinin GÖRÜNÜR girdileri, kronolojik sırayla
  (viewer opsiyonel — public profiller giriş yapmadan da görülebilir,
  goals/slides/list.js ile aynı desen), bağlı vizyon varsa başlığı da.
- `mark-seen.js` — diary_views'e upsert.
- `delete.js` — sahip-only silme (storage temizliği yok, slides/delete.js
  ile aynı bilinçli sadelik).

**lib/:**
- `uploadDiaryMedia.js` — YENİ: foto/video'yu doğrudan `diary-media`'ya
  yükler (uploadVisionVideo.js deseni), tür otomatik dosyadan algılanıyor.
- `diaryTranslations.js` — YENİ: TR/EN, `getVisionBoardText` ile aynı desen.
- `supabaseAdmin.js` — DÜZENLENDİ: `getAcceptedFriendIds(userId)` eklendi
  (canViewGoal'ın arkadaşlık .or() deseninin feed.js + list-for-user.js
  arasında paylaşılan hâli).

**Bileşenler:**
- `components/DiaryStoryRow.jsx` — YENİ: yuvarlak satır. Kendi halkan boşsa
  tıklayınca doğrudan composer açılır; doluysa halkaya dokununca izlersin,
  eklemek için köşedeki küçük + rozetine dokunursun (IG'nin "add to story"
  deseni). Altın halka `.gold-gradient-text` ile AYNI 3 renk durağı
  (conic-gradient, inline style — DESIGN_SYSTEM.md'nin gradyan kuralı).
  3+ günlük seri varsa `shadow-astral-glow` ile hafif parlama.
- `components/DiaryStoryViewer.jsx` — YENİ: SlidesViewer'ın hikaye tarzı
  ilerleme çubuğu + basılı-tut-duraklat + dokunma-bölgesi mekaniğinin AYNISI,
  iki seviyeli hale getirilmiş (kişi × o kişinin girdisi). Bir kişi biterse
  otomatik sıradakine geçer, en sonda kapanır. Her kişinin girdileri
  TEMBEL yükleniyor (sadece halkasına dokununca). Video kendi doğal
  süresince oynar (onEnded ile ilerler), foto/metin sabit süreli. Metin
  girdileri `font-serif` + yumuşak altın radial-gradient zeminle (foto/
  videodan bilinçli olarak farklı, "duygusal ağırlık" için DESIGN_SYSTEM.md
  §serif kuralı).
- `components/DiaryComposer.jsx` — YENİ: CreateGoalModal ile aynı modal
  kabuğu/gizlilik-select deseni. Tür seçimi (Foto/Video/Metin)
  HomeFeedFilter'daki AYNI segmentli pill kontrolü — homepage'de hemen
  altında durduğu filtreyle bilinçli görsel tutarlılık. Medya PAYLAŞ'a
  basılınca yükleniyor (seçilir seçilmez değil) — vazgeçilirse storage'da
  öksüz dosya kalmasın diye. Kendi aktif vizyonların varsa (opsiyonel)
  birine bağlayabiliyorsun.
- `pages/index.js` — DÜZENLENDİ: story satırı sticky filtre çubuğunun
  ÜSTÜNDE, normal akışta (kaydırınca kayboluyor, IG'deki gibi); viewer/
  composer diğer tam ekran modallerin yanına eklendi.

**Kasıtlı olarak V1 kapsamı DIŞINDA bırakılanlar** (hepsini aynı anda
"tamam" demek gerçekçi değildi):
- Girdi başına reaksiyon/yorum yok — sadece paylaş/izle/sil.
- Seri (streak) sadece görsel bir halka efekti; mana/aura ekonomisine
  (ödül/kredi) BAĞLANMADI — istenirse ayrı, bilinçli bir karar olarak
  eklenebilir.
- Viewer'da kendi günceni izlerken ORADAN yeni girdi ekleme yok; ekleme
  girişi sadece ana sayfadaki halkanın + rozeti.

TEST EDİLEMEDİ: Bu ortamda npm install / next build çalıştırma imkanı yok
(network kapalı) — 18. bölümdeki önceki oturumun yaptığı gibi, tüm yeni/
değişen dosyaları esbuild ile (JSX/ES modül sözdizimi, `--loader:.js=jsx`)
tek tek doğruladım, hepsi temiz derlendi; tüm `@/...` import path'lerinin
karşılığının gerçekten var olduğunu da elle çapraz kontrol ettim. Gerçek
tarayıcıda uçtan uca (özellikle video onEnded ilerlemesi ve halka altın/gri
geçişi) test edilmedi.

## 22) Günce medyası: yavaş upload + yavaş gösterim (YENİ)

Els'in geri bildirimi: "medya çok yavaş yükleniyor, uploadda da bize
gösterilirken de kullanıcı deneyimini bozan bir gecikme var." Üç ayrı kök
neden bulundu, üçü de düzeltildi:

**1) Upload'ın kendisi yavaş — fotoğraflar sıkıştırılmadan yükleniyordu.**
Telefon kamerasından gelen bir foto 4-12MB olabiliyor. `uploadDiaryMedia.js`
artık PAYLAŞ'a basılmadan önce tarayıcıda (canvas + `createImageBitmap`)
fotoğrafı uzun kenarı max 1920px olacak şekilde yeniden boyutlandırıp
JPEG kalite 0.82 ile yeniden sıkıştırıyor — sonuç genelde 200-500KB'a
iniyor. Sıkıştırma sonucu orijinalden büyük çıkarsa (nadir ama olabilir)
orijinal korunuyor, asla dosya büyütülmüyor. GIF/SVG olduğu gibi bırakılıyor
(GIF'i sıkıştırmak animasyonu bozar). Video için gerçek sıkıştırma
(ffmpeg.wasm gibi ağır bir bağımlılık gerektirirdi) kapsam dışı bırakıldı.

**2) Upload sırasında hiçbir geri bildirim yoktu — "donmuş" gibi
görünüyordu.** `@supabase/supabase-js`'in `storage.upload()`'ı fetch
tabanlı olduğu için ilerleme (progress) bilgisi vermiyor. Bunun yerine ana
dosyayı Storage REST uç noktasına (`POST /storage/v1/object/{bucket}/
{path}`) doğrudan `XMLHttpRequest` ile gönderip `xhr.upload.onprogress`
ile gerçek yüzde takibi eklendi — SDK'nın `.upload()`'ı ile TAMAMEN aynı
sonucu üretiyor (aynı bucket, aynı RLS kontrolleri, aynı public URL), sadece
gerçek ilerleme bilgisi ekliyor. `DiaryComposer.jsx`'teki PAYLAŞ butonu artık
üç aşamayı gösteriyor: "Optimize ediliyor..." → "Yükleniyor... %X" →
"Paylaşılıyor..." (ilerleme çubuğu butonun kendi içinde dolan bir şerit).

**3) Gösterim yavaştı — özellikle video, ilk kare boyanana kadar siyah
ekran kalıyordu.** `uploadDiaryMedia.js` artık videonun ilk karesini küçük
bir JPEG postere çevirip (`generateVideoPoster` — video elementinden canvas'a
kare yakalama) ayrıca yüklüyor; `diary_entries.poster_url` (yeni migration:
`add_diary_entries_poster_url`) sütununda tutuluyor. `DiaryStoryViewer.jsx`
artık `<video poster={entry.poster_url}>` kullanıyor — asıl video henüz
inmemiş olsa bile poster ANINDA görünüyor. Ayrıca:
- Sıradaki KİŞİNİN girdi listesi arka planda önceden çekiliyor (mevcut
  kişi bitip otomatik geçiş olduğunda spinner'a takılmasın diye).
- Sıradaki TEK medya (foto ya da video posteri) tarayıcı önbelleğine
  önceden ısıtılıyor (`new Image().src = ...`) — sıra ona gelince anında
  görünüyor.
- Video arabelleğe alırken (`onWaiting`/`onPlaying`/`onCanPlay`) küçük bir
  dönen gösterge — ekran donmuş değil, gerçekten yükleniyor hissi.

**Değişen/yeni dosyalar:** `lib/uploadDiaryMedia.js` (sıkıştırma + poster +
XHR ilerleme), `lib/diaryTranslations.js` (`compressing`,
`uploadingPercent` anahtarları), `components/DiaryComposer.jsx` (ilerleme
UI'ı), `components/DiaryStoryViewer.jsx` (poster + prefetch + buffering
göstergesi), `pages/api/diary/create.js` + `list-for-user.js`
(`poster_url` okuma/yazma). SQL: `add_diary_entries_poster_url` migration'ı
Supabase MCP ile canlıya uygulandı (`diary_entries.poster_url text`).

**Bilinçli olarak dokunulmadı:** Bu oturumda ayrıca alakasız, doğrulanmamış
bir `PERFORMANCE_FIXES.md` dosyası ve birkaç yetim yardımcı dosya
(`lib/dbOptimizations.js`, `lib/imageOptimization.js`) bulundu —
`pages/api/like.js`, `comment.js`, `prophet.js`, `auth.js` gibi dosyaları
"iyileştirdiğini" iddia ediyordu ama bu dosyalar gerçekte HİÇ
değiştirilmemiş (baytı baytına aynı) ve ölçüm olarak verilen yüzdeler
(%60, %70 gibi) doğrulanabilir bir kaynağa dayanmıyordu. Bu iddiaları
gerçek gibi sunmak yanlış olurdu, o yüzden bu turun teslimatına dahil
etmedim — Els isterse bu genel performans konularına (N+1 sorgular, feed
önbellekleme vb.) ayrı, doğrulanmış bir turda bakılabilir. Aynı şekilde
`components/VisionVideoPlayer.jsx`'te büyük, alakasız bir yeniden yazım
(kaydırmalı video kuyruğu, çift-dokunuşla beğeni) bulundu — bu da Günce
medya hızıyla ilgisiz ve bu oturumda doğrulanmadığı için teslimata dahil
edilmedi.

TEST EDİLEMEDİ: Aynı şekilde gerçek tarayıcı/mobil cihazda uçtan uca test
edilmedi — özellikle XHR upload'ın gerçek bir Supabase projesinde (RLS,
`apikey` header'ı) beklendiği gibi çalıştığı, ve video poster
çıkarımının farklı codec'lerde (H.264 dışı) sorunsuz çalıştığı doğrulanmalı.

## 23) PERFORMANCE_FIXES.md'deki iddiaların tek tek doğrulanması (YENİ)

Els: "o yapıldığı iddia edilip yapılmamış iyileştirmeleri de yap." Sekiz
maddenin her birini TEK TEK, gerçek kod ve canlı DB durumuna bakarak
doğruladım (PERFORMANCE_FIXES.md'nin kendisine güvenmeden). Sonuç
beklediğimden karışıktı — bazı maddeler gerçekten yapılmış (ama bu oturumdan
ÖNCE, muhtemelen bu konuşmanın çok daha erken bir yerinde), bazıları hiç
yapılmamış, bir tanesi de dosyada "yapıldı" yazsa da GERÇEKTE ÇALIŞMIYORDU.

**1) N+1 sorgular (like.js/comment.js) — YAPILMIŞ, ama altında GERÇEK bir
bug buldum ve düzelttim.** `pages/api/like.js` zaten "trigger'a güven, tek
sorguyla say" desenini kullanıyordu. Ama bu deseni mümkün kılan
`update_dream_counts()` DB fonksiyonunun kendisinde ciddi bir hata vardı:
DELETE işleminde (beğeni geri alma / yorum silme) `NEW.dream_id`
kullanıyordu — DELETE'te NEW hata vermeyen ama TÜM ALANLARI NULL bir kayıt,
yani `WHERE id = NULL` hiçbir satıra uymuyor ve sayaç SESSİZCE
güncellenmiyordu. Yıllardır (ya da en azından bug'ın başından beri) beğeni
geri alma / yorum silme işlemlerinde `dreams.likes_count` /
`comments_count` hiç azalmıyor, sadece artıyordu. İzole geçici bir test
tablosuyla önce hatayı, sonra düzeltmeyi (`COALESCE(NEW.x, OLD.x)` —
`goals` tarafındaki `handle_goal_comment_change()` zaten bu deseni doğru
kullanıyor) doğruladım, canlıya `fix_update_dream_counts_delete_bug`
migration'ıyla uyguladım VE tüm mevcut `dreams` satırlarının sayaçlarını
gerçek satır sayılarıyla tek seferlik eşitledim (geriye dönük düzeltme —
kendi kendine iyileşmeyi beklemedim). Doğrulama sorgusu: eşleşmeyen sıfır
satır kaldı.

**2) "Feed loading'i optimize et / FriendshipCache" — YANLIŞ TEŞHİS,
UYGULAMADIM.** `pages/index.js`'de zaten HİÇBİR arkadaşlık sorgusu yok
(bu mantık sunucu tarafında `/api/home-feed` ve `/api/goals/list`'te,
istek başına zaten TEK sorgu olarak çalışıyor — tekrarlanan bir N+1 deseni
bulamadım). Ayrıca bellek-içi bir "cache class" Vercel'in serverless
fonksiyon modelinde (her istek farklı bir fonksiyon örneğine düşebilir)
güvenilir çalışmaz — kurulsa bile "bazen isabet, bazen ıskalama" gibi
belirsiz bir davranış verir. Düzeltilecek somut bir sorun bulamadığım için
uydurma bir "cache" eklemedim.

**3) Sınırsız DB sorguları (prophet.js / mental-wall) — ZATEN YAPILMIŞ.**
İkisi de zaten açık `limit()`, sadece gereken kolonları seçme ve (prophet.js
için) `AbortController` ile 45sn timeout içeriyor. Bu, PERFORMANCE_FIXES.md
yazılmadan ÖNCE yapılmış görünüyor.

**4-5) Hydration flashing + useEffect temizliği (auth.js) — ZATEN
YAPILMIŞ.** `mounted` state + `if (!mounted) return null` deseni ve
`onAuthStateChange` aboneliğinin `unsubscribe()` ile düzgün temizlenmesi
zaten yerinde.

**6) Görsel optimizasyonu (lib/imageOptimization.js) — YARIM BIRAKILMIŞ,
ÜSTELİK KULLANILSAYDI KIRIK OLACAKTI. Şimdi düzelttim.** Dosya hiçbir
yerde import edilmiyordu (yetim). Daha kötüsü: `placeholder: 'blur'`
varsayılanı next/image'da bu projedeki HER görsel gibi (Supabase
Storage/Pixabay, statik import değil) `blurDataURL` olmadan ÇALIŞMA
ZAMANI hatası fırlatır. Bu varsayılanı kaldırdım, çağıran taraf isterse
kendi blurDataURL'ini geçebilir diye yorumla açıkladım. `DreamCard`,
`GoalCard`, `globe.js`, `explore.js` gibi yerlerde `<img>`'den
`next/image`'a geçiş YAPMADIM — bu, her bileşenin kendi layout/aspect-ratio
varsayımlarını bozabilecek büyük ve ayrı bir iş; aceleye getirip regresyon
riski almak yerine ayrı, odaklı bir turda yapılmalı.

**7) AI çağrılarında timeout/retry (lib/aiClient.js) — KISMEN YAPILMIŞ,
prophet.js'e UYGULAMADIM (bilerek).** `lib/aiClient.js` gerçek ve makul
(timeout + üstel geri çekilmeli retry), `mental-wall/generate.js` zaten
kullanıyor. AMA `aiClient.js` sabit olarak OpenAI'a (`api.openai.com`,
`gpt-4o-mini`) yazılmış; `prophet.js` ise Groq kullanıyor
(`api.groq.com`, `llama-3.1-8b-instant`). Bunu prophet.js'e "entegre etmek"
aslında AI sağlayıcısını SESSİZCE OpenAI'a çevirmek olurdu — kimsenin
istemediği bir davranış/maliyet değişikliği. prophet.js zaten kendi
timeout'unu doğru yapıyor, dokunmadım.

**8) Eşzamanlı API çağrıları — madde 2 ile aynı gerekçeyle
uygulanmadı** (somut bir sorun bulunamadı).

**Değişen dosya:** sadece `lib/imageOptimization.js`. DB tarafında
`fix_update_dream_counts_delete_bug` migration'ı canlıya uygulandı (kod
değişikliği gerektirmiyor, mevcut like.js/comment.js zaten trigger'a
güveniyordu).

Yan not (düzeltmedim, bilgi amaçlı): `daily_prophecy` tablosunda "Allow
public insert" politikası `with_check: true` ile TAMAMEN açık — herkes
(anonim dahil) doğrudan sahte bir "kehanet" satırı ekleyebilir. prophet.js
zaten GROQ_KEY + "bugün var mı" kontrolü arkasında çalıştığı için pratik
risk düşük, ama bilerek daraltılmamışsa sıkılaştırmak isteyebilirsin.

## 24) Psyche Haritası — kendi arketip katmanımız (YENİ)

Bağlam: Els'e harici bir ARG projesinin ("DO·LOON·AI EXPRESS") entegre
edilip edilemeyeceğini değerlendirdim — teknik olarak entegre edilecek bir
API/SDK yoktu, içerik de (gerçekliği bilinçli bulandıran, okült temalı)
wellness kullanıcı kitlemize uygun değildi, üstelik başkasının telifli
kurgusuydu. Ama arketip/gölge-çalışması TEMASI Lunosfer'in ZATEN sahip
olduğu bir şeyle çarpıcı örtüşüyordu: `lib/deepAnalysisEngine.js` her
rüyada AI'a Jungian arketipler tespit ettiriyor (`dreams.ai_archetypes`),
ama bunları rüyalar arasında TOPLU gösteren bir yer yoktu. Önerim: harici
IP'yi almak yerine, zaten var olan bu veriyi kullanarak KENDİ katmanımızı
inşa edelim — Els onayladı.

**Ne yaptım:** "Psyche Haritası" — kullanıcının TÜM analiz edilmiş
rüyalarındaki `ai_archetypes`'ı toplayıp en sık tekrar edenleri bir
yörünge/takımyıldız görselinde gösteren, tamamen AGREGASYON tabanlı (yeni
AI çağrısı YOK, mevcut veriden) bir profil bölümü. `pages/profile.js`'in
Rüyalar sekmesinin başına eklendi (sadece kendi profilin — `pages/u/
[userId].js`'e dokunmadım, bu içe dönük veri herkese açık olmamalı).

- `pages/api/psyche-map.js` — YENİ: kullanıcının `dreams.ai_archetypes`'ını
  çekip (küçük/büyük harf normalize ederek) sayıp en sık 8 tanesini,
  varsa en son premium derin analizden kısa bir doku alıntısıyla
  (`individuation_path` — kullanıcının KENDİ verisi, telif sorunu yok)
  birlikte döner. En az 3 analiz edilmiş rüya yoksa "haritan henüz
  oluşuyor" kilitli durumu gösteriyor.
- `lib/psycheMapTranslations.js` — YENİ: TR/EN, kurulu desenle aynı.
- `components/PsycheMap.jsx` — YENİ: grafik kütüphanesi YOK (projede zaten
  yok) — elle SVG, merkezde "Öz" (altın radial gradient — `.gold-gradient-
  text` ile aynı 3 durak), etrafında arketip düğümleri (boyut/parlaklık =
  sıklık), tıklanınca yüzdesini gösteriyor. Bilinçli olarak yapılmayanlar:
  sabit isimli "arketip karakterleri" yok (AI ne tespit ettiyse o
  gösteriliyor — canlıda gerçek veriyle doğruladım: "The Shadow", "The
  Self", "The Anima", "The Seeker" gibi standart Jungian terimler
  çıkıyor), gizem/kehanet dili yok.

Canlı veriyle doğrulama: 426 rüyadan 45'inde `ai_archetypes` dolu —
özellik gerçek veriyle çalışıyor, boş bir grafik değil. DB şeması
DEĞİŞMEDİ (tamamen mevcut kolonlardan agregasyon).

TEST EDİLEMEDİ: Gerçek tarayıcıda uçtan uca (özellikle SVG'nin farklı ekran
genişliklerinde okunabilirliği, çok sayıda arketip olduğunda etiketlerin
üst üste binip binmediği) test edilmedi.


