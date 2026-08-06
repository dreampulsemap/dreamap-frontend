# Değişiklik Özeti 7 — Temel SEO Altyapısı

Bu paket önce `__51_.zip` baz alınarak hazırlandı, sonra en son yüklediğin
`__1_.zip` ("en son en güncel hali") ile karşılaştırıldı. Aradaki farkta 5
dosyanın (`pages/index.js`, `explore.js`, `vision-board.js`, `profile.js`,
`pages/u/[userId].js`) sen tarafından da değiştiği görüldü — muhtemelen yeni
Günce (Diary) özelliği ve vizyon kaydetme/raporlama eklentileri. Bu 5 dosya
için SEO yaması, senin en güncel kodun üzerine yeniden uygulandı; kalan 21
dosya `__51_`'den beri hiç değişmemiş, direkt üzerine kopyalayabilirsin.
`npm install` + `npm run build`, senin en güncel kodunun (`__1_`) üzerine bu
22 dosya bindirilmiş haliyle sandbox'ta hatasız tamamlandı.

Bu zip yalnızca değişen/eklenen 22 dosyayı içeriyor — projenin tamamı değil.
Kendi ağaçlarındaki karşılıklarının üzerine aynı klasör yoluyla kopyala.

## İstek
Paylaşılan SEO analizi 4 başlık altında topluyordu: içerik/metin eksikliği,
meta etiketleri, teknik SEO (robots/sitemap), off-page/backlink. İlk üçü
koddan düzeltilebilir, dördüncüsü (backlink, sosyal medya) kod dışı bir iş —
bu yüzden bu paket yalnızca ilk üçü kapsıyor.

## 1) `components/Seo.jsx` — yeni, ortak SEO bileşeni
`pages/globe.js` dışında hiçbir sayfada `<Head>` yoktu; globe.js da yalnızca
title+description yazıyordu (canonical/OG/Twitter/robots/JSON-LD hiçbiri
yoktu). Artık her sayfa bu bileşeni import edip title/description/noindex/
jsonLd geçiyor; canonical URL, Open Graph, Twitter Card ve robots meta tek
yerden üretiliyor.

## 2) Anasayfa içeriği Google'a hiç ulaşmıyordu — düzeltildi
`pages/index.js`'te `{!user && <Hero />}` tamamen `!mounted` bayrağının
arkasındaydı; `mounted` yalnızca `useEffect` içinde `true` olduğu için
sunucu tarafı render'da (SSR/ilk HTML — Google'ın ve JS çalıştırmayan
WhatsApp/Twitter link botlarının gördüğü hali) Hero hiç render olmuyor,
yerine 2 iskelet (`TextSkeleton`) basılıyordu. Yani sitenin tek gerçek
metin içeriği ("Dünyanın bilinçaltına hoş geldin" başlığı + açıklama)
arama motoruna hiçbir zaman ulaşmıyordu.

Düzeltme: Hero artık `!user` ile doğrudan kontrol ediliyor (`mounted`'dan
bağımsız). `user` başlangıç değeri (`useState(null)`) hem sunucuda hem
istemcinin hydration-öncesi ilk renderında aynı olduğu için mismatch riski
yok. Anasayfaya ayrıca WebSite + Organization JSON-LD eklendi. Yeni
`DiaryStoryRow` bloğuna (`{mounted && user && (...)}`) dokunulmadı, olduğu
gibi korundu.

## 3) `public/robots.txt` + `public/sitemap.xml` — yeni
robots.txt yalnızca `/api/`, `/admin`, `/analizetgulum`, `/gorseltamiri`,
`/gumroad-test`'i engelliyor — geri kalan özel sayfalar (`/dream/[id]`,
`/u/[userId]`, `/profile`, `/messages`, `/add-dream`, `/vision-board`)
BİLEREK robots.txt'te engellenmedi, bunun yerine sayfa başına `noindex`
meta etiketi kullanıldı — robots.txt engeli Google'ın sayfayı hiç
taramasını engellediği için `noindex` etiketini de göremiyor. sitemap.xml
şimdilik statik, yalnızca 4 genel-erişim rotasını listeliyor: `/`,
`/explore`, `/globe`, `/auth`.

## 4) Sayfa bazlı meta etiketleri
**İndexlenen:** `/` (varsayılan), `/explore`, `/globe` (eski manuel
`<Head>` kaldırıldı), `/auth`.

**`noindex` verilen:** `/add-dream`, `/vision-board`, `/profile`,
`/messages` (var olan tekrarlı manuel `<Head><title>` kaldırılıp `Seo`'ya
taşındı), `/admin`, `/admin/dream-images`, `/analizetgulum`,
`/gorseltamiri`, `/gumroad-test`, `/auth/callback`, `/u/[userId]`.

`/u/[userId]` en güncel kodda da hâlâ oturumsuz ziyaretçiyi `/auth`'a
yönlendiriyor (`if (!viewer) router.push('/auth')`) — bunu `__1_`'de tekrar
doğruladım. İleride profiller girişsiz görüntülenebilir hale gelirse
`noindex` kaldırılıp sitemap'e eklenebilir.

## 5) `/dream/[id]` — SSR eklendi ama bilerek `noindex`
`pages/api/get-dream.js` service-role client ile sahiplik/görünürlük
kontrolü yapmadan id ile herhangi bir rüyayı herkese döndürüyor, ve
`premium_deep_analysis` alanı `shadow_focus`/`core_conflict`/`hidden_self`
gibi oldukça kişisel içerik barındırıyor — bu yüzden bilerek `noindex`
bıraktım (varsayım; ürün tarafında farklı düşünülüyorsa kaldırılabilir).
`getServerSideProps` eklendi ki paylaşılan linkler WhatsApp/Twitter'da
düzgün önizlensin; mevcut istemci tarafı fetch akışına dokunulmadı, SSR
verisi yalnızca `<Seo>` için kullanılıyor. `lib/supabaseAdmin.js`'e `__1_`
ile eklenen `getAcceptedFriendIds` fonksiyonu bu dosyayı etkilemiyor,
sadece ek bir export.

## 6) `public/manifest.webmanifest` — yeniden eklendi
`public/sw.js` zaten `/icon-192.png`'yi referans veriyordu; muhtemelen
prod'da var, export'a dahil değildi. Mevcut ikon yollarını referans alan
bir manifest yeniden oluşturuldu, `pages/_document.js`'e manifest/favicon/
apple-touch-icon linkleri eklendi.

## Kapsam dışı bırakılanlar
- Off-page SEO (backlink, sosyal medya) — kod dışı.
- `/dream/[id]` ve `/u/[userId]`'i tam herkese açık + indexli yapmak —
  gizlilik/erişim kontrolü nedeniyle bilinçli yapılmadı, ürün kararı ister.
- Google Search Console kaydı — hesap işlemi, kod değişikliği değil.
