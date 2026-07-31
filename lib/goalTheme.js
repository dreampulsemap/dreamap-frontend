// Bir hedefin "ne hakkında" olduğunu başlık+açıklamadaki anahtar kelimelerden
// çıkarıp, kartın görsel dilini (renk, köşe yuvarlaklığı, ikon) buna göre
// uyarlar. Amaç: "büyüme" hissi veren hedefler organik/yumuşak, "güç/kariyer"
// hissi verenler keskin/yüksek kontrast görünsün — kart, içeriğiyle hissen
// tutarlı olsun (sembolizm ilkesi).
//
// Bilinçli olarak AI/API çağrısı yapmıyoruz — anlık render'da, ücretsiz,
// deterministik bir sınıflandırma yeterli.

const THEMES = {
  growth: {
    icon: 'sprout',
    keywords: ['büyü', 'sağlık', 'spor', 'fitness', 'egzersiz', 'beslen', 'meditasyon', 'doğa', 'wellness', 'yoga', 'koşu', 'grow', 'health', 'fitness', 'exercise', 'nutrition', 'meditat', 'nature', 'running', 'yoga'],
    accentFrom: '#34D399',
    accentTo: '#5EEAD4',
    radius: '28px',
    ring: 'rgba(52, 211, 153, 0.16)',
  },
  power: {
    icon: 'zap',
    keywords: ['kariyer', 'iş ', 'işim', 'para', 'başarı', 'güç', 'lider', 'yatırım', 'terfi', 'şirket', 'career', 'business', 'money', 'success', 'power', 'leader', 'invest', 'promotion', 'company'],
    accentFrom: '#E6C687',
    accentTo: '#94A3B8',
    radius: '10px',
    ring: 'rgba(230, 198, 135, 0.16)',
  },
  love: {
    icon: 'heart',
    keywords: ['aşk', 'ilişki', 'evlilik', 'aile', 'sevgili', 'eş ', 'arkadaş', 'love', 'relationship', 'marriage', 'family', 'partner', 'friendship'],
    accentFrom: '#FB7185',
    accentTo: '#F0ABFC',
    radius: '26px',
    ring: 'rgba(251, 113, 133, 0.16)',
  },
  creativity: {
    icon: 'compass',
    keywords: ['sanat', 'seyahat', 'yaratıcı', 'keşif', 'müzik', 'yazı', 'gezi', 'macera', 'art', 'travel', 'creativ', 'explor', 'music', 'writing', 'adventure', 'journey'],
    accentFrom: '#A78BFA',
    accentTo: '#22D3EE',
    radius: '20px',
    ring: 'rgba(167, 139, 250, 0.16)',
  },
  default: {
    icon: 'sparkles',
    keywords: [],
    accentFrom: '#E6C687',
    accentTo: '#38BDF8',
    radius: '24px',
    ring: 'rgba(230, 198, 135, 0.14)',
  },
}

export function getGoalTheme(title = '', description = '') {
  const text = `${title} ${description || ''}`.toLowerCase()
  for (const key of ['growth', 'power', 'love', 'creativity']) {
    if (THEMES[key].keywords.some((kw) => text.includes(kw))) {
      return { key, ...THEMES[key] }
    }
  }
  return { key: 'default', ...THEMES.default }
}
