import Link from 'next/link'
import Seo, { SITE_NAME, SITE_URL } from '@/components/Seo'
import DreamDraftBox from '@/components/DreamDraftBox'

// /ruya-tabirleri/[slug] ve /dream-meanings/[slug] için ortak rehber şablonu.
// İki sayfa da eskiden aynı JSX'in kopyasıydı; SSS, dil bağlantısı ve rüya
// yazma kutusu eklenirken tek yere toplandı.

const UI = {
  tr: {
    base: '/ruya-tabirleri',
    crumb: 'Rüya Tabirleri',
    faq: 'Sık sorulan sorular',
    related: 'İlgili rehberler',
    other: 'Read in English',
    disclaimer:
      'Bu yazı genel bilgi amaçlıdır; rüya sembollerinin anlamı kişisel bağlama göre değişir. Lunosfer analizleri psikolojik tanı veya tedavi değildir.',
    keywords: ['rüya tabiri', 'jung rüya analizi', 'Lunosfer'],
  },
  en: {
    base: '/dream-meanings',
    crumb: 'Dream Meanings',
    faq: 'Frequently asked questions',
    related: 'Related guides',
    other: 'Türkçe oku',
    disclaimer:
      'This article is for general information; the meaning of dream symbols depends on personal context. Lunosfer analyses are not a psychological diagnosis or treatment.',
    keywords: ['dream meaning', 'jungian dream analysis', 'Lunosfer'],
  },
}

export default function GuideArticle({ lang, guide, related, pair, updated }) {
  const ui = UI[lang]
  const url = `${SITE_URL}${ui.base}/${guide.slug}`
  const otherLang = lang === 'tr' ? 'en' : 'tr'
  const otherPath = pair ? `${UI[otherLang].base}/${pair.slug}` : null
  const faq = guide.faq || []

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      keywords: guide.keywords.join(', '),
      inLanguage: lang,
      dateModified: updated,
      mainEntityOfPage: url,
      image: `${SITE_URL}/logo.png`,
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: ui.crumb, item: `${SITE_URL}${ui.base}` },
        { '@type': 'ListItem', position: 3, name: guide.title, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.length
        ? faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
        : [
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
      <Seo
        title={guide.title}
        description={guide.description}
        type="article"
        lang={lang}
        keywords={[...guide.keywords, ...ui.keywords]}
        jsonLd={jsonLd}
        alternates={otherPath ? [{ hrefLang: otherLang, path: otherPath }] : null}
        xDefaultPath={otherPath ? (lang === 'en' ? `${ui.base}/${guide.slug}` : otherPath) : undefined}
      />
      <article className="max-w-2xl mx-auto">
        <nav className="flex items-center justify-between gap-3 text-xs text-white/40 mb-6">
          <span>
            <Link href="/" className="hover:text-white/70">Lunosfer</Link>
            {' / '}
            <Link href={ui.base} className="hover:text-white/70">{ui.crumb}</Link>
          </span>
          {otherPath && (
            <Link href={otherPath} hrefLang={otherLang} lang={otherLang} className="shrink-0 hover:text-white/70">
              {ui.other} →
            </Link>
          )}
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

        {faq.length > 0 && (
          <section className="mb-8 border-t border-white/10 pt-6">
            <h2 className="text-astral-gold font-semibold text-lg mb-3">{ui.faq}</h2>
            {faq.map((f) => (
              <div key={f.q} className="mb-5">
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.q}</h3>
                <p className="text-sm leading-relaxed text-white/75">{f.a}</p>
              </div>
            ))}
          </section>
        )}

        <p className="text-xs text-white/40 border-t border-white/10 pt-6">{ui.disclaimer}</p>

        <DreamDraftBox lang={lang} source={guide.slug} />

        {related.length > 0 && (
          <div className="mt-12">
            <h2 className="font-semibold text-white mb-4">{ui.related}</h2>
            <ul className="space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`${ui.base}/${r.slug}`} className="text-sm text-astral-gold hover:underline">
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
