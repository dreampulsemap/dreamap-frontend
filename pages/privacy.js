// pages/privacy.js
//
// Play Console > App content > Privacy Policy alanına gireceğin URL:
// https://www.lunosfer.com/privacy
//
// [KÖŞELİ PARANTEZ] ile işaretlenmiş yerleri doldurman gerekiyor —
// bunlar gerçek şirket/iletişim bilgisi, ben üretemem.

import { useState, useEffect } from 'react'
import Seo from '@/components/Seo'

const COMPANY_NAME = 'Lunosfer'
const CONTACT_EMAIL = 'support@lunosfer.com'
const LAST_UPDATED = '22 Ağustos 2026'

const SECTIONS = {
  tr: [
    {
      h: '1. Kim Olduğumuz',
      p: [`${COMPANY_NAME}, Lunosfer uygulamasının geliştiricisi ve veri sorumlusudur.`],
    },
    {
      h: '2. Topladığımız Veriler',
      ul: [
        'Hesap bilgileri: e-posta adresi ve şifre (Supabase üzerinden; şifreniz düz metin olarak tutulmaz).',
        'Profil bilgileri: kullanıcı adı, görünen ad, profil fotoğrafı, biyografi, dil tercihi ve isteğe bağlı cinsiyet.',
        'Kullanıcı içeriği: rüya kayıtları, vizyon/hedef panoları, günlük girişleri (sesli kayıt içerebilir), yorumlar ve mesajlar.',
        'Konum verisi: bir rüyaya konum eklediğinizde GPS veya (GPS yoksa) IP tabanlı yaklaşık konum — her zaman isteğe bağlı.',
        'Bildirim belirteci: push bildirimi gönderebilmek için cihazınıza özgü bir Firebase belirteci.',
        'Satın alma bilgileri: Google Play üzerinden yapılan işlemlerin kaydı. Kart bilgileriniz bize ulaşmaz, yalnızca Google Play işler.',
        'Cihaz/güvenlik sinyalleri: kötüye kullanımı önlemek için Firebase App Check (Google reCAPTCHA).',
      ],
    },
    {
      h: '3. Verilerinizi Nasıl Kullanıyoruz',
      ul: [
        'Hesabınızı oluşturmak, doğrulamak ve güvenliğini sağlamak',
        'İçeriğinizi kaydetmek ve arkadaşlarınızla paylaşmanızı sağlamak',
        'Push bildirimleri göndermek',
        'Satın aldığınız premium özellik/Aura paketini hesabınıza tanımlamak',
        'Hizmeti iyileştirmek, kötüye kullanımı önlemek',
      ],
    },
    {
      h: '4. Verilerinizi Kimlerle Paylaşıyoruz',
      p: ['Verilerinizi reklam amacıyla satmıyoruz. Hizmeti çalıştırmak için sınırlı veri şu sağlayıcılarla paylaşılır:'],
      ul: [
        'Supabase — kimlik doğrulama, veritabanı, dosya depolama',
        'Google / Firebase — push bildirim, App Check, uygulama içi satın alma',
        'Pixabay — medya arama sorgunuz iletilir; hesap bilginiz paylaşılmaz',
        'ipinfo.io — yalnızca GPS yokken, IP adresinizden yaklaşık konum çözümlemek için',
      ],
    },
    {
      h: '5. Veri Saklama',
      p: [
        'Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı sildiğinizde verileriniz kalıcı olarak silinir (bkz. madde 6). İstisna: satın alma kayıtlarınız, muhasebe/yasal yükümlülükler nedeniyle kişisel bağı kaldırılarak (anonim olarak) saklanabilir.',
      ],
    },
    {
      h: '6. Hesabınızı Silme',
      p: ['Hesabınızı ve ilişkili tüm verilerinizi istediğiniz zaman kalıcı olarak silebilirsiniz:'],
      ul: [
        'Uygulama içinden: Profil → Hesabı Sil',
        'Uygulamayı kullanmadan (web): lunosfer.com/delete-account',
      ],
      pAfter: ['Bu işlem geri alınamaz.'],
    },
    {
      h: '7. Veri Güvenliği',
      p: ['Veri aktarımı HTTPS ile şifrelenir. Veritabanı erişimi, yalnızca kendi verilerinize erişebilmenizi sağlayan satır düzeyi güvenlik (RLS) kurallarıyla korunur.'],
    },
    {
      h: '8. Çocukların Gizliliği',
      p: ['Lunosfer, 13 yaşın altındaki çocuklara yönelik değildir ve bu yaş grubundan bilerek veri toplamaz.'],
    },
    {
      h: '9. Haklarınız',
      p: ['Bulunduğunuz ülkeye bağlı olarak (KVKK, GDPR vb.) verilerinize erişme, düzeltme, taşıma veya silme talep etme hakkına sahip olabilirsiniz. İletişim bilgilerimiz aşağıdadır.'],
    },
    {
      h: '10. Değişiklikler',
      p: ['Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişikliklerde uygulama içinden bilgilendiririz.'],
    },
  ],
  en: [
    { h: '1. Who We Are', p: [`${COMPANY_NAME} is the developer and data controller of the Lunosfer app.`] },
    {
      h: '2. Data We Collect',
      ul: [
        'Account info: email and password (via Supabase; never stored in plain text).',
        'Profile info: username, display name, photo, bio, language, optional gender.',
        'User content: dreams, vision/goal boards, diary entries (may include voice recordings), comments and messages.',
        'Location: GPS or (if unavailable) approximate IP-based location when you tag a dream — always optional.',
        'Push token: a device-specific Firebase token used to send notifications.',
        'Purchase info: a record of Google Play transactions. Card details never reach us.',
        'Device/security signals: Firebase App Check (Google reCAPTCHA) to prevent abuse.',
      ],
    },
    {
      h: '3. How We Use Your Data',
      ul: [
        'Create, authenticate and secure your account',
        'Store your content and let you share it with friends',
        'Send push notifications',
        'Apply purchased premium features / Aura packs',
        'Improve the service and prevent abuse',
      ],
    },
    {
      h: '4. Who We Share Data With',
      p: ['We do not sell your data for advertising. Limited data is shared with:'],
      ul: [
        'Supabase — auth, database, file storage',
        'Google / Firebase — push notifications, App Check, billing',
        'Pixabay — your search query when searching media; account info not shared',
        'ipinfo.io — only when GPS is unavailable, to resolve an approximate location from your IP',
      ],
    },
    {
      h: '5. Data Retention',
      p: ['Data is kept while your account is active. When deleted, your data is permanently removed (see §6). Exception: purchase records may be retained with the personal link removed, for accounting/legal reasons.'],
    },
    {
      h: '6. Deleting Your Account',
      p: ['You can permanently delete your account and data at any time:'],
      ul: ['In the app: Profile → Delete Account', 'Without the app (web): lunosfer.com/delete-account'],
      pAfter: ['This action cannot be undone.'],
    },
    {
      h: '7. Data Security',
      p: ['Data is encrypted in transit via HTTPS. Database access is protected by row-level security so you can only access your own data.'],
    },
    { h: '8. Children\u2019s Privacy', p: ['Lunosfer is not directed at children under 13 and we do not knowingly collect their data.'] },
    { h: '9. Your Rights', p: ['Depending on your location (GDPR, etc.) you may have rights to access, correct, port, or delete your data. Contact us below.'] },
    { h: '10. Changes', p: ['We may update this policy; material changes will be announced in-app.'] },
  ],
}

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState('tr')
  useEffect(() => {
    const browserLang = (navigator.language || 'tr').slice(0, 2)
    setLang(browserLang === 'tr' ? 'tr' : 'en')
  }, [])

  const sections = SECTIONS[lang]
  const title = lang === 'tr' ? 'Lunosfer Gizlilik Politikası' : 'Lunosfer Privacy Policy'
  const updatedLabel = lang === 'tr' ? 'Son güncelleme' : 'Last updated'
  const contactLabel = lang === 'tr' ? 'İletişim' : 'Contact'

  return (
    <div className="min-h-screen bg-void-950 text-white px-4 py-16">
      <Seo title={title} lang={lang} />

      <div className="max-w-2xl mx-auto">
        <button onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')} className="text-xs text-white/50 mb-6 underline">
          {lang === 'tr' ? 'English' : 'Türkçe'}
        </button>

        <h1 className="text-2xl font-bold text-astral-gold mb-1">{title}</h1>
        <p className="text-xs text-white/40 mb-8">{updatedLabel}: {LAST_UPDATED}</p>

        {sections.map((s) => (
          <div key={s.h} className="mb-8 border-t border-white/10 pt-6">
            <h2 className="text-astral-gold font-semibold mb-2">{s.h}</h2>
            {s.p?.map((line) => (
              <p key={line} className="text-sm text-white/70 mb-2">{line}</p>
            ))}
            {s.ul && (
              <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-2">
                {s.ul.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {s.pAfter?.map((line) => (
              <p key={line} className="text-sm text-white/70">{line}</p>
            ))}
          </div>
        ))}

        <div className="rounded-lg border border-white/10 bg-void-900 px-4 py-4">
          <p className="font-semibold text-sm mb-1">{contactLabel}</p>
          <p className="text-sm text-white/70">{CONTACT_EMAIL}</p>
        </div>
      </div>
    </div>
  )
}
