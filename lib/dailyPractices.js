// Vizyon kartı detayında gösterilen, hedefe her gün küçük bir adım
// attırmayı amaçlayan eğlenceli manifestation / oyun / alıştırma havuzu.
// Basit tutuluyor: sabit bir liste + hedef bazında deterministik seçim
// (aynı gün aynı hedef için hep aynı pratik gösterilsin, sayfa her
// yenilendiğinde değişmesin), tamamlama durumu istemci tarafında
// (localStorage) tutulur — ayrı bir backend şeması gerektirmez.

const PRACTICES = {
  en: [
    { type: 'visualization', icon: '🌅', text: 'Close your eyes for 60 seconds and picture the exact moment you achieve this — what do you see, hear, feel?' },
    { type: 'affirmation', icon: '✨', text: 'Say out loud, three times: "I am becoming the person who achieves this."' },
    { type: 'game', icon: '🎯', text: 'Pick the smallest possible action toward this goal and do it right now, before you close the app.' },
    { type: 'exercise', icon: '📝', text: 'Write one sentence about why this goal matters to you — read it back before bed tonight.' },
    { type: 'game', icon: '🔥', text: 'Streak challenge: do one 2-minute action toward this goal today to keep your momentum alive.' },
    { type: 'visualization', icon: '🌟', text: 'Imagine explaining to a friend, a year from now, how you achieved this. What story do you tell?' },
    { type: 'affirmation', icon: '💫', text: 'Finish this sentence out loud: "Today I am one step closer to..." — say your goal.' },
    { type: 'exercise', icon: '🧭', text: 'List one obstacle standing in your way, and one tiny way to work around it today.' },
    { type: 'game', icon: '🎲', text: 'Roll the dice on yourself: text or tell someone about this goal today. Saying it out loud makes it real.' },
    { type: 'visualization', icon: '🌙', text: 'Before you sleep tonight, replay today\'s progress like a highlight reel — even the small wins count.' },
    { type: 'exercise', icon: '🪴', text: 'Do a 5-minute "future self" journal: write as if you already achieved this. How does it feel?' },
    { type: 'game', icon: '⏱️', text: '2-minute rule: set a timer and spend just 2 minutes moving this goal forward. Momentum beats motivation.' },
  ],
  tr: [
    { type: 'visualization', icon: '🌅', text: 'Gözlerini 60 saniye kapat ve bu hedefe ulaştığın anı hayal et — ne görüyorsun, ne duyuyorsun, ne hissediyorsun?' },
    { type: 'affirmation', icon: '✨', text: 'Yüksek sesle üç kez söyle: "Bunu başaran kişi olmaya doğru ilerliyorum."' },
    { type: 'game', icon: '🎯', text: 'Bu hedefe yönelik atabileceğin en küçük adımı seç ve uygulamayı kapatmadan hemen şimdi yap.' },
    { type: 'exercise', icon: '📝', text: 'Bu hedefin senin için neden önemli olduğunu tek cümlede yaz — bu akşam yatmadan önce tekrar oku.' },
    { type: 'game', icon: '🔥', text: 'Seri meydan okuması: momentumunu canlı tutmak için bugün bu hedefe yönelik 2 dakikalık bir eylem yap.' },
    { type: 'visualization', icon: '🌟', text: 'Bir yıl sonra bir arkadaşına buna nasıl ulaştığını anlattığını hayal et. Nasıl bir hikaye anlatıyorsun?' },
    { type: 'affirmation', icon: '💫', text: 'Şu cümleyi yüksek sesle tamamla: "Bugün hedefime bir adım daha yaklaştım" — hedefini söyle.' },
    { type: 'exercise', icon: '🧭', text: 'Önündeki bir engeli ve bugün onu aşmak için atabileceğin küçük bir adımı yaz.' },
    { type: 'game', icon: '🎲', text: 'Kendine zar at: bugün birine bu hedefinden bahset. Yüksek sesle söylemek onu gerçek kılar.' },
    { type: 'visualization', icon: '🌙', text: 'Bu akşam uyumadan önce bugünün ilerlemesini bir özet filmi gibi tekrar oynat — küçük kazanımlar da sayılır.' },
    { type: 'exercise', icon: '🪴', text: '5 dakikalık "gelecekteki ben" günlüğü tut: sanki bu hedefe zaten ulaşmışsın gibi yaz. Nasıl hissettiriyor?' },
    { type: 'game', icon: '⏱️', text: '2 dakika kuralı: bir zamanlayıcı kur ve sadece 2 dakikanı bu hedefi ilerletmeye ayır. Momentum motivasyondan güçlüdür.' },
  ],
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Bugünün tarihi + hedef id'sine göre deterministik bir pratik seçer —
// aynı gün içinde sayfa yenilense de aynı pratik gösterilir.
export function getDailyPractice(goalId, lang = 'en') {
  const pool = PRACTICES[lang] || PRACTICES.en
  const todayKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const index = hashString(`${goalId}-${todayKey}`) % pool.length
  return { ...pool[index], dateKey: todayKey }
}

export function getPracticeDoneKey(goalId, dateKey) {
  return `dreamap_practice_done_${goalId}_${dateKey}`
}
