// Android util/RelativeTime.kt ile aynı kural ve metinler.
const T = {
  tr: { now: 'Az önce', m: (n) => `${n} dk önce`, h: (n) => `${n} sa önce`, d: (n) => `${n} gün önce` },
  en: { now: 'Just now', m: (n) => `${n} min ago`, h: (n) => `${n} h ago`, d: (n) => `${n} d ago` },
}

export function relativeTime(iso, lang = 'en') {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return String(iso).slice(0, 10)
  const t = T[lang] || T.en
  const full = () => date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  const diff = Date.now() - date.getTime()
  if (diff < -2 * 60_000) return full()
  const minutes = Math.floor(Math.max(0, diff) / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return t.now
  if (minutes < 60) return t.m(minutes)
  if (hours < 24) return t.h(hours)
  if (days < 7) return t.d(days)
  return full()
}
