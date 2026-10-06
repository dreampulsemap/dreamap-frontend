import Link from 'next/link'
import Seo, { SITE_URL } from '@/components/Seo'
import { DREAM_GUIDES_EN as DREAM_GUIDES } from '@/lib/dreamGuidesEn'
import AnalyzeCta from '@/components/AnalyzeCta'

// English dream guide index (mirror of /ruya-tabirleri).
export default function DreamGuidesEnIndex() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Dream Meanings and Jungian Dream Guides',
    url: `${SITE_URL}/dream-meanings`,
    hasPart: DREAM_GUIDES.map((g) => ({
      '@type': 'Article',
      headline: g.title,
      url: `${SITE_URL}/dream-meanings/${g.slug}`,
    })),
  }

  return (
    <div className="min-h-screen bg-void-950 text-white px-4 py-16">
      <Seo
        title="Dream Meanings — Jungian Guides to Common Dream Symbols"
        lang="en"
        description="Snakes, falling, being chased, teeth falling out and more. Jungian interpretations of common dream symbols and a free AI dream analysis."
        keywords={['dream meanings', 'dream interpretation', 'dream dictionary', 'what does my dream mean', 'jungian dream analysis', ...DREAM_GUIDES.map((g) => g.keywords[0])]}
        jsonLd={jsonLd}
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-astral-gold mb-3">Dream Meanings</h1>
        <p className="text-sm text-white/70 mb-8">
          Guides that read dream symbols through Carl Jung’s psychological lens, not as fortune-telling.
          Every symbol depends on your personal context — write down your own dream to get a personal analysis.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {DREAM_GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/dream-meanings/${g.slug}`}
              className="glass-card block rounded-2xl border border-white/10 p-5 transition-colors hover:border-astral-gold/40"
            >
              <div className="text-2xl mb-2" aria-hidden>{g.symbol}</div>
              <h2 className="font-semibold text-white mb-1">{g.title}</h2>
              <p className="text-xs text-white/60 line-clamp-3">{g.description}</p>
            </Link>
          ))}
        </div>

        <AnalyzeCta lang="en" />
      </div>
    </div>
  )
}
