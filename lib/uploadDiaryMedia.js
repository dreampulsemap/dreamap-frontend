import { supabase } from '@/lib/supabase'

// Günce girdisi için kullanıcının cihazından seçtiği foto/videoyu doğrudan
// tarayıcıdan Supabase Storage'a ('diary-media' bucket) yükler ve herkese
// açık URL'i döner. goal-images / goal-videos / dream-images ile birebir
// aynı istemci-tarafı-yükleme deseni (bkz. lib/uploadVisionVideo.js).
// Bucket + RLS policy'leri zaten canlıda mevcut (owner-scoped klasör:
// {userId}/{dosya}, herkese açık okuma).
const DIARY_MEDIA_BUCKET = 'diary-media'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB — dream/goal kapak yüklemeleriyle aynı üst sınır
const MAX_VIDEO_BYTES = 150 * 1024 * 1024 // 150MB — Vizyon Videosu ile aynı, bucket'ın kendi limitiyle de eşleşiyor

function readImageDimensions(file) {
  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null })
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve({ width: null, height: null })
      }
      img.src = objectUrl
    } catch {
      resolve({ width: null, height: null })
    }
  })
}

export async function uploadDiaryMedia({ file, userId }) {
  if (!file) throw new Error('no_file')
  if (!userId) throw new Error('not_authenticated')

  const isVideo = file.type?.startsWith('video/')
  const isImage = file.type?.startsWith('image/')
  if (!isVideo && !isImage) throw new Error('invalid_file_type')

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxBytes) throw new Error('file_too_large')

  const dimensions = isImage ? await readImageDimensions(file) : { width: null, height: null }

  const fileExt = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase().slice(0, 8)
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const filePath = `${userId}/${uniquePart}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(DIARY_MEDIA_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })

  if (uploadError) {
    if (/row-level security|permission|policy|unauthorized/i.test(uploadError.message || '')) {
      throw new Error('storage_permission_denied')
    }
    throw uploadError
  }

  const { data: publicData } = supabase.storage.from(DIARY_MEDIA_BUCKET).getPublicUrl(filePath)
  const url = publicData?.publicUrl
  if (!url) throw new Error('public_url_failed')

  return { url, mediaType: isVideo ? 'video' : 'photo', ...dimensions }
}

export function getDiaryUploadErrorMessage(err, lang) {
  const code = err?.message
  const tr = lang === 'tr'
  if (code === 'file_too_large') return tr ? 'Dosya çok büyük.' : 'File is too large.'
  if (code === 'invalid_file_type') return tr ? 'Lütfen bir fotoğraf ya da video seç.' : 'Please choose a photo or video file.'
  if (code === 'not_authenticated') return tr ? 'Devam etmek için giriş yapmalısın.' : 'Please log in to continue.'
  if (code === 'storage_permission_denied') {
    return tr ? 'Yükleme izni yok, tekrar dene.' : 'Upload not permitted, please try again.'
  }
  return tr ? 'Yüklenemedi, tekrar dene.' : 'Could not upload, please try again.'
}
