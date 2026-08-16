# Değişiklik Özeti 8 — Rüya Gizliliği: Ek Düzeltmeler

Bu paket, yüklediğin `dreamap-frontend-main__19_.zip` baz alınarak hazırlandı.
O zip'te zaten 5 kritik dosya (`my-dreams.js`, `get-dream.js`, `like.js`,
`comment.js`, `submit-dream.js`) `getAuthedUser` deseniyle doğru şekilde
düzeltilmişti — bunları tek tek eski/yeni diff'ini alıp, Lunosfer2 (Android)
reposundaki `LunosferApi.kt` + `AuthInterceptor.kt` ile çapraz kontrol ederek
doğruladım. O 5 dosyaya bu pakette dokunulmadı.

Bu pakette **3 dosya** var — o doğrulama sırasında bulunan, henüz kapatılmamış
3 ek açığın/riskin düzeltmesi:

## 1) `pages/dream/[id].js` — iki ayrı sızıntı

**a) İstemci fetch'i token göndermiyordu.** `get-dream.js`'in backend'i artık
public olmayan rüyalar için `Authorization: Bearer` istiyor, ama bu sayfadaki
`useEffect` içindeki fetch header'sız kalmıştı. Deploy edilseydi, private/
friends bir rüyanın linkine giden herkes — **sahibi dahil** — 403 alacaktı.
Artık `lib/supabase.js`'teki mevcut `getAuthHeader()` yardımcısı kullanılıyor.

**b) `getServerSideProps` görünürlüğe bakmadan `premium_deep_analysis`
çekiyordu.** Bu fonksiyon `supabaseAdmin` (RLS bypass) ile çalışıyor ve
WhatsApp/Twitter önizlemesi için başlık/özet üretiyordu — ama hangi rüya
olursa olsun, `shadow_focus`/`core_conflict`/`hidden_self` gibi kişisel
alanlardan türetilmiş bir özeti SSR HTML'in `<head>` meta etiketlerine
yazıyordu. Bu, oturum kontrolü olmayan bir yol olduğu için `view-source` ile
**herkes** tarafından okunabilirdi — noindex olması bunu engellemiyordu,
sadece Google'ın indekslemesini engelliyordu. Artık `visibility === 'public'`
değilse `{ props: {} }` dönüyor, sayfa generic başlık/açıklamaya düşüyor.

## 2) `pages/api/get-dream.js` — "friends" görünürlüğü artık gerçekten çalışıyor

v19'daki fix, `friends` görünürlüğünü de geçici olarak "sadece sahibi"yle
sınırlamıştı (yorumda da belirtilmişti — güvenlik açısından sorun değildi,
sadece eksik bir özellikti). Artık `lib/supabaseAdmin.js`'deki
`getAcceptedFriendIds()` ile (goals tarafındaki `canViewGoal` ile birebir
aynı desen) gerçek arkadaşlık kontrolü yapılıyor: sahibi her zaman görür,
kabul edilmiş bir arkadaş `friends` rüyasını görebilir, `private` yalnızca
sahibine açık.

## 3) `pages/api/comment.js` — GET artık rüyanın görünürlüğüne bakıyor

Bu, orijinal taramada hiç bahsedilmemiş ayrı bir sızıntıydı: `POST`/`DELETE`
düzeltilmişti ama `GET` hâlâ herhangi bir kontrol yapmıyordu — `dreamId`'yi
bilen herkes, rüya private/friends olsa bile o rüyanın tüm yorumlarını ve
yorumcuların kimliklerini (`user_profiles` join'i ile ad+avatar dahil)
okuyabiliyordu. Artık yorumları dönmeden önce ebeveyn rüyanın sahibi/
arkadaşlık/public durumu kontrol ediliyor — `get-dream.js` ile aynı mantık.

**Bilinçli olarak değiştirilmeyen bir nokta:** `POST` (yorum ekleme) hâlâ
görülemeyen bir rüyaya yorum atmayı teknik olarak engellemiyor — bu ayrı bir
tasarım kararı, istersen onu da ekleyebilirim.

## Doğrulama
Üç dosya da esbuild ile tek tek ve reponun tamamıyla birlikte (223 dosya)
sözdizimi taramasından geçirildi, hata yok. `getAcceptedFriendIds` ve
`getAuthHeader` zaten `lib/supabaseAdmin.js` ve `lib/supabase.js`'de mevcut
ve export edilmiş durumdaydı, yeni bir bağımlılık eklenmedi.

## Nasıl uygularsın
Bu zip yalnızca 3 dosyayı içeriyor. Kendi ağacındaki karşılıklarının üzerine
aynı klasör yoluyla kopyala:
- `pages/dream/[id].js`
- `pages/api/get-dream.js`
- `pages/api/comment.js`
