import { supabase } from '@/lib/supabase'

// Vizyon Videosu editöründe (VisionVideoEditor.jsx) dışa aktarılan video
// blob'unu doğrudan tarayıcıdan Supabase Storage'a ('goal-videos' bucket)
// yükler ve herkese açık URL'i döner. goal-images / dream-images ile aynı
// istemci-tarafı-yükleme deseni (bkz. lib/uploadDreamCoverImage.js).
//
// ÖNEMLİ: 'goal-videos' YENİ bir bucket — henüz Supabase projesinde
// oluşturulmadı ve policy'leri yok. Bu fonksiyon Dashboard'dan elle
// uygulanması gereken adımlar tamamlanmadan 403/"row-level security"
// hatasıyla başarısız olur. Bkz. MIGRATION_NOTES_vision_video.md.
const VISION_VIDEO_BUCKET = 'goal-videos'
const MAX_BYTES = 150 * 1024 * 1024 // 150MB — kısa dikey video için makul bir üst sınır (diğer akışlarda video için sabit bir limit yoktu)

export async function uploadVisionVideo({ blob, userId, goalId, ext }) {
  if (!blob) throw new Error('no_file')
  if (blob.size > MAX_BYTES) throw new Error('file_too_large')
  if (!userId) throw new Error('not_authenticated')
  if (!goalId) throw new Error('no_goal')

  const fileExt = (ext || 'webm').toLowerCase().slice(0, 8)
  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const filePath = `${userId}/${goalId}/${uniquePart}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(VISION_VIDEO_BUCKET)
    .upload(filePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: blob.type || undefined,
    })

  if (uploadError) {
    if (/row-level security|permission|policy|unauthorized/i.test(uploadError.message || '')) {
      throw new Error('storage_permission_denied')
    }
    throw uploadError
  }

  const { data: publicData } = supabase.storage.from(VISION_VIDEO_BUCKET).getPublicUrl(filePath)
  const url = publicData?.publicUrl
  if (!url) throw new Error('public_url_failed')

  return { url }
}

export function getVisionVideoErrorMessage(err, lang) {
  const code = err?.message
  const tr = lang === 'tr'
  if (code === 'file_too_large') return tr ? 'Video çok büyük (maks. 150MB).' : 'Video is too large (max 150MB).'
  if (code === 'not_authenticated') return tr ? 'Devam etmek için giriş yapmalısın.' : 'Please log in to continue.'
  if (code === 'no_goal') return tr ? 'Hedef bulunamadı.' : 'Goal not found.'
  if (code === 'storage_permission_denied') {
    return tr
      ? 'Yükleme izni yok — depolama ayarları eksik olabilir (bkz. MIGRATION_NOTES_vision_video.md).'
      : 'Upload not permitted — storage setup may be incomplete (see MIGRATION_NOTES_vision_video.md).'
  }
  return tr ? 'Video yüklenemedi, tekrar dene.' : 'Could not upload the video, please try again.'
}
