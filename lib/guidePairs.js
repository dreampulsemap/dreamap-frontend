// Türkçe ↔ İngilizce rehber eşleşmeleri (hreflang ve "Read in English"
// bağlantısı için). Yalnızca getStaticProps / sitemap gibi sunucu tarafında
// kullan: iki veri setini birden içe aktarıyor.
import { DREAM_GUIDES } from './dreamGuides'
import { DREAM_GUIDES_EN } from './dreamGuidesEn'

// Birden fazla İngilizce sayfa aynı Türkçe sayfayı gösteriyorsa hangisinin
// karşılık sayılacağı (being-late ve exam ikisi de ruyada-sinava-girmek'e bağlı).
const PREFER = { 'ruyada-sinava-girmek': 'exam-dream-meaning' }

const TR_TO_EN = {}
for (const g of DREAM_GUIDES) if (g.en) TR_TO_EN[g.slug] = g.en
for (const g of DREAM_GUIDES_EN) if (g.tr && !TR_TO_EN[g.tr]) TR_TO_EN[g.tr] = g.slug
Object.assign(TR_TO_EN, PREFER)

const EN_SET = new Set(DREAM_GUIDES_EN.map((g) => g.slug))
const TR_SET = new Set(DREAM_GUIDES.map((g) => g.slug))

// hreflang yalnızca karşılıklıysa geçerli sayılıyor; tek yönlü eşleşme verilmez.
export function enPairOf(trSlug) {
  const en = TR_TO_EN[trSlug]
  return en && EN_SET.has(en) ? en : null
}

export function trPairOf(enSlug) {
  const g = DREAM_GUIDES_EN.find((x) => x.slug === enSlug)
  const tr = g?.tr
  return tr && TR_SET.has(tr) && TR_TO_EN[tr] === enSlug ? tr : null
}

export function titleOf(lang, slug) {
  const list = lang === 'en' ? DREAM_GUIDES_EN : DREAM_GUIDES
  return list.find((g) => g.slug === slug)?.title || null
}
