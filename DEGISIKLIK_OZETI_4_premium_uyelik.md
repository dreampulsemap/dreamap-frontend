# Değişiklik Özeti — Gumroad Premium Üyeliğinin Aura Akışlarına Bağlanması

Bu paket, `__24_.zip` baz alınarak hazırlandı. Sadece bu özellik için
değişen/yeni dosyalar var (6 dosya) — geri kalan her şey `__24_.zip` ile
birebir aynı, üzerine kopyalayabilirsin.

## Ne yapıldı

`pages/api/gumroad-webhook.js` zaten Gumroad'daki premium üyelik satışını
`feature_entitlements` tablosuna (`feature_code = 'premium_membership'`)
yazıyordu — ama bu kayıt hiçbir yerde OKUNMUYORDU. Aura harcayan üç akış da
(derin analiz, görsel üretimi, cron güvenlik ağı) üyeliği görmeden herkesten
Aura kesmeye devam ediyordu. Bu paket bu boşluğu kapatıyor.

**Yeni dosya:**
- `lib/premiumMembership.js` — `isPremiumMember(userId)` ve
  `getAuraBalance(userId)`. `lib/premiumVideoStatus.js` ile aynı
  `feature_code` ve aynı "aktif + süresi dolmamış" kontrolünü kullanıyor;
  o dosyaya dokunulmadı (video akışı kırılmasın diye mantık burada ayrı
  tutuldu).

**Değişen dosyalar:**
- `pages/api/generate-deep-analysis.js` — premium üyeden 8 Aura
  düşülmüyor; başarısızlıkta da (hiç kesilmediği için) iade yapılmıyor.
- `pages/api/generate-dream-image.js` — aynı mantık, 2 Aura'lık görsel
  ücreti için.
- `pages/api/cron/process-deep-analysis.js` — güvenlik ağı worker'ı da
  aynı kontrolü yapıyor (aksi halde premium bir üyenin hiç kesilmemiş
  Aura'sını yanlışlıkla "iade" edip bakiyesine 8 Aura hediye edebilirdi).
- `components/DreamCard.jsx` — kullanıcı oturumu değiştiğinde
  `/api/user/premium-status`'u da çağırıp `isPremiumMember` state'ini
  tutuyor; iki yanıt handler'ı da (görsel + derin analiz) sunucudan gelen
  güncel `isPremiumMember`/`aurasLeft` ile senkronlanıyor.
- `components/DeepAnalysisConfirmationModal.jsx` — premium üyede Aura
  bakiyesi yerine "Premium · Sınırsız" rozeti gösteriliyor, buton her
  zaman aktif, "· 8 Aura" ibaresi butondan kalkıyor. **Senin eklediğin
  `max-h-[90vh] overflow-y-auto` düzeltmesine dokunmadım**, korunuyor.
- `lib/dreamCardTranslations.js` — üç yeni anahtar (`premiumUnlimitedLabel`,
  `startAnalysisPremiumLabel`, `startGiftAnalysisPremiumLabel`) dosyadaki
  **11 dilin tamamına** eklendi (en, tr, ru, ar, es, hi, zh, de, fr, pt, ja).
  Modal artık bunları `lang` prop'una göre `getDreamCardText()` üzerinden
  okuyor — hardcoded TR/EN metin kalmadı.

## Önemli varsayım — kontrol et

Premium üyeliği hem **derin analize (8 Aura)** hem de **görsel üretimine
(+2 Aura)** sınırsız erişim olarak kapsadım — "premium = tüm Aura'lı
özellikler serbest" mantığıyla, `lib/premiumVideoStatus.js`'teki premium
video presedansıyla tutarlı olsun diye. Eğer niyetin premium üyeliği
SADECE derin analize vermekse (görsel ayrı ücretli kalsın istiyorsan),
`pages/api/generate-dream-image.js`'deki `isPremiumMember` kontrolünü
kaldırman yeterli — geri kalanı etkilemez.

## Test edilemedi / edildi

- **Sözdizimi:** Değişen tüm dosyalar `node --check` ile tarandı, hatasız.
- **Gerçek akış:** Buradan Supabase'e veya Gumroad'a bağlanamadığım için
  gerçek bir premium satın alma ile uçtan uca deneyemedim. Deploy sonrası
  bir test hesabına premium ürünü satın aldırıp derin analiz/görsel
  butonlarının Aura sormadan çalıştığını bir kez doğrulaman gerekiyor.
- **Diller:** Sadece dizi/söz dizimi doğrulandı — 11 dilin çevirilerini
  bir anadil konuşmacısı gözden geçirmedi (özellikle Arapça, Hintçe, Çince,
  Japonca satırları makine kalitesinde, ton için gerçek bir konuşmacıya
  kontrol ettirmen iyi olur).
