export const psycheMapTranslations = {
  en: {
    title: 'Psyche Map',
    subtitle: 'The archetypal patterns that recur across your dreams',
    lockedTitle: 'Your map is still forming',
    lockedBody: (remaining) => `Analyze ${remaining} more dream${remaining === 1 ? '' : 's'} and your recurring patterns will start to appear here.`,
    dreamsAnalyzed: (n) => `Based on ${n} analyzed dream${n === 1 ? '' : 's'}`,
    individuationNote: 'From your most recent deep analysis',
    empty: 'No archetypes detected yet.',
  },
  tr: {
    title: 'Psyche Haritası',
    subtitle: 'Rüyalarında tekrar eden arketipsel örüntüler',
    lockedTitle: 'Haritan henüz oluşuyor',
    lockedBody: (remaining) => `${remaining} rüya daha analiz et, tekrar eden örüntülerin burada belirmeye başlasın.`,
    dreamsAnalyzed: (n) => `${n} analiz edilmiş rüyaya dayanıyor`,
    individuationNote: 'En son derin analizinden',
    empty: 'Henüz tespit edilmiş bir arketip yok.',
  },
}

export function getPsycheMapText(lang = 'en') {
  const normalized = String(lang).toLowerCase().split('-')[0]
  return psycheMapTranslations[normalized] || psycheMapTranslations.en
}
