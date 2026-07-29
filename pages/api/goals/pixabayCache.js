import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Pixabay'den bir görsel/video seçildiğinde ortak akış:
//   1) image_library'de bu içerik daha önce indirilmiş mi bak (varsa reuse)
//   2) Yoksa Pixabay'den indir, 'image-library' bucket'ına yükle, kaydet
// Hem goal-spesifik endpoint'ler (add-image-from-pixabay, add-video-from-pixabay)
// hem de goal-bağımsız import endpoint'i (kapak fotoğrafı, slayt seçimi) bunu kullanır.

const LIBRARY_BUCKET = 'image-library'
const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_VIDEO_BYTES = 60 * 1024 * 1024

async function cachePixabayMedia({ mediaType, pixabayId, sourceUrl, tags, pixabayUser, width, height }) {
  const { data: cached } = await supabaseAdmin
    .from('image_library')
    .select('id, stored_url, downloads_count')
    .eq('source', 'pixabay')
    .eq('media_type', mediaType)
    .eq('source_id', String(pixabayId))
    .maybeSingle()

  if (cached?.stored_url) {
    await supabaseAdmin
      .from('image_library')
      .update({ downloads_count: (cached.downloads_count || 0) + 1 })
      .eq('id', cached.id)
    return { storedUrl: cached.stored_url, error: null }
  }

  const res = await fetch(sourceUrl)
  if (!res.ok) return { storedUrl: null, error: 'pixabay_download_failed' }

  const contentType = res.headers.get('content-type') || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg')
  const buffer = Buffer.from(await res.arrayBuffer())

  const maxBytes = mediaType === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (buffer.length > maxBytes) {
    return { storedUrl: null, error: mediaType === 'video' ? 'video_too_large' : 'image_too_large' }
  }

  const ext = mediaType === 'video' ? 'mp4' : (contentType.includes('png') ? 'png' : 'jpg')
  const folder = mediaType === 'video' ? 'pixabay-video' : 'pixabay'
  const filePath = `${folder}/${pixabayId}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(LIBRARY_BUCKET)
    .upload(filePath, buffer, { contentType, upsert: true })
  if (uploadError) return { storedUrl: null, error: uploadError.message || 'upload_error' }

  const { data: publicData } = supabaseAdmin.storage.from(LIBRARY_BUCKET).getPublicUrl(filePath)
  const storedUrl = publicData?.publicUrl
  if (!storedUrl) return { storedUrl: null, error: 'public_url_failed' }

  const cleanTags = Array.isArray(tags) ? tags.slice(0, 20).map((t) => String(t).slice(0, 40)) : []

  const { error: libError } = await supabaseAdmin.from('image_library').upsert(
    {
      source: 'pixabay',
      media_type: mediaType,
      source_id: String(pixabayId),
      tags: cleanTags,
      original_url: sourceUrl,
      stored_url: storedUrl,
      width: width || null,
      height: height || null,
      pixabay_user: pixabayUser || null,
      downloads_count: 1,
    },
    { onConflict: 'source,media_type,source_id' }
  )
  if (libError) console.error(`image_library ${mediaType} upsert error:`, libError)

  return { storedUrl, error: null }
}

export function cachePixabayImage({ pixabayId, imageUrl, tags, pixabayUser, width, height }) {
  return cachePixabayMedia({ mediaType: 'image', pixabayId, sourceUrl: imageUrl, tags, pixabayUser, width, height })
}

export function cachePixabayVideo({ pixabayId, videoUrl, tags, pixabayUser, width, height }) {
  return cachePixabayMedia({ mediaType: 'video', pixabayId, sourceUrl: videoUrl, tags, pixabayUser, width, height })
}
