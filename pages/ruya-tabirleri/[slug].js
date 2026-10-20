import GuideArticle from '@/components/GuideArticle'
import { DREAM_GUIDES, GUIDES_UPDATED, getGuide } from '@/lib/dreamGuides'
import { enPairOf, titleOf } from '@/lib/guidePairs'

// Tek bir rüya rehberi. getStaticProps/Paths ile build sırasında HTML'e
// basılır — içerik Google'a JS'siz, ilk yanıtta ulaşır. Şablon:
// components/GuideArticle.jsx (İngilizce sayfayla ortak).
export default function DreamGuidePage({ guide, related, pair }) {
  return <GuideArticle lang="tr" guide={guide} related={related} pair={pair} updated={GUIDES_UPDATED} />
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
  const en = enPairOf(guide.slug)
  return { props: { guide, related, pair: en ? { slug: en, title: titleOf('en', en) } : null } }
}
