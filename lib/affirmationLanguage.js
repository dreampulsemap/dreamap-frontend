// Manifestasyon psikolojisinde temel ilke: olumlamalar şimdiki zamanda
// kurulduğunda beyin bunu "zaten gerçek" olarak işliyor, gelecek zaman ise
// "henüz gerçek değil" sinyali veriyor. Kullanıcı başlığını gelecek zamanda
// yazdığında (ör. "...olacağım") bunu YENİDEN YAZMAYA çalışmıyoruz — dillerin
// çekim/yapı karmaşıklığı yüzünden otomatik dönüşüm yanlış/bozuk cümleler
// üretebilir. Onun yerine sadece tespit edip örneklerle ilkeyi gösteriyoruz.
//
// YENİ: 8 dile genişletildi (önceden sadece tr/en vardı). Her dilin gelecek
// zaman kalıbı farklı kuruluyor, bu yüzden regex'ler dilbilgisel olarak
// birebir karşılık değil — her biri o dildeki EN YAYGIN gelecek zaman
// işaretleyicisini yakalayan kaba bir sezgisel (heuristic). Türkçe/İngilizce
// için olduğu gibi bunlar da kesin bir dilbilgisi denetleyicisi değil, sadece
// bir ipucu tetikleyicisi. Japonca özellikle dikkat gerektiriyor: dilde
// İngilizce/Avrupa dilleri anlamında ayrı bir gelecek zaman çekimi yok
// (geniş/şimdiki zaman bağlamla ayrışıyor), bu yüzden regex sadece niyet/
// olasılık belirten yaygın kalıpları (つもり, だろう, ようと思う) yakalıyor —
// diğer dillere kıyasla daha zayıf bir sezgisel olduğunu unutma.

const FUTURE_MARKERS_TR = [
  /aca[gğ][iı]m\b/i, /ece[gğ]im\b/i, /acak[tıi]?m?\b/i, /ecek[tiy]?m?\b/i,
]
const FUTURE_MARKERS_EN = [
  /\bwill\s+be\b/i, /\bwill\s+have\b/i, /\bgoing to\s+be\b/i, /\bi'?ll\s+/i,
]
const FUTURE_MARKERS_ES = [
  /(?:^|[^\p{L}])voy a(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])seré(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])tendré(?:[^\p{L}]|$)/iu,
  /\p{L}+(aré|eré|iré)(?!\p{L})/iu,
]
const FUTURE_MARKERS_FR = [
  /(?:^|[^\p{L}])je vais(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])serai(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])aurai(?:[^\p{L}]|$)/iu,
  /\p{L}+(erai|irai)(?!\p{L})/iu,
]
const FUTURE_MARKERS_DE = [
  /(?:^|[^\p{L}])ich werde(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])werde\s+\p{L}+/iu,
]
const FUTURE_MARKERS_PT = [
  /(?:^|[^\p{L}])vou\s+\p{L}+/iu,
  /(?:^|[^\p{L}])serei(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])terei(?:[^\p{L}]|$)/iu,
  /\p{L}+(arei|erei|irei)(?!\p{L})/iu,
]
const FUTURE_MARKERS_RU = [
  /(?:^|[^\p{L}])буду(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])будешь(?:[^\p{L}]|$)/iu,
  /(?:^|[^\p{L}])будет(?:[^\p{L}]|$)/iu,
]
const FUTURE_MARKERS_JA = [
  /つもり/, /だろう/, /ようと思/,
]

const FUTURE_MARKERS = {
  tr: FUTURE_MARKERS_TR,
  en: FUTURE_MARKERS_EN,
  es: FUTURE_MARKERS_ES,
  fr: FUTURE_MARKERS_FR,
  de: FUTURE_MARKERS_DE,
  pt: FUTURE_MARKERS_PT,
  ru: FUTURE_MARKERS_RU,
  ja: FUTURE_MARKERS_JA,
}

export function hasFutureTenseLanguage(text = '', lang = 'tr') {
  const base = String(lang || 'tr').toLowerCase().split('-')[0]
  const markers = FUTURE_MARKERS[base] || FUTURE_MARKERS_EN
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
  es: [
    { future: 'Seré rico', present: 'Vivo en abundancia' },
    { future: 'Voy a perder peso', present: 'Estoy en mi peso ideal' },
    { future: 'Seré exitoso', present: 'Vivo el éxito' },
  ],
  fr: [
    { future: 'Je serai riche', present: 'Je vis dans l’abondance' },
    { future: 'Je vais perdre du poids', present: 'Je suis à mon poids idéal' },
    { future: 'Je serai un succès', present: 'Je vis le succès' },
  ],
  de: [
    { future: 'Ich werde reich sein', present: 'Ich lebe im Überfluss' },
    { future: 'Ich werde abnehmen', present: 'Ich bin bei meinem Idealgewicht' },
    { future: 'Ich werde erfolgreich sein', present: 'Ich lebe den Erfolg' },
  ],
  pt: [
    { future: 'Serei rico', present: 'Vivo em abundância' },
    { future: 'Vou perder peso', present: 'Estou no meu peso ideal' },
    { future: 'Serei bem-sucedido', present: 'Vivo o sucesso' },
  ],
  ru: [
    { future: 'Я буду богатым', present: 'Я живу в изобилии' },
    { future: 'Я похудею', present: 'Я в своём идеальном весе' },
    { future: 'Я буду успешным', present: 'Я живу успехом' },
  ],
  ja: [
    { future: '私はお金持ちになるだろう', present: '私は豊かさの中で生きている' },
    { future: '痩せようと思う', present: '理想の体重でいる' },
    { future: '成功するつもりだ', present: '成功を生きている' },
  ],
}
