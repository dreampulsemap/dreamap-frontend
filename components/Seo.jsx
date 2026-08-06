import Head from 'next/head'
import { useRouter } from 'next/router'

// Merkezi SEO bileşeni.
//
// Önceki durum: pages/globe.js dışında HİÇBİR sayfada <Head> yoktu; globe.js
// da yalnızca title + description yazıyordu (canonical/OG/Twitter/robots/
// JSON-LD hiçbirinde yoktu). Sonuç: Google, WhatsApp/Twitter/Discord link
// önizlemeleri ve tarayıcı sekme başlığı her sayfada aynı boş varsayılana
// düşüyordu — bu da orijinal SEO analizindeki "meta etiketleri optimize
// edilmemiş" tespitinin doğrudan karşılığı.
//
// Artık her sayfa bu bileşeni import edip kendi title/description/noindex/
// jsonLd değerini geçiyor; canonical URL, Open Graph, Twitter Card ve robots
// meta burada tek yerden, tutarlı biçimde üretiliyor.
export const SITE_NAME = 'Lunosfer'
export const SITE_URL = 'https://lunosfer.com'

const DEFAULT_TITLE = 'Lunosfer — Rüya Nabız Ağı | AI Destekli Jung Rüya Analizi'
const DEFAULT_DESCRIPTION =
  'Lunosfer; rüyalarını Jung arketipleri ve yapay zekâ ile analiz eden, rüya sinyallerini canlı bir bilinçaltı ağına dönüştüren platform. Rüyanı paylaş, arketipini keşfet, küresel rüya haritasına bağlan.'
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`

// Proje next-i18next değil, react-i18next + kendi lib/translations.js'ini
// kullanıyor — bu yüzden og:locale eşlemesi burada elle tutuluyor.
const OG_LOCALE = { tr: 'tr_TR', en: 'en_US' }

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = 'website',
  lang = 'tr',
  jsonLd = null,
  path, // verilmezse mevcut router yolu kullanılır
}) {
  const router = useRouter()
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
  const canonicalPath = (path ?? router.asPath ?? '/').split('?')[0].split('#')[0]
  const canonicalUrl = `${SITE_URL}${canonicalPath === '/' ? '' : canonicalPath}`
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow'
  const locale = OG_LOCALE[lang] || OG_LOCALE.tr
  const jsonLdList = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : []

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLdList.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify burada kullanıcıdan gelen serbest metin değil,
          // sayfaların kendi ürettiği sabit şema nesnelerini basıyor.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  )
}
