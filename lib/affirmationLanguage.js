// Manifestasyon psikolojisinde temel ilke: olumlamalar şimdiki zamanda
// kurulduğunda beyin bunu "zaten gerçek" olarak işliyor, gelecek zaman ise
// "henüz gerçek değil" sinyali veriyor. Kullanıcı başlığını gelecek zamanda
// yazdığında (ör. "...olacağım") bunu YENİDEN YAZMAYA çalışmıyoruz — Türkçe
// çekim karmaşık olduğu için otomatik dönüşüm yanlış/bozuk cümleler
// üretebilir. Onun yerine sadece tespit edip örneklerle ilkeyi gösteriyoruz.

const FUTURE_MARKERS_TR = [
  /aca[gğ][iı]m\b/i, /ece[gğ]im\b/i, /acak[tıi]?m?\b/i, /ecek[tiy]?m?\b/i,
]
const FUTURE_MARKERS_EN = [
  /\bwill\s+be\b/i, /\bwill\s+have\b/i, /\bgoing to\s+be\b/i, /\bi'?ll\s+/i,
]

export function hasFutureTenseLanguage(text = '', lang = 'tr') {
  const markers = lang === 'tr' ? FUTURE_MARKERS_TR : FUTURE_MARKERS_EN
  return markers.some((re) => re.test(text || ''))
}

export const affirmationExamples = {
  tr: [
    { future: 'Zengin olacağım', present: 'Bolluk içinde yaşıyorum' },
    { future: 'Kilo vereceğim', present: 'İdeal kilomdayım' },
    { future: 'Başarılı olacağım', present: 'Başarıyı yaşıyorum' },
  ],
  en: [
    { future: 'I will be rich', present: 'I live in abundance' },
    { future: 'I will lose weight', present: 'I am at my ideal weight' },
    { future: 'I will be successful', present: 'I am successful' },
  ],
}
