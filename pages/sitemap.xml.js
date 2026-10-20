import { SITE_URL } from '@/components/Seo'
import { DREAM_GUIDES, GUIDES_UPDATED } from '@/lib/dreamGuides'
import { DREAM_GUIDES_EN, GUIDES_EN_UPDATED } from '@/lib/dreamGuidesEn'
import { enPairOf, trPairOf } from '@/lib/guidePairs'

// Site haritası artık veriden üretiliyor (eskiden public/sitemap.xml elle
// tutuluyordu; yeni rehber eklenince unutulma riski vardı). Rehberlerin
// TR/EN karşılıkları xhtml:link ile de bildiriliyor.

const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/explore', changefreq: 'daily', priority: '0.8' },
  { path: '/globe', changefreq: 'weekly', priority: '0.7' },
  { path: '/app', changefreq: 'monthly', priority: '0.6' },
  { path: '/auth', changefreq: 'monthly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
]

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

function urlEntry({ path, lastmod, changefreq, priority, alternates = [] }) {
  const alt = alternates
    .map((a) => `\n    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${esc(SITE_URL + a.path)}" />`)
    .join('')
  return `  <url>
    <loc>${esc(SITE_URL + (path === '/' ? '' : path))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alt}
  </url>`
}

function buildSitemap() {
  const entries = STATIC_PAGES.map(urlEntry)

  const indexAlts = [
    { lang: 'tr', path: '/ruya-tabirleri' },
    { lang: 'en', path: '/dream-meanings' },
    { lang: 'x-default', path: '/dream-meanings' },
  ]
  entries.push(urlEntry({ path: '/ruya-tabirleri', lastmod: GUIDES_UPDATED, changefreq: 'weekly', priority: '0.8', alternates: indexAlts }))
  entries.push(urlEntry({ path: '/dream-meanings', lastmod: GUIDES_EN_UPDATED, changefreq: 'weekly', priority: '0.8', alternates: indexAlts }))

  for (const g of DREAM_GUIDES) {
    const path = `/ruya-tabirleri/${g.slug}`
    const en = enPairOf(g.slug)
    const alternates = en
      ? [{ lang: 'tr', path }, { lang: 'en', path: `/dream-meanings/${en}` }, { lang: 'x-default', path: `/dream-meanings/${en}` }]
      : []
    entries.push(urlEntry({ path, lastmod: GUIDES_UPDATED, changefreq: 'monthly', priority: '0.7', alternates }))
  }
  for (const g of DREAM_GUIDES_EN) {
    const path = `/dream-meanings/${g.slug}`
    const tr = trPairOf(g.slug)
    const alternates = tr
      ? [{ lang: 'en', path }, { lang: 'tr', path: `/ruya-tabirleri/${tr}` }, { lang: 'x-default', path }]
      : []
    entries.push(urlEntry({ path, lastmod: GUIDES_EN_UPDATED, changefreq: 'monthly', priority: '0.7', alternates }))
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  res.write(buildSitemap())
  res.end()
  return { props: {} }
}

export default function Sitemap() {
  return null
}
