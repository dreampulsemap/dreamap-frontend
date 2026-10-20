import GuideArticle from '@/components/GuideArticle'
import { DREAM_GUIDES_EN, GUIDES_EN_UPDATED, getGuideEn } from '@/lib/dreamGuidesEn'
import { trPairOf, titleOf } from '@/lib/guidePairs'

// English dream guide (static, like /ruya-tabirleri/[slug]). English
// Instagram/TikTok posts link here. Template: components/GuideArticle.jsx.
export default function DreamGuideEnPage({ guide, related, pair }) {
  return <GuideArticle lang="en" guide={guide} related={related} pair={pair} updated={GUIDES_EN_UPDATED} />
}

export function getStaticPaths() {
  return { paths: DREAM_GUIDES_EN.map((g) => ({ params: { slug: g.slug } })), fallback: false }
}

export function getStaticProps({ params }) {
  const guide = getGuideEn(params.slug)
  const related = (guide.related || [])
    .map(getGuideEn)
    .filter(Boolean)
    .map(({ slug, title, symbol }) => ({ slug, title, symbol }))
  const tr = trPairOf(guide.slug)
  return { props: { guide, related, pair: tr ? { slug: tr, title: titleOf('tr', tr) } : null } }
}
