import Link from 'next/link'
import Seo, { SITE_NAME, SITE_URL } from '@/components/Seo'
import { DREAM_GUIDES_EN as DREAM_GUIDES, GUIDES_EN_UPDATED as GUIDES_UPDATED, getGuideEn as getGuide } from '@/lib/dreamGuidesEn'
import AnalyzeCta from '@/components/AnalyzeCta'

// English dream guide (static, like /ruya-tabirleri/[slug]). English
// Instagram posts link here.
export default function DreamGuideEnPage({ guide, related }) {
  const url = `${SITE_URL}/dream-meanings/${guide.slug}`
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      keywords: guide.keywords.join(', '),
      inLanguage: 'en',
      dateModified: GUIDES_UPDATED,
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Dream Meanings', item: `${SITE_URL}/dream-meanings` },
        { '@type': 'ListItem', position: 3, name: guide.title, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: guide.title.split('?')[0] + '?',
          acceptedAnswer: { '@type': 'Answer', text: (guide.sections[0].p || []).join(' ') },
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-void-950 text-white px-4 py-16">
      <Seo title={guide.title} description={guide.description} type="article" lang="en" keywords={[...guide.keywords, 'dream meaning', 'jungian dream analysis', 'Lunosfer']} jsonLd={jsonLd} />
      <article className="max-w-2xl mx-auto">
        <nav className="text-xs text-white/40 mb-6">
          <Link href="/" className="hover:text-white/70">Lunosfer</Link>
          {' / '}
          <Link href="/dream-meanings" className="hover:text-white/70">Dream Meanings</Link>
        </nav>

        <div className="text-4xl mb-3" aria-hidden>{guide.symbol}</div>
        <h1 className="font-serif text-3xl font-bold text-astral-gold mb-4">{guide.title}</h1>
        <p className="text-base text-white/80 mb-8">{guide.description}</p>

        {guide.sections.map((s) => (
          <section key={s.h} className="mb-8 border-t border-white/10 pt-6">
            <h2 className="text-astral-gold font-semibold text-lg mb-3">{s.h}</h2>
            {s.p?.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-white/75 mb-3">{line}</p>
            ))}
            {s.ul && (
              <ul className="list-disc pl-5 text-sm leading-relaxed text-white/75 space-y-1.5">
                {s.ul.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        <p className="text-xs text-white/40 border-t border-white/10 pt-6">
          This article is for general information; the meaning of dream symbols depends on personal context.
          Lunosfer analyses are not a psychological diagnosis or treatment.
        </p>

        <AnalyzeCta lang="en" />

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-semibold text-white mb-4">Related guides</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/dream-meanings/${r.slug}`} className="text-sm text-astral-gold hover:underline">
                    {r.symbol} {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  )
}

export function getStaticPaths() {
  return { paths: DREAM_GUIDES.map((g) => ({ params: { slug: g.slug } })), fallback: false }
}

export function getStaticProps({ params }) {
  const guide = getGuide(params.slug)
  const related = (guide.related || [])
    .map(getGuide)
    .filter(Boolean)
    .map(({ slug, title, symbol }) => ({ slug, title, symbol }))
  return { props: { guide, related } }
}
