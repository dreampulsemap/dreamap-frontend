import Link from 'next/link'
import Seo, { SITE_URL } from '@/components/Seo'
import { DREAM_GUIDES } from '@/lib/dreamGuides'
import { cardOf } from '@/lib/guideUtils'
import DreamDraftBox from '@/components/DreamDraftBox'

// Rüya rehberleri liste sayfası — Google'ın tüm rehberleri tek yerden
// keşfetmesini ve aralarında iç bağlantı kurulmasını sağlar.
export default function DreamGuidesIndex({ guides }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Rüya Tabirleri ve Jung Rüya Rehberleri',
    url: `${SITE_URL}/ruya-tabirleri`,
    hasPart: guides.map((g) => ({
      '@type': 'Article',
      headline: g.title,
      url: `${SITE_URL}/ruya-tabirleri/${g.slug}`,
    })),
  }

  return (
    <div className="min-h-screen bg-void-950 text-white px-4 py-16">
      <Seo
        title="Rüya Tabirleri — Jung Psikolojisine Göre Rüya Rehberleri"
        description="Rüyada yılan görmek, düşmek, kovalanmak, ölüm ve daha fazlası. Rüya sembollerinin Jung psikolojisine göre yorumları ve ücretsiz yapay zekâ rüya analizi."
        keywords={['rüya tabirleri', 'rüya tabiri', 'rüya yorumu', 'rüyada görmek ne demek', 'jung rüya analizi', ...guides.map((g) => g.keyword)]}
        jsonLd={jsonLd}
        alternates={[{ hrefLang: 'en', path: '/dream-meanings' }]}
        xDefaultPath="/dream-meanings"
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-astral-gold mb-3">Rüya Tabirleri ve Rehberler</h1>
        <p className="text-sm text-white/70 mb-8">
          Rüya sembollerini kehanet olarak değil, Carl Jung’un psikolojik yaklaşımıyla ele alan rehberler.
          Her sembolün anlamı kişisel bağlamına göre değişir — kendi rüyanı yazıp kişisel analizini alabilirsin.
        </p>

        <p className="-mt-5 mb-8 text-xs">
          <Link href="/dream-meanings" hrefLang="en" className="text-white/50 hover:text-white">English dream meanings →</Link>
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((g) => (
            <Link
              key={g.slug}
              href={`/ruya-tabirleri/${g.slug}`}
              className="glass-card block rounded-2xl border border-white/10 p-5 transition-colors hover:border-astral-gold/40"
            >
              <div className="text-2xl mb-2" aria-hidden>{g.symbol}</div>
              <h2 className="font-semibold text-white mb-1">{g.title}</h2>
              <p className="text-xs text-white/60 line-clamp-3">{g.description}</p>
            </Link>
          ))}
        </div>

        <DreamDraftBox lang="tr" source="index_tr" />
      </div>
    </div>
  )
}

export function getStaticProps() {
  // Kartlar için yalnızca başlık/açıklama/sembol; tam metin istemci paketine girmiyor.
  const guides = DREAM_GUIDES.map((g) => ({ ...cardOf(g), keyword: g.keywords[0] }))
  return { props: { guides } }
}
