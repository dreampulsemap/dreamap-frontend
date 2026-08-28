# MANIFEST — Kullanım Koşulları + Engelleme/Şikayet UI (Web)

Tarih: 27 Ağustos 2026
Kapsam: Play Store checklist madde 2 (ToS eksikti, Privacy hiçbir yerden
linklenmiyordu) + madde 4'ün web tarafı (backend hazırdı, UI yoktu)

## Ne yapıldı

### Yeni dosyalar
- `pages/terms.js` — Kullanım Koşulları / EULA, tr+en (tarayıcı diline
  göre otomatik, sağ üstte manuel değiştirme linki de var). Madde 4
  "Yasak Davranışlar" bölümü nefret söylemi, müstehcen/cinsel içerik
  (özellikle reşit olmayanlarla ilgili net bir cümle), taciz, şiddet
  çağrısı gibi Google Play'in UGC politikasında zorunlu tuttuğu maddeleri
  içeriyor. Madde 5-6'da bildirme/engelleme mekanizmasından ve
  yaptırımlardan (içerik kaldırma, hesap askıya alma) bahsediyor.
  **Play Console > App content formuna gireceğin URL:**
  `https://www.lunosfer.com/terms`

### Değiştirilen dosyalar
- `components/Sidebar.jsx` — masaüstü sol menünün en altına Gizlilik
  Politikası + Kullanım Koşulları linkleri eklendi (`mt-auto` ile en alta
  yapışık). Daha önce `/privacy` hiçbir yerden linklenmiyordu, sadece
  doğrudan URL ile erişilebiliyordu — bu artık düzeldi.
- `pages/profile.js` — Sidebar'ın görünmediği mobil web için aynı linkler
  (Gizlilik / Kullanım Koşulları / Hesabı Sil) sayfanın en altına, ortalı
  küçük bir footer olarak eklendi.
- `pages/u/[userId].js` — bir başkasının profilinde artık Takip Et /
  Mesaj butonlarının yanında "..." menüsü var:
  - **Kullanıcıyı Şikayet Et** → `/api/reports/user`'a gerçek çağrı,
    `lib/reportReasons.js`'teki paylaşılan 6 sebep listesini kullanıyor
    (SlidesViewer/VisionVideoPlayer'daki rapor sheet'iyle aynı tasarım
    dili ve aynı sebep listesi).
  - **Kullanıcıyı Engelle / Engeli Kaldır** → `/api/blocks/block` ve
    `/api/blocks/unblock`'a gerçek çağrı, sayfa açılışında
    `/api/blocks/status` ile mevcut durum çekiliyor. Onay dialog'u var
    (yanlışlıkla engellemeyi önlemek için).

## Nasıl uygulanır
Bu zip'teki dosyaları aynı göreli yollara (repo kökünden `pages/...`,
`components/...`) kopyala — `pages/u/[userId].js` ve `pages/profile.js`
tam değiştirilmiş dosyalar, elle merge gerekmiyor.

## Test edilmedi (npm/Next.js build erişimim yok)
- Gerçek bir `next build` çalıştırılmadı — ağ erişimim olmadığı için
  bağımlılıkları kuramadım. `pages/u/[userId].js` dosyasını satır satır
  elle inceledim, JSX/parantez dengesi script ile de doğrulandı, ama
  gerçek bir derlemenin yerini tutmaz. Vercel'e push ettiğinde önce
  preview deploy'un build loglarına bak.
- Kullandığım Tailwind sınıfları (`bg-astral-gold`, `bg-shadowWork-rose`
  vb.) `tailwind.config.js`'de tanımlı olduğunu doğruladım, ama tarayıcıda
  görsel olarak test edilmedi.

## Bilinçli kapsam dışı bırakılanlar
- **Rüya ve mesaj bazlı rapor UI'ı web'e eklenmedi** — sadece kullanıcı
  raporu (profil sayfasından) yapıldı. Sebep: Google Play sadece Android
  uygulamasını inceliyor, web sitesini incelemiyor; bu yüzden önceliği
  Android'e verdim (aynı teslimat serisinin ilk mesajında tamamlandı).
  İstersen `DreamCard.jsx`'e ve `messages.js`'e de aynı deseni (paylaşılan
  `REPORT_REASONS` + `/api/reports/dream` ve `/api/reports/message`)
  ekleyebilirim.
- **Engellenen Kullanıcılar listesi web'e eklenmedi** — `/api/blocks/list`
  hazır ama profile.js'te bir liste ekranı yok. Android'de bu var
  (BlockedUsersScreen). İstersen ekleyebilirim.

## Bir sonraki adım
`npm run build` (veya Vercel preview deploy) ile derleme hatası var mı
kontrol et. Sorun çıkarsa bana logu yapıştır.
