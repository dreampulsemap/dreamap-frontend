// pages/terms.js
//
// Play Console > App content > "Kullanım Koşulları" alanına gireceğin URL:
// https://www.lunosfer.com/terms
//
// Bu sayfa, Google Play'in UGC (Kullanıcı Tarafından Üretilen İçerik)
// politikasının zorunlu kıldığı 3 unsurdan üçüncüsünü karşılar:
//   1. Şikayet mekanizması  -> uygulama içi "Bildir" butonları
//   2. Engelleme mekanizması -> uygulama içi "Engelle" butonları
//   3. Nefret söylemi / müstehcenlik yasağı EULA metni -> BURASI (madde 4)
//
// [KÖŞELİ PARANTEZ] yok — privacy.js'deki gerçek şirket/iletişim
// bilgileriyle aynı sabitler kullanıldı.

import { useState, useEffect } from 'react'
import Seo from '@/components/Seo'

const COMPANY_NAME = 'Lunosfer'
const CONTACT_EMAIL = 'support@lunosfer.com'
const LAST_UPDATED = '27 Ağustos 2026'

const SECTIONS = {
  tr: [
    {
      h: '1. Kabul',
      p: [`Lunosfer uygulamasını (${COMPANY_NAME}) kullanarak bu Kullanım Koşullarını kabul etmiş olursunuz. Kabul etmiyorsanız uygulamayı kullanmayınız.`],
    },
    {
      h: '2. Hesap Sorumluluğu',
      p: [
        'Hesabınızın ve şifrenizin güvenliğinden siz sorumlusunuz. 13 yaşın altındaysanız Lunosfer\u2019u kullanamazsınız.',
      ],
    },
    {
      h: '3. Kullanıcı İçeriği',
      p: [
        'Rüya kayıtları, vizyon/hedef panoları, günlük girişleri, yorumlar ve mesajlar dahil paylaştığınız her içerikten (\u201cKullanıcı İçeriği\u201d) siz sorumlusunuz. İçeriğinizi Lunosfer üzerinde barındırmamız ve göstermemiz için bize dünya çapında, münhasır olmayan bir lisans verirsiniz.',
      ],
    },
    {
      h: '4. Yasak Davranışlar',
      p: ['Lunosfer\u2019da aşağıdakiler kesinlikle yasaktır:'],
      ul: [
        'Nefret söylemi: ırk, etnik köken, din, cinsiyet, cinsel yönelim, engellilik veya benzeri özelliklere dayalı ayrımcı, aşağılayıcı veya şiddeti teşvik eden içerik',
        'Müstehcen veya cinsel içerikli materyal, özellikle reşit olmayanları içeren veya hedef alan hiçbir içerik',
        'Taciz, zorbalık, tehdit, stalking veya bir kişiyi hedef alan sürekli rahatsız edici davranış',
        'Şiddet çağrısı, kendine zarar verme veya intiharı teşvik eden içerik',
        'Spam, dolandırıcılık, kimlik taklidi veya yanıltıcı bilgi yayma',
        'Yasa dışı faaliyetleri teşvik eden veya kolaylaştıran içerik',
        'Fikri mülkiyet haklarını ihlal eden içerik',
      ],
    },
    {
      h: '5. Bildirme ve Engelleme',
      p: [
        'Uygunsuz bir içerikle veya kullanıcıyla karşılaşırsanız, ilgili içerik/profil üzerindeki \u201cBildir\u201d seçeneğini kullanarak bize iletebilir, \u201cEngelle\u201d seçeneğiyle o kullanıcıyla etkileşiminizi tamamen durdurabilirsiniz. Bildirimler ekibimiz tarafından incelenir.',
      ],
    },
    {
      h: '6. Uygulanan Yaptırımlar',
      p: [
        'Bu Kullanım Koşullarını, özellikle madde 4\u2019ü ihlal ettiğini tespit ettiğimiz içerikleri kaldırma, ilgili hesapları geçici olarak askıya alma veya kalıcı olarak kapatma hakkımızı saklı tutarız.',
      ],
    },
    {
      h: '7. Premium ve Satın Almalar',
      p: [
        'Premium abonelikler ve tek seferlik satın almalar Google Play üzerinden işlenir ve Google Play\u2019in kendi ödeme/iade koşullarına tabidir.',
      ],
    },
    {
      h: '8. Sorumluluğun Sınırlandırılması',
      p: [
        `${COMPANY_NAME}, kullanıcılar arasındaki etkileşimlerden veya Kullanıcı İçeriğinden kaynaklanan zararlardan, yürürlükteki mevzuatın izin verdiği azami ölçüde sorumlu tutulamaz.`,
      ],
    },
    {
      h: '9. Değişiklikler',
      p: ['Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişikliklerde uygulama içinden bilgilendiririz.'],
    },
    {
      h: '10. İletişim',
      p: ['Sorularınız için aşağıdaki adresten bize ulaşabilirsiniz.'],
    },
  ],
  en: [
    {
      h: '1. Acceptance',
      p: [`By using the Lunosfer app (${COMPANY_NAME}), you agree to these Terms of Service. If you do not agree, do not use the app.`],
    },
    {
      h: '2. Account Responsibility',
      p: ['You are responsible for the security of your account and password. You must not use Lunosfer if you are under 13.'],
    },
    {
      h: '3. User Content',
      p: [
        'You are responsible for everything you post (\u201cUser Content\u201d), including dreams, vision/goal boards, diary entries, comments and messages. You grant us a worldwide, non-exclusive license to host and display your content on Lunosfer.',
      ],
    },
    {
      h: '4. Prohibited Conduct',
      p: ['The following are strictly prohibited on Lunosfer:'],
      ul: [
        'Hate speech: content that attacks or demeans people based on race, ethnicity, religion, gender, sexual orientation, disability, or similar characteristics',
        'Obscene or sexual content, and any content involving or targeting minors',
        'Harassment, bullying, threats, stalking, or sustained abusive behavior directed at another person',
        'Content that incites violence, self-harm, or suicide',
        'Spam, fraud, impersonation, or spreading misleading information',
        'Content that promotes or facilitates illegal activity',
        'Content that infringes others\u2019 intellectual property rights',
      ],
    },
    {
      h: '5. Reporting and Blocking',
      p: [
        'If you encounter inappropriate content or a user, use the \u201cReport\u201d option on the relevant content or profile to notify us, or \u201cBlock\u201d to stop all interaction with that user. Reports are reviewed by our team.',
      ],
    },
    {
      h: '6. Enforcement',
      p: [
        'We reserve the right to remove content, and to suspend or permanently terminate accounts, that we determine violate these Terms, in particular Section 4.',
      ],
    },
    {
      h: '7. Premium and Purchases',
      p: ['Premium subscriptions and one-time purchases are processed through Google Play and are subject to Google Play\u2019s own payment and refund terms.'],
    },
    {
      h: '8. Limitation of Liability',
      p: [`${COMPANY_NAME} is not liable, to the maximum extent permitted by law, for damages arising from interactions between users or from User Content.`],
    },
    { h: '9. Changes', p: ['We may update these Terms from time to time; material changes will be announced in-app.'] },
    { h: '10. Contact', p: ['For questions, reach us at the address below.'] },
  ],
}

export default function TermsOfServicePage() {
  const [lang, setLang] = useState('tr')
  useEffect(() => {
    const browserLang = (navigator.language || 'tr').slice(0, 2)
    setLang(browserLang === 'tr' ? 'tr' : 'en')
  }, [])

  const sections = SECTIONS[lang]
  const title = lang === 'tr' ? 'Lunosfer Kullanım Koşulları' : 'Lunosfer Terms of Service'
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
