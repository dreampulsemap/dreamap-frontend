import { supabase } from '@/lib/supabase'

// Rüya kapak görseli için kullanıcının cihazından seçtiği dosyayı doğrudan
// tarayıcıdan Supabase Storage'a ('dream-images' bucket — görsel üretim/onarım
// pipeline'ının zaten kalıcı depo olarak kullandığı bucket, bkz.
// lib/repairDreamImage.js) yükler ve herkese açık URL'i döner.
//
// dreamId OPSİYONEL: rüya oluşturma formunda (pages/add-dream.js) rüya henüz
// DB'de yokken de görsel seçilebiliyor — o durumda kullanıcı klasörünün
// köküne yüklenir, rüya oluştuktan sonra (DreamCard/DreamEditModal) dreamId
// alt klasörüne yüklenir.
//
// ÖNEMLİ: Bu bucket'a şimdiye kadar SADECE sunucu tarafı (supabaseAdmin,
// service role) yazıyordu — bu yüzden 'dream-images' üzerinde kimliği
// doğrulanmış kullanıcılar için bir INSERT RLS policy'si YOK. Bu policy
// Supabase Dashboard'dan elle eklenmeden bu fonksiyon 403/"row-level
// security" hatasıyla başarısız olur. Bkz. MIGRATION_NOTES_dream_cover_upload.md.
const DREAM_IMAGE_BUCKET = 'dream-images'
const MAX_BYTES = 10 * 1024 * 1024 // 10MB — diğer yükleme akışlarında sabit bir üst sınır yoktu, makul bir varsayılan koyduk

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

export async function uploadDreamCoverImage({ file, userId, dreamId }) {
  if (!file) throw new Error('no_file')
  if (!file.type || !file.type.startsWith('image/')) throw new Error('invalid_file_type')
  if (file.size > MAX_BYTES) throw new Error('file_too_large')
  if (!userId) throw new Error('not_authenticated')

  const { width, height } = await readImageDimensions(file)

  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8)
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const filePath = dreamId
    ? `${userId}/${dreamId}/${uniquePart}.${fileExt}`
    : `${userId}/${uniquePart}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(DREAM_IMAGE_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    if (/row-level security|permission|policy|unauthorized/i.test(uploadError.message || '')) {
      throw new Error('storage_permission_denied')
    }
    throw uploadError
  }

  const { data: publicData } = supabase.storage.from(DREAM_IMAGE_BUCKET).getPublicUrl(filePath)
  const url = publicData?.publicUrl
  if (!url) throw new Error('public_url_failed')

  return { url, width, height, source: 'user_upload' }
}

export function getDreamUploadErrorMessage(err, lang) {
  const code = err?.message
  const tr = lang === 'tr'
  if (code === 'file_too_large') return tr ? 'Görsel çok büyük (maks. 10MB).' : 'Image is too large (max 10MB).'
  if (code === 'invalid_file_type') return tr ? 'Lütfen bir görsel dosyası seç.' : 'Please choose an image file.'
  if (code === 'not_authenticated') return tr ? 'Devam etmek için giriş yapmalısın.' : 'Please log in to continue.'
  if (code === 'storage_permission_denied') {
    return tr
      ? 'Yükleme izni yok — depolama ayarları eksik olabilir.'
      : 'Upload not permitted — storage setup may be incomplete.'
  }
  return tr ? 'Görsel yüklenemedi, tekrar dene.' : 'Could not upload the image, please try again.'
}
