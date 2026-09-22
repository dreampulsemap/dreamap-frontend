import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 'diary-media' bucket'i PRIVATE. Gecmiste DB'ye tam public URL yazildigi
// (Android: bucket.publicUrl(), web: getPublicUrl()) ve bu kayitlar oldugu
// gibi durdugu icin, saklanan degeri yalnizca YOL TASIYICISI olarak
// kullaniyoruz: okuma aninda yoldan kisa omurlu imzali URL uretiliyor.
// Boylece private bir gunluk girdisinin medyasi, URL'i ele geciren birine
// de suresiz acik kalmiyor.
const BUCKET = 'diary-media'
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`
const SIGN_MARKER = `/storage/v1/object/sign/${BUCKET}/`

// Coil/taravici onbelleginin her istekte bosa gitmemesi icin gun olcegi.
const SIGN_TTL_SECONDS = 60 * 60 * 24

/** Saklanan degerden bucket ici yolu cikarir; bu bucket'a ait degilse null. */
export function storagePathFromStored(stored) {
  if (!stored || typeof stored !== 'string') return null

  for (const marker of [PUBLIC_MARKER, SIGN_MARKER]) {
    const at = stored.indexOf(marker)
    if (at !== -1) {
      // Imzali URL'de yolun sonunda ?token=... olabilir.
      const rest = stored.slice(at + marker.length).split('?')[0]
      return decodeURIComponent(rest)
    }
  }

  // Harici kaynak (Pixabay vb.) — dokunma.
  if (/^https?:\/\//i.test(stored)) return null

  return stored.replace(/^\/+/, '')
}

/**
 * Verilen kayitlarin medya alanlarini imzali URL'e cevirir (yerinde degil,
 * yeni nesne dondurur). Tum yollar tek cagrida imzalanir.
 */
export async function signDiaryMedia(entries, fields = ['media_url', 'poster_url']) {
  if (!Array.isArray(entries) || entries.length === 0) return entries

  const paths = new Set()
  for (const entry of entries) {
    for (const field of fields) {
      const path = storagePathFromStored(entry?.[field])
      if (path) paths.add(path)
    }
  }
  if (paths.size === 0) return entries

  const pathList = [...paths]
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrls(pathList, SIGN_TTL_SECONDS)

  if (error) {
    // Imzalama basarisizsa girdiyi medyasiz dondurmek, tum gunlugu
    // bos gostermekten iyidir; cagiran taraf null medyayi zaten tolere
    // ediyor (DiaryJournalScreen posterUrl ?: mediaUrl).
    console.error('diary media sign error:', error.message)
    return entries
  }

  const signedByPath = new Map()
  data?.forEach((row, i) => {
    const path = row?.path ?? pathList[i]
    if (row?.signedUrl) signedByPath.set(path, row.signedUrl)
  })

  return entries.map((entry) => {
    if (!entry) return entry
    const patched = { ...entry }
    for (const field of fields) {
      const path = storagePathFromStored(entry[field])
      if (path && signedByPath.has(path)) patched[field] = signedByPath.get(path)
    }
    return patched
  })
}
