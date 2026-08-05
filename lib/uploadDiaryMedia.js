import { supabase } from '@/lib/supabase'

// Günce medyasını Supabase Storage'a ('diary-media' bucket) yükler.
//
// PERFORMANS GÜNCELLEMESİ — Els'in "medya çok yavaş yükleniyor, hem
// uploadda hem gösterilirken" geri bildirimi üzerine üç değişiklik:
//   1) Fotoğraflar PAYLAŞ'a basılmadan önce tarayıcıda (canvas ile) yeniden
//      boyutlandırılıp yeniden sıkıştırılıyor — telefon kamerasından gelen
//      4-12MB'lık bir foto genelde 200-500KB'a iniyor. Hem upload hem de
//      sonradan görüntüleme çok daha hızlı oluyor (GIF hariç — animasyonu
//      bozmamak için olduğu gibi bırakılıyor).
//   2) Video için istemcide gerçek bir sıkıştırma yapmak (ffmpeg.wasm gibi
//      ağır bir bağımlılık gerektirir) kapsam dışı bırakıldı, ama ilk kare
//      küçük bir JPEG poster olarak ayrıca yükleniyor — viewer videoyu
//      indirmeden ÖNCE bu posteri anında gösterebiliyor, ALGILANAN
//      gecikmeyi ortadan kaldırıyor (bkz. DiaryStoryViewer.jsx).
//   3) @supabase/supabase-js'in storage.upload()'ı ilerleme (progress)
//      bilgisi vermiyor (fetch tabanlı, bkz. supabase/storage-js). Bunun
//      yerine ana dosyayı Storage REST API'sine (POST /storage/v1/object/
//      {bucket}/{path}) doğrudan XMLHttpRequest ile gönderip
//      xhr.upload.onprogress ile gerçek yüzde takibi yapıyoruz — kullanıcı
//      artık "donmuş" değil, gerçek bir ilerleme çubuğu görüyor.
const DIARY_MEDIA_BUCKET = 'diary-media'
const MAX_IMAGE_BYTES = 25 * 1024 * 1024 // sıkıştırma öncesi ham dosya için üst sınır
const MAX_VIDEO_BYTES = 150 * 1024 * 1024 // bucket'ın kendi limitiyle aynı
const IMAGE_MAX_DIMENSION = 1920 // uzun kenar, px
const IMAGE_QUALITY = 0.82

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function readImageDimensions(source) {
  return new Promise((resolve) => {
    try {
      const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : source
      const img = new window.Image()
      img.onload = () => {
        if (source instanceof Blob) URL.revokeObjectURL(objectUrl)
        resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null })
      }
      img.onerror = () => {
        if (source instanceof Blob) URL.revokeObjectURL(objectUrl)
        resolve({ width: null, height: null })
      }
      img.src = objectUrl
    } catch {
      resolve({ width: null, height: null })
    }
  })
}

// Büyük fotoğrafları PAYLAŞ öncesi küçültüp yeniden sıkıştırır. Sonuç
// orijinalden büyük ya da eşitse (nadir ama olabilir, ör. zaten küçük/çok
// sıkıştırılmış bir dosya) orijinali korur — sıkıştırma asla dosyayı
// büyütmemeli.
async function compressImageIfNeeded(file) {
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const targetW = Math.max(1, Math.round(bitmap.width * scale))
    const targetH = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    bitmap.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY))
    if (!blob || blob.size >= file.size) return file

    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  } catch {
    // Sıkıştırma başarısız olursa (ör. createImageBitmap desteklenmiyor)
    // sessizce orijinal dosyaya geri dön — özellik çalışmaya devam etsin.
    return file
  }
}

// Videonun ilk karesini küçük bir JPEG'e çevirir. currentTime=0'da bazı
// tarayıcılarda henüz kare boyanmamış olabiliyor, o yüzden metadata
// yüklenince biraz ileri sarıp 'seeked' olayını bekliyoruz. 4sn içinde
// bir şey olmazsa (ör. codec desteklenmiyor) sessizce vazgeçiyor — video
// yüklemesi bundan etkilenmez, sadece poster olmadan devam eder.
function generateVideoPoster(file) {
  return new Promise((resolve) => {
    let settled = false
    const objectUrl = URL.createObjectURL(file)
    const videoEl = document.createElement('video')
    videoEl.muted = true
    videoEl.playsInline = true
    videoEl.preload = 'auto'

    const finish = (blob) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(objectUrl)
      resolve(blob)
    }
    const capture = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = videoEl.videoWidth || 720
        canvas.height = videoEl.videoHeight || 1280
        canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8)
      } catch {
        finish(null)
      }
    }

    videoEl.addEventListener('loadedmetadata', () => {
      try { videoEl.currentTime = Math.min(0.2, (videoEl.duration || 1) / 2) } catch { capture() }
    })
    videoEl.addEventListener('seeked', capture)
    videoEl.addEventListener('error', () => finish(null))
    videoEl.src = objectUrl
    setTimeout(() => finish(null), 4000)
  })
}

// Supabase JS SDK'sının storage.upload()'ı progress desteklemediği için
// (fetch tabanlı) ana dosyayı doğrudan Storage REST uç noktasına XHR ile
// yolluyoruz — supabase.storage.upload() ile TAMAMEN aynı sonucu üretir
// (aynı bucket, aynı RLS/policy kontrolleri, aynı public URL şekli),
// sadece xhr.upload.onprogress ile gerçek yüzde bilgisi ekliyor.
function uploadWithProgress({ bucket, path, file, accessToken, onProgress }) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { reject(new Error('missing_supabase_env')); return }
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, true)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('cache-control', '3600')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(/row-level security|policy|unauthorized/i.test(xhr.responseText || '') ? 'storage_permission_denied' : 'upload_failed'))
    }
    xhr.onerror = () => reject(new Error('upload_network_error'))
    xhr.send(file)
  })
}

export async function uploadDiaryMedia({ file, userId, onProgress }) {
  if (!file) throw new Error('no_file')
  if (!userId) throw new Error('not_authenticated')

  const isVideo = file.type?.startsWith('video/')
  const isImage = file.type?.startsWith('image/')
  if (!isVideo && !isImage) throw new Error('invalid_file_type')

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxBytes) throw new Error('file_too_large')

  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token
  if (!accessToken) throw new Error('not_authenticated')

  const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let posterUrl = null

  if (isImage) {
    onProgress?.({ phase: 'compressing', percent: 0 })
    const optimized = await compressImageIfNeeded(file)
    const dimensions = await readImageDimensions(optimized)
    const ext = optimized.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8)
    const filePath = `${userId}/${uniquePart}.${ext}`

    onProgress?.({ phase: 'uploading', percent: 0 })
    await uploadWithProgress({
      bucket: DIARY_MEDIA_BUCKET, path: filePath, file: optimized, accessToken,
      onProgress: (percent) => onProgress?.({ phase: 'uploading', percent }),
    })

    const { data } = supabase.storage.from(DIARY_MEDIA_BUCKET).getPublicUrl(filePath)
    if (!data?.publicUrl) throw new Error('public_url_failed')
    onProgress?.({ phase: 'done', percent: 100 })
    return { url: data.publicUrl, mediaType: 'photo', posterUrl, ...dimensions }
  }

  // Video: posteri önce (küçük, hızlı) yükle, sonra ana dosyayı ilerleme
  // takibiyle yükle.
  onProgress?.({ phase: 'compressing', percent: 0 }) // poster çıkarma da benzer bir "hazırlık" adımı
  const posterBlob = await generateVideoPoster(file)
  if (posterBlob) {
    try {
      const posterPath = `${userId}/${uniquePart}-poster.jpg`
      const { error: posterError } = await supabase.storage
        .from(DIARY_MEDIA_BUCKET)
        .upload(posterPath, posterBlob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
      if (!posterError) {
        posterUrl = supabase.storage.from(DIARY_MEDIA_BUCKET).getPublicUrl(posterPath)?.data?.publicUrl || null
      }
    } catch {
      // poster opsiyonel — başarısız olursa video yüklemesi yine de devam eder
    }
  }

  const videoExt = (file.name.split('.').pop() || 'mp4').toLowerCase().slice(0, 8)
  const videoPath = `${userId}/${uniquePart}.${videoExt}`
  onProgress?.({ phase: 'uploading', percent: 0 })
  await uploadWithProgress({
    bucket: DIARY_MEDIA_BUCKET, path: videoPath, file, accessToken,
    onProgress: (percent) => onProgress?.({ phase: 'uploading', percent }),
  })

  const { data } = supabase.storage.from(DIARY_MEDIA_BUCKET).getPublicUrl(videoPath)
  if (!data?.publicUrl) throw new Error('public_url_failed')
  onProgress?.({ phase: 'done', percent: 100 })
  return { url: data.publicUrl, mediaType: 'video', posterUrl, width: null, height: null }
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
  if (code === 'upload_network_error') return tr ? 'Bağlantı sorunu, tekrar dene.' : 'Connection issue, please try again.'
  return tr ? 'Yüklenemedi, tekrar dene.' : 'Could not upload, please try again.'
}
