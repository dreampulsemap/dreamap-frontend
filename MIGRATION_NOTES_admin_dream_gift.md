# Admin Paneli — Rüya Yönetimi — Kurulum

`/admin` bölümü için gereken tek şey aşağıdaki env var. Yeni bir tabloya/
storage bucket'ına gerek yok — mevcut `image-library` bucket'ı (Pixabay
entegrasyonundan, bkz. `MIGRATION_NOTES_pixabay.md`) hem Pixabay hem
cihazdan yüklenen görseller için kullanılıyor.

## 1. Env var (Vercel + `.env.local`)

```
ADMIN_TOKEN=uzun-rastgele-bir-parola
```

`/admin` sayfaları bu token'ı isteyip `lib/adminAuth.js` üzerinden
doğruluyor — Supabase kullanıcı hesaplarıyla hiçbir ilgisi yok, tamamen
ayrı ve tek-kullanıcılı bir koruma (mevcut `ADMIN_REANALYZE_TOKEN`
deseniyle aynı mantık). Girilen token, doğrulandıktan sonra tarayıcıda
`localStorage`'a kaydedilir, tekrar tekrar girmene gerek kalmaz.

## 2. SQL migration — `008_admin_dream_image_gift.sql`

`notifications.type` CHECK constraint'i yalnızca 4 değeri kabul ediyordu
(`mana_received`, `goal_comment`, `friend_request`, `friend_accepted`).
Bu dosya listeye `dream_image_gift` ekliyor ki bir rüyaya görsel
eklendiğinde sahibine Navbar zili bildirimi + push bildirimi gidebilsin.

**Bu migration'ı senin adına Supabase'e doğrudan uyguladım** (bağlı
Supabase entegrasyonu üzerinden) — proje: `dreampulsemap's Project`.
Ek olarak diğer migration'ların gibi dosyası da burada duruyor, referans
için. Yalnızca kısıtı genişletiyor, hiçbir satırı silmiyor/değiştirmiyor.
Bu adımı tekrar yapmana gerek yok.

*Not (ilgisiz ama fark ettim):* Kod tarafında `lib/notify.js` şu an
`analysis_ready`, `analysis_failed`, `new_follower`, `follow_accepted`
tiplerini de aynı tabloya yazmaya çalışıyor — bunlar da constraint
listesinde yok, yani o 4 tip için uygulama-içi bildirim (push değil,
yalnızca zil ikonundaki) sessizce başarısız oluyor olabilir. Bu
konuşmanın kapsamı dışında bıraktım, istersen ayrı bir turda bakarım.

## Akış özeti

1. `/admin` → token gir → `/admin/dream-images` ("Rüya Yönetimi").
2. **Görselsiz/Bozuk** sekmesi (varsayılan): `ai_image_url` boş OLAN ya da
   `image_status = 'broken'` olan rüyalar (onarım denemeleri tükenmiş,
   bkz. `lib/repairDreamImage.js`). **Tümü** sekmesi hiç filtrelemez.
3. Bir kart üzerinde:
   - **Pixabay** → mevcut `PixabayPicker` bileşenini açar, elle bir
     görsel seçip o rüyaya bağlarsın.
   - **Yükle** → kendi cihazından bir görsel seç, doğrudan yüklenir
     (`pages/api/admin/dreams/upload-image.js`, base64 ile — yeni bir
     paket/bağımlılık gerekmedi).
   - **Kalem ikonu** (sağ üst) → düzenleme penceresini açar: içerik,
     konum, etiketler, görünürlük (herkese açık/arkadaşlar/gizli),
     feed'de gösterme, ve kalıcı silme (iki adımlı onayla).
4. Her iki görsel ekleme yolu da (Pixabay/Yükle) rüya sahibine bildirim
   gönderir: `lib/adminDreamGift.js` → `notifyDreamImageGift`. Düzenleme
   (içerik/etiket/görünürlük) ve silme bildirim göndermez — bunlar admin
   moderasyon işlemleri, "hediye" değil.
5. Rastgele/otomatik görsel seçimi **yok** — bilinçli olarak kaldırıldı,
   her görsel admin tarafından elle seçiliyor.

## API uç noktaları (`/api/admin/dreams/`, hepsi `Authorization: Bearer
ADMIN_TOKEN` ister)

- `GET list` — `?filter=missing|all&page=N`
- `POST attach-image` — `{ dreamId, hit }` (Pixabay sonucu)
- `POST upload-image` — `{ dreamId, fileName, fileType, dataBase64 }`
- `POST update` — `{ dreamId, content?, location_name?, visibility?, in_feed?, tags? }`
- `POST delete` — `{ dreamId }` (kalıcı silme, geri alınamaz)
