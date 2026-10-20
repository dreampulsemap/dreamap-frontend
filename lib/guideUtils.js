// Rehber verisini sayfaya hazırlayan ortak yardımcılar.

const QUESTION_HEADINGS = ['Kendine sorabileceğin sorular', 'Questions to ask yourself']

// guideExtras*.js dosyalarındaki ek bölümleri (extra) ve SSS'yi (faq) rehbere
// ekler. Ek bölümler "Kendine sorabileceğin sorular"dan ÖNCE girer, böylece
// sayfa her zaman sorularla biter; soru bölümü hiç yoksa sona eklenir.
export function mergeExtras(guides, extras) {
  return guides.map((g) => {
    const x = extras[g.slug]
    if (!x) return { ...g, faq: g.faq || [] }
    const extra = x.extra || []
    const qIdx = g.sections.findIndex((s) => QUESTION_HEADINGS.includes(s.h))
    const extraHasQ = extra.some((s) => QUESTION_HEADINGS.includes(s.h))
    const sections =
      qIdx >= 0 && !extraHasQ
        ? [...g.sections.slice(0, qIdx), ...extra, ...g.sections.slice(qIdx)]
        : [...g.sections, ...extra]
    return { ...g, sections, faq: g.faq || x.faq || [] }
  })
}

// Liste sayfalarına yalnızca kart için gereken alanlar gider (tüm metin
// istemci paketine girmesin).
export function cardOf(g) {
  return { slug: g.slug, title: g.title, description: g.description, symbol: g.symbol }
}
