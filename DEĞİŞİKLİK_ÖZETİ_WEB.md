# clone.js — Gerçek Repoya Göre Düzeltilmiş Hali

Web reponuzu (`dreamap-frontend-main`) inceleyip önceki teslimattaki
`pages/api/goals/clone.js` taslağını **gerçek kod tabanınıza göre yeniden
yazdım**. Önceki versiyon varsayımsaldı (repo henüz yüklenmemişti); bu
versiyon artık `report.js`, `save.js`, `create.js`, `list.js`,
`slides/create.js` ve `lib/supabaseAdmin.js` dosyalarınızı okuyup onlarla
birebir aynı desenlere göre yazıldı, `node -c` ile sözdizimi doğrulandı.

## Önceki taslaktan farkı

1. **Import yolu düzeldi**: `../../../lib/auth` (var olmayan bir dosya)
   yerine gerçek `@/lib/supabaseAdmin` — `jsconfig.json`'da `@/*` → `./*`
   tanımlı olduğunu doğruladım.

2. **Görünürlük kontrolü artık kendi `canViewGoal()` yardımcınızı
   kullanıyor.** Önceki taslakta bu mantığı elle (yaklaşık 40 satır)
   yeniden yazmıştım. Gerçekte `lib/supabaseAdmin.js`'de zaten hazır,
   test edilmiş ve hatta bir hata düzeltmesi (`.maybeSingle()` yerine
   `.limit(1)` — karşılıklı arkadaşlıkta 2 satır dönüp patlıyordu)
   içeren bir fonksiyon var. Şimdi diğer tüm `goals/*` route'larıyla
   (`save.js`, `report.js`, `give-mana.js`) birebir aynı çağrıyı
   kullanıyor: `canViewGoal(goalId, user.id)`.

3. **Yol Haritası (micro_goals) artık kopyalanıyor.** Bunu gözden
   kaçırmıştım — `create.js`'nin `roadmap` parametresi olduğunu ve
   `list.js`'nin her vizyonu `micro_goals` alt-listesiyle birlikte
   döndürdüğünü görünce fark ettim; Android tarafında `GoalDetailScreen`
   bunu zaten aktif gösteriyor. Kopyalarken `is_completed` bilinçli
   olarak sıfırlanıyor — orijinalde tamamlanmış bir adım, yeni kullanıcı
   için henüz yapılmamıştır.

4. **Slayt kolonları düzeldi**: önceki taslakta `sort_order` diye
   yanlış bir kolon adı vardı, gerçeği `order_index`. Bu, Supabase'e
   bağlanıp gerçek şemayı sorgulayınca ilk teslimatta zaten düzeltilmişti.

5. **`source_slide_id` set edilmiyor (bilinçli karar, netleşti)**:
   `slides/create.js`'nin yorumunu okuyunca bu alanın aslında
   `handle_slide_save` trigger'ı üzerinden "orijinal slaytın
   `saves_count`'unu artır" anlamına geldiğini gördüm — vizyon klonlama
   ile slayt-seviyesi beğeni sayacı farklı kavramlar, karıştırmadım.

## Android tarafında değişiklik gerekmiyor

`CloneGoalResponse.goal: Goal?` alanı olduğu gibi kalabilir —
backend'in döndürdüğü `{...cloned, micro_goals: [...]}` şekli Android'deki
`Goal.microGoals` (`@SerialName("micro_goals")`) ile zaten örtüşüyor.
`NetworkModule.kt`'de `ignoreUnknownKeys = true` olduğu için backend'in
gönderdiği ekstra `slides` alanı da sorun çıkarmaz, sessizce yok sayılır.

## Kurulum

Bu klasördeki `pages/api/goals/clone.js` dosyasını olduğu gibi
`pages/api/goals/clone.js` yoluna koyup üzerine yazmanız yeterli —
önceki `web/pages/api/goals/clone.js` taslağının yerini alıyor.
