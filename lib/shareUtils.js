// Tarayıcıda da kullanılan saf yardımcılar. shareSnapshot.js sunucu
// istemcisini (supabaseAdmin) içe aktardığı için sayfa bileşeni onu
// doğrudan kullanırsa tarayıcıda "supabaseKey is required" hatası verir.
export function clip(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

export function sharePath(type, id) {
  return `/share/${type}/${id}`
}
