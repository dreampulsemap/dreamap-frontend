// Ucretsiz ruya analizi (pages/api/analyze-dream.js) icin kucuk ruya kitabi.
//
// Ruya metninde bir sembolun anahtar kelimesi geciyorsa, o sembolun kisa
// Freud + Jung notu modele "referans" olarak eklenir. Notlar KESIN anlam
// degil: model bunlari ruyanin kendi ayrintilariyla birlikte kullanir.
// Eslesme yoksa hicbir sey eklenmez (ek token yok).
//
// keywords: kucuk harf, Turkce ekleri yakalamak icin kok halinde
// ("yılan" -> yılanı, yılanlar...). guide: /ruya-tabirleri sayfasi varsa slug.

export const DREAM_SYMBOLS = [
  { id: 'snake', keywords: ['yılan', 'snake', 'serpent'], guide: 'ruyada-yilan-gormek',
    note: 'Freud: often a charged image for instinct and desire, or a hidden threat. Jung: transformation (shedding skin), instinctive energy, the shadow; can be both danger and healing.' },
  { id: 'falling', keywords: ['düştüm', 'düştü', 'düşüyor', 'düşerken', 'düşmek', 'falling', ' fell '], guide: 'ruyada-dusmek',
    note: 'Freud: anxiety, loss of footing, sometimes a "fall" in moral or social standing. Jung: compensation for being too high (over-confident, over-controlled); a call back to the ground.' },
  { id: 'chased', keywords: ['koval', 'peşimde', 'kaçıyor', 'kaçtım', 'chased', 'chasing', 'running away'], guide: 'ruyada-kovalanmak',
    note: 'Freud: an avoided wish or feeling returning. Jung: the shadow pursuing to be recognised; ask what the pursuer wants rather than how to escape.' },
  { id: 'death', keywords: ['öldü', 'ölüm', 'ölmüş', 'cenaze', 'mezar', 'death', 'died', 'funeral', 'grave'], guide: 'ruyada-olum-gormek',
    note: 'Rarely about real death. Freud: ambivalent feelings toward the person, or grief. Jung: an ending and rebirth, the old self or a life phase closing.' },
  { id: 'ex', keywords: ['eski sevgili', 'eski erkek arkadaş', 'eski kız arkadaş', 'ex-boyfriend', 'ex-girlfriend', 'my ex'], guide: 'ruyada-eski-sevgiliyi-gormek',
    note: 'Freud: unfinished wishes and day residue from that period. Jung: anima/animus projection; qualities once seen in them that now belong to the dreamer.' },
  { id: 'teeth', keywords: ['diş', 'dişlerim', 'teeth', 'tooth'], guide: 'ruyada-dis-dokulmesi',
    note: 'Freud: anxiety about loss, appearance, sometimes ageing. Jung: loss of power or of a way of expressing oneself; a transition (like losing milk teeth).' },
  { id: 'water', keywords: ['deniz', 'su ', 'suya', 'suyun', 'göl ', 'gölde', 'gölün', 'nehir', 'sel ', 'selde', 'dalga', 'boğul', 'sea', 'water', 'ocean', 'flood', 'wave', 'drown'], guide: 'ruyada-su-gormek',
    note: 'Jung: the unconscious and emotion; its state mirrors the emotional state (calm, stormy, flooding). Drowning: being overwhelmed. Freud: birth, origins, being engulfed by a feeling.' },
  { id: 'flying', keywords: ['uçuyor', 'uçtum', 'uçmak', 'havada', 'flying', 'flew', 'float'], guide: 'ruyada-ucmak',
    note: 'Freud: pleasure, freedom, sometimes a sensual wish. Jung: rising above a situation; if too high, compensation for losing touch with the ground.' },
  { id: 'baby', keywords: ['bebek', 'hamile', 'doğum', 'baby', 'pregnant', 'birth'], guide: 'ruyada-bebek-gormek',
    note: 'Jung: the divine child, a new beginning, an idea or part of the self being born. Freud: wish for care, new life, or responsibility anxiety.' },
  { id: 'dog', keywords: ['köpek', 'it ', 'dog', 'puppy'], guide: 'ruyada-kopek-gormek',
    note: 'Loyalty, protection, instinct. Friendly dog: trusted bond. Attacking dog: uncontrolled anger or threat; Jung: instinctive side not yet integrated.' },
  { id: 'cat', keywords: ['kedi', 'cat', 'kitten'], guide: 'ruyada-kedi-gormek',
    note: 'Intuition, independence, feminine energy (Jung: anima). Scratching cat: a neglected feeling or tension. Caring for a small cat: protecting something vulnerable in oneself.' },
  { id: 'house', keywords: ['ev ', 'evim', 'evde', 'evin', 'oda ', 'odada', 'odaya', 'bodrum', 'çatı', 'house', 'room', 'basement', 'attic'], guide: 'ruyada-ev-gormek',
    note: 'Jung: the house as the self; upper floors conscious mind, basement deeper layers. New room: undiscovered potential. Childhood home: old patterns.' },
  { id: 'exam', keywords: ['sınav', 'tus ', 'tus\'', 'yks', 'okul', 'exam', 'school'], guide: 'ruyada-sinava-girmek',
    note: 'Freud: dreams of failing an exam already passed can reassure ("you managed before"). Both: performance anxiety, fear of being judged.' },
  { id: 'late', keywords: ['geç kal', 'kaçırdım', 'yetişemedim', 'late', 'missed the'], guide: null,
    note: 'Time pressure, fear of missing a chance, too many demands. Jung: a part of life being neglected while chasing another.' },
  { id: 'naked', keywords: ['çıplak', 'naked', 'nude'], guide: null,
    note: 'Jung: the persona not fitting; fear of being seen as one is. Freud: exhibition wish mixed with shame; often nobody else notices.' },
  { id: 'car', keywords: ['araba', 'arabam', 'direksiyon', 'car', 'driving'], guide: null,
    note: 'How one moves through life and who is in control. Lost or stolen car: lost direction or autonomy. Someone else driving: control handed over.' },
  { id: 'lost', keywords: ['kayboldu', 'kaybettim', 'bulamadım', 'lost', "couldn't find"], guide: null,
    note: 'Fear of losing control, identity or something valued; Jung: what is lost may point to what needs attention.' },
  { id: 'money', keywords: ['para ', 'parayı', 'param', 'paralar', 'parası', 'cüzdan', 'altın', 'hesap', 'money', 'wallet', 'gold'], guide: null,
    note: 'Self-worth, energy and what one values. Freud: what is given or withheld. Finding money: hidden resources; losing it: fear of depletion.' },
  { id: 'wedding', keywords: ['düğün', 'evlen', 'gelinlik', 'nikah', 'wedding', 'married', 'marry'], guide: null,
    note: 'Jung: union of opposites (coniunctio), two parts of life or self joining. Freud: wish for commitment or fear of it. Not a prediction.' },
  { id: 'phone', keywords: ['telefon', 'mesaj', 'alarm', 'phone', 'message', 'alarm'], guide: null,
    note: 'Connection and reachability. Phone not working: cannot get through to someone or to a part of oneself. Alarm that will not stop: inner pressure that cannot be switched off.' },
  { id: 'hospital', keywords: ['hastane', 'doktor', 'ameliyat', 'hospital', 'doctor', 'surgery'], guide: null,
    note: 'Need for healing or care; for medical students/doctors often day residue of work and the judging senior figure (inner critic).' },
  { id: 'building_collapse', keywords: ['yıkıl', 'çök', 'deprem', 'patla', 'collapse', 'earthquake', 'explode'], guide: null,
    note: 'Structures that looked solid giving way: plans, beliefs or the persona under strain. Jung: an old attitude breaking down to make room for change.' },
  { id: 'fire', keywords: ['yangın', 'ateş', 'alev', 'fire', 'flame', 'burn'], guide: null,
    note: 'Passion, anger, transformation. Uncontrolled fire: overwhelming emotion. Jung: purification and renewal.' },
  { id: 'paralysis', keywords: ['karabasan', 'kıpırdayamadım', 'hareket edemedim', 'sleep paralysis', "couldn't move"], guide: null,
    note: 'Sleep paralysis is common and harmless physiologically; symbolically feeling pinned down or powerless. If frequent and distressing, a sleep doctor can help.' },
  { id: 'dream_in_dream', keywords: ['rüya içinde rüya', 'uyandım ama', 'dream within a dream', 'false awakening'], guide: null,
    note: 'False awakening: layers of awareness; Jung: gradual coming to consciousness. Can be a doorway to lucid dreaming.' },
  { id: 'mother_father', keywords: ['annem', 'babam', 'anne', 'baba', 'mother', 'father', 'mom', 'dad'], guide: null,
    note: 'Freud: early bonds and childhood wishes. Jung: Great Mother / Father archetypes (care, authority, rules) and the inner parent voices.' },
  { id: 'partner', keywords: ['sevgilim', 'erkek arkadaşım', 'kız arkadaşım', 'eşim', 'boyfriend', 'girlfriend', 'husband', 'wife', 'partner'], guide: null,
    note: 'Freud: day residue and relationship wishes or jealousies. Jung: also anima/animus, what the dreamer projects onto the partner; cheating dreams often concern feeling unseen, not real events.' },
  { id: 'stranger', keywords: ['tanımadığım', 'yabancı', 'stranger', 'unknown man', 'unknown woman'], guide: null,
    note: 'Jung: unknown same-sex figure often the shadow; unknown other-sex figure often anima/animus. A part of the self not yet known.' },
  { id: 'death_of_loved', keywords: ['ölmüş', 'rahmetli', 'vefat', 'deceased', 'passed away'], guide: null,
    note: 'Seeing someone who has died: grief, longing, unfinished conversation; natural part of mourning. Jung: their qualities living on in the dreamer.' },
  { id: 'stairs_elevator', keywords: ['merdiven', 'asansör', 'stairs', 'elevator'], guide: null,
    note: 'Moving between levels: progress, status, or between conscious and unconscious. Stuck elevator: blocked progress.' },
  { id: 'travel', keywords: ['yolculuk', 'uçak', 'tren', 'otobüs', 'havaalanı', 'journey', 'plane', 'train', 'airport'], guide: null,
    note: 'Jung: the journey motif, transition and development. Missing transport: fear of missing a stage of life.' },
  { id: 'food', keywords: ['yemek', 'restoran', 'yedim', 'food', 'restaurant', 'ate'], guide: null,
    note: 'Nourishment and desire. Freud: a direct wish fulfilment. Overspending at a restaurant: desire followed by guilt or worry about cost.' },
  { id: 'sky_clouds', keywords: ['bulut', 'gökyüzü', 'yıldız', 'cloud', 'sky', 'star'], guide: null,
    note: 'Aspiration, spirit, wider perspective. City in the clouds: an ideal life; Jung: the Self or a longing for wholeness.' },
  { id: 'insects', keywords: ['böcek', 'örümcek', 'kelebek', 'bug', 'spider', 'butterfly'], guide: null,
    note: 'Small persistent worries (bugs), entanglement (spider), transformation and lightness (butterfly).' },
  { id: 'blood_wound', keywords: ['kan ', 'kanlı', 'kanıyor', 'kanama', 'yaram', 'yaralı', 'yara ', 'blood', 'wound', 'bleeding'], guide: null,
    note: 'Life energy and hurt; something that costs effort or is emotionally wounding. Not a health prediction.' },
  { id: 'police_caught', keywords: ['polis', 'yakalan', 'hapis', 'suç', 'police', 'caught', 'prison', 'crime'], guide: null,
    note: 'Freud: guilt over a wish (the superego). Being caught: fear of being found out or judged, often for something small like resting.' },
  { id: 'baby_animal_care', keywords: ['koru', 'sakla', 'protect', 'hide'], guide: null,
    note: 'Protecting or hiding something small: caring for a vulnerable part of oneself or a fragile new project.' },
  { id: 'mirror', keywords: ['ayna', 'mirror', 'reflection'], guide: null,
    note: 'Self-image and how one is seen. Jung: meeting the shadow or the persona; a changed reflection points to identity change.' },
  { id: 'door_key', keywords: ['kapı', 'anahtar', 'kilit', 'door', 'key', 'lock'], guide: null,
    note: 'Access and thresholds. Locked door: blocked possibility; finding a key: a solution or insight within reach.' },
  { id: 'shower_bath', keywords: ['duş ', 'duşta', 'duşa ', 'duş mekan', 'duş al', 'banyo', 'kaplıca', 'hamam', 'shower', ' bath', ' spa '], guide: null,
    note: 'Cleansing, renewal, rest. Public or exposed bathing: vulnerability and shame mixed with wish for relaxation (persona issue).' },
]

const MAX_MATCHES = 3

// Kullanicilar cogu zaman Turkce karakter kullanmadan yaziyor ("kovaliyordu",
// "boguluyordum"); hem metni hem anahtar kelimeyi ASCII'ye katlayip
// karsilastiriyoruz.
function fold(s) {
  return String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const FOLDED = DREAM_SYMBOLS.map((s) => ({ symbol: s, keys: s.keywords.map(fold) }))

/** Ruya metninde gecen sembolleri bulur (en fazla 3). */
export function matchDreamSymbols(text) {
  const t = ` ${fold(text)} `
  const found = []
  for (const { symbol, keys } of FOLDED) {
    if (keys.some((k) => t.includes(k))) found.push(symbol)
    if (found.length >= MAX_MATCHES) break
  }
  return found
}
