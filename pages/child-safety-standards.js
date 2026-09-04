// pages/child-safety-standards.js
//
// Google Play Console > Policy > App content > Child Safety Standards
// alanına gireceğin "Standards URL":
// https://www.lunosfer.com/child-safety-standards
//
// Bu sayfa Google'ın Child Safety Standards politikası gereği İngilizce
// ve dil seçici OLMADAN, sabit/public/tek URL olarak tutuluyor
// (bkz. support.google.com/googleplay/android-developer/answer/14747720).
// PDF DEĞİL, canlı HTML sayfa olmalı — bu yüzden diğer legal sayfalardan
// (privacy.js, terms.js) farklı olarak dil toggle'ı yok, sabit EN.

import Seo from '@/components/Seo'

const COMPANY_NAME = 'Lunosfer'
const CONTACT_EMAIL = 'support@lunosfer.com'
const LAST_UPDATED = 'September 4, 2026'

export default function ChildSafetyStandardsPage() {
  const title = 'Lunosfer Child Safety Standards'

  return (
    <div className="min-h-screen bg-void-950 text-white px-4 py-16">
      <Seo
        title={title}
        lang="en"
        path="/child-safety-standards"
        description="Lunosfer's published standards for preventing child sexual abuse and exploitation (CSAE), in line with Google Play's Child Safety Standards policy."
      />

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-astral-gold mb-1">{title}</h1>
        <p className="text-xs text-white/40 mb-8">Last updated: {LAST_UPDATED}</p>

        <div className="mb-8 border-t border-white/10 pt-6">
          <h2 className="text-astral-gold font-semibold mb-2">1. Our Commitment</h2>
          <p className="text-sm text-white/70 mb-2">
            {COMPANY_NAME} has zero tolerance for child sexual abuse and exploitation (CSAE)
            of any kind. This applies to every part of Lunosfer, including dream entries,
            vision boards, comments, direct messages, profile content, and any other
            user-generated content. This policy applies globally to all users, regardless of
            location.
          </p>
          <p className="text-sm text-white/70">
            We do not permit content or behavior that sexualizes, endangers, or exploits
            minors, including but not limited to child sexual abuse material (CSAM),
            grooming, sextortion, trafficking, or the sexualization of minors in any form —
            real, illustrated, or AI-generated.
          </p>
        </div>

        <div className="mb-8 border-t border-white/10 pt-6">
          <h2 className="text-astral-gold font-semibold mb-2">2. Age Requirements</h2>
          <p className="text-sm text-white/70">
            Lunosfer is not directed at children. Users must be at least 13 years old to
            create an account, and users between 13 and 18 should have parental awareness
            where required by local law. We do not knowingly allow children under 13 to use
            the service, and accounts identified as belonging to a child under 13 are
            removed.
          </p>
        </div>

        <div className="mb-8 border-t border-white/10 pt-6">
          <h2 className="text-astral-gold font-semibold mb-2">3. Prevention Measures</h2>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-2">
            <li>Age requirement enforced at sign-up.</li>
            <li>In-app blocking and reporting tools available on every user, dream, and vision.</li>
            <li>Human review of reports submitted through the in-app reporting system.</li>
            <li>Removal of violating content and termination of accounts that violate this policy.</li>
            <li>Reporting to the National Center for Missing &amp; Exploited Children (NCMEC) and/or
              other relevant law enforcement and regional authorities, as legally required, when
              CSAE or CSAM is identified.</li>
            <li>Cooperation with law enforcement investigations into CSAE, including lawful
              preservation and disclosure of relevant account information upon valid legal
              request.</li>
          </ul>
        </div>

        <div className="mb-8 border-t border-white/10 pt-6">
          <h2 className="text-astral-gold font-semibold mb-2">4. In-App Reporting</h2>
          <p className="text-sm text-white/70 mb-2">
            Any user can report a profile, dream, vision, comment, or message directly from
            within the Lunosfer app using the built-in "Report" option. Reports are reviewed
            by our team, and content or accounts found to violate this policy are removed.
          </p>
          <p className="text-sm text-white/70">
            If you encounter content that appears to depict or facilitate child sexual abuse
            or exploitation, please use the in-app report feature or contact us immediately
            using the details in section 6 below. Do not describe, download, or forward such
            content — report it directly.
          </p>
        </div>

        <div className="mb-8 border-t border-white/10 pt-6">
          <h2 className="text-astral-gold font-semibold mb-2">5. Legal Compliance</h2>
          <p className="text-sm text-white/70">
            {COMPANY_NAME} complies with applicable child safety laws and reports violations
            of CSAE laws to the appropriate regional and national authorities, including
            NCMEC's CyberTipline (for reports involving US users or hosting) and equivalent
            authorities elsewhere, in accordance with applicable law.
          </p>
        </div>

        <div className="mb-8 border-t border-white/10 pt-6">
          <h2 className="text-astral-gold font-semibold mb-2">6. Designated Point of Contact</h2>
          <p className="text-sm text-white/70">
            Our designated point of contact is available and knowledgeable about our CSAM
            prevention practices and compliance with this policy.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-void-900 px-4 py-4">
          <p className="font-semibold text-sm mb-1">Contact</p>
          <p className="text-sm text-white/70">{CONTACT_EMAIL}</p>
        </div>
      </div>
    </div>
  )
}
