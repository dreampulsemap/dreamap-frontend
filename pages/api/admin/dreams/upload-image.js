import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/adminAuth'
import { notifyDreamImageGift } from '@/lib/adminDreamGift'

// Base64 body kabul edebilmek için varsayılan 1mb bodyParser limitini
// büyütüyoruz. Multipart/form-data + formidable yerine base64+JSON
// tercih edildi: yeni bir bağımlılık (formidable/busboy — bu projede şu an
// hiç yok) eklemeden çalışsın diye.
export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
  },
}

const LIBRARY_BUCKET = 'image-library'
const MAX_IMAGE_BYTES = 15 * 1024 * 1024

function extFromType(fileType, fileName) {
  if (fileType === 'image/png') return 'png'
  if (fileType === 'image/webp') return 'webp'
  if (fileType === 'image/gif') return 'gif'
  const fromName = String(fileName || '').split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  return 'jpg'
}

// lib/pixabayCache.js'deki upload deseniyle aynı 'image-library'
// bucket'ını kullanır, ama ayrı bir klasörde ('admin-upload/') — o tablodaki
// image_library kaydı Pixabay eşleştirmesine özel, cihaz yüklemesinde
// "daha önce indirildi mi" diye bakılacak bir şey yok.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!requireAdmin(req, res)) return

  const { dreamId, fileName, fileType, dataBase64, notify = true } = req.body || {}
  if (!dreamId || typeof dataBase64 !== 'string' || !dataBase64) {
    return res.status(400).json({ error: 'invalid_params' })
  }
  if (typeof fileType === 'string' && fileType && !fileType.startsWith('image/')) {
    return res.status(400).json({ error: 'not_an_image' })
  }

  try {
    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('id, user_id, original_language')
      .eq('id', dreamId)
      .maybeSingle()
    if (dreamError) throw dreamError
    if (!dream) return res.status(404).json({ error: 'dream_not_found' })

    const base64Payload = dataBase64.includes(',') ? dataBase64.split(',').pop() : dataBase64
    const buffer = Buffer.from(base64Payload, 'base64')
    if (buffer.length === 0) return res.status(400).json({ error: 'empty_file' })
    if (buffer.length > MAX_IMAGE_BYTES) return res.status(400).json({ error: 'image_too_large' })

    const ext = extFromType(fileType, fileName)
    const filePath = `admin-upload/${dreamId}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(LIBRARY_BUCKET)
      .upload(filePath, buffer, { contentType: fileType || 'image/jpeg', upsert: true })
    if (uploadError) return res.status(500).json({ error: uploadError.message || 'upload_error' })

    const { data: publicData } = supabaseAdmin.storage.from(LIBRARY_BUCKET).getPublicUrl(filePath)
    const storedUrl = publicData?.publicUrl
    if (!storedUrl) return res.status(500).json({ error: 'public_url_failed' })

    const { error: updateError } = await supabaseAdmin
      .from('dreams')
      .update({
        ai_image_url: storedUrl,
        image_source: 'admin_upload',
        image_width: null,
        image_height: null,
        image_status: 'ok',
        image_checked_at: new Date().toISOString(),
      })
      .eq('id', dreamId)
    if (updateError) throw updateError

    if (notify && dream.user_id) {
      await notifyDreamImageGift(supabaseAdmin, { userId: dream.user_id, dreamId, lang: dream.original_language })
    }

    return res.status(200).json({ ok: true, url: storedUrl })
  } catch (error) {
    console.error('admin/dreams/upload-image error:', error)
    return res.status(500).json({ error: error.message || 'internal_error' })
  }
}
