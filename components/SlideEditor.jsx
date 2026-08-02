import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, GripVertical, Search as SearchIcon, Sparkles, Type } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import PixabayPicker from './PixabayPicker'
import ImageCropModal from './ImageCropModal'
import SlideCaptionEditor from './SlideCaptionEditor'

const MAX_SLIDES = 20

async function authBundle() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    session,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  }
}

async function uploadToGoalImages(userId, goalId, fileOrBlob, extHint) {
  const ext = extHint || (fileOrBlob.type?.includes('png') ? 'png' : 'jpg')
  const filePath = `${userId}/${goalId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('goal-images').upload(filePath, fileOrBlob, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('goal-images').getPublicUrl(filePath)
  return data.publicUrl
}

// "Vizyon Slaytları" — hedefin galerisinden/cihazdan/Pixabay'den/AI'dan
// eklenen görsellerin sıralı, kırpılabilir, sürüklenerek konumlandırılan
// metinli bir Reels destesine dönüştürüldüğü editör. Sadece hedef sahibi
// açabilir; oynatıcı (viewer) ayrı bir bileşendir (SlidesViewer).
export default function SlideEditor({ goal, lang = 'en', onClose }) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [videoStatus, setVideoStatus] = useState(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [captionEditingSlide, setCaptionEditingSlide] = useState(null)

  // Kırpma kuyruğu — cihazdan veya Pixabay'den birden fazla görsel
  // eklendiğinde her biri sırayla kırpılabiliyor; istenirse hepsi tek
  // hamlede (kırpmadan, otomatik ortalanmış) eklenebiliyor.
  const [cropQueue, setCropQueue] = useState([]) // [{ kind: 'file'|'pixabay', ... }]
  const [cropIndex, setCropIndex] = useState(0)

  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const existingImages = [
    ...(goal.cover_image_url ? [goal.cover_image_url] : []),
    ...(goal.gallery_image_urls || []),
  ]

  useEffect(() => {
    let active = true
    authBundle().then((auth) => {
      fetch(`/api/goals/slides/list?goalId=${goal.id}`, { headers: auth?.headers || {} })
        .then((r) => r.json())
        .then((json) => { if (active) setSlides(json.slides || []) })
        .catch(() => { if (active) setError('network_error') })
        .finally(() => { if (active) setLoading(false) })
    })
    return () => { active = false }
  }, [goal.id])

  // Pixabay video sekmesinde doğru kilit durumunu gösterebilmek için,
  // picker açılmadan önce premium/haftalık hak durumunu çekiyoruz —
  // GoalDetailModal'daki aynı desen.
  useEffect(() => {
    let active = true
    authBundle().then((auth) => {
      if (!auth) return
      fetch('/api/user/premium-status', { headers: auth.headers })
        .then((r) => r.json())
        .then((json) => { if (active && !json.error) setVideoStatus(json) })
        .catch(() => {})
    })
    return () => { active = false }
  }, [])

  async function addSlide(imageUrl) {
    if (slides.length >= MAX_SLIDES) {
      setError(lang === 'tr' ? `En fazla ${MAX_SLIDES} slayt eklenebilir.` : `You can add up to ${MAX_SLIDES} slides.`)
      return
    }
    const auth = await authBundle()
    if (!auth) { setError(lang === 'tr' ? 'Giriş yapmalısın.' : 'You need to log in.'); return }
    setError('')
    try {
      const res = await fetch('/api/goals/slides/create', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ goalId: goal.id, imageUrl }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'error'); return }
      setSlides((prev) => [...prev, json.slide])
    } catch {
      setError('network_error')
    }
  }

  // Her tıklamada TEK bir görsel üretir ve doğrudan slayt olarak ekler.
  // AI görselleri zaten 9:16 üretiliyor — kırpma adımına gerek yok.
  async function handleGenerateAiSlide() {
    if (slides.length >= MAX_SLIDES) {
      setError(lang === 'tr' ? `En fazla ${MAX_SLIDES} slayt eklenebilir.` : `You can add up to ${MAX_SLIDES} slides.`)
      return
    }
    const auth = await authBundle()
    if (!auth) { setError(lang === 'tr' ? 'Giriş yapmalısın.' : 'You need to log in.'); return }

    setGeneratingAi(true)
    setError('')
    try {
      const res = await fetch('/api/goals/generate-slide-image', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ goalId: goal.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'insufficient_auras') {
          setError(lang === 'tr' ? 'Yetersiz Aura (2 gerekiyor).' : 'Not enough Auras (need 2).')
        } else if (json.error === 'image_generation_failed') {
          setError(lang === 'tr' ? 'Görsel üretilemedi, kredi iade edildi.' : 'Image generation failed, credit refunded.')
        } else {
          setError(json.error || 'error')
        }
        return
      }
      await addSlide(json.imageUrl)
    } catch {
      setError('network_error')
    } finally {
      setGeneratingAi(false)
    }
  }

  // Cihazdan seçilen dosyaları kırpma kuyruğuna koyar — kırpma penceresi
  // dosyaları sırayla gösterir.
  function handleUploadFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'))
    if (!files.length) return
    const room = MAX_SLIDES - slides.length
    if (room <= 0) {
      setError(lang === 'tr' ? `En fazla ${MAX_SLIDES} slayt eklenebilir.` : `You can add up to ${MAX_SLIDES} slides.`)
      return
    }
    const queued = files.slice(0, room).map((file) => ({ kind: 'file', file, previewUrl: URL.createObjectURL(file) }))
    setCropQueue((prev) => [...prev, ...queued])
  }

  // Pixabay'den seçilen görsel önce indirilip kendi storage'ımıza kaydedilir
  // (mevcut önbellekleme mantığı), sonra kırpma kuyruğuna eklenir.
  async function handlePixabaySlidePick(hit) {
    if (slides.length + cropQueue.length >= MAX_SLIDES) {
      setError(lang === 'tr' ? `En fazla ${MAX_SLIDES} slayt eklenebilir.` : `You can add up to ${MAX_SLIDES} slides.`)
      return false
    }
    const auth = await authBundle()
    if (!auth) { setError(lang === 'tr' ? 'Giriş yapmalısın.' : 'You need to log in.'); return false }
    setError('')
    try {
      const res = await fetch('/api/pixabay/import-image', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({
          pixabayId: hit.id,
          imageUrl: hit.largeImageURL,
          tags: hit.tags,
          pixabayUser: hit.user,
          width: hit.width,
          height: hit.height,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'error'); return false }
      setCropQueue((prev) => [...prev, { kind: 'imported', previewUrl: json.url, finalUrl: json.url }])
      return true
    } catch {
      setError('network_error')
      return false
    }
  }

  // Video için kırpma adımı yok (ImageCropModal görsellere özel) — indirilip
  // önbelleklendikten sonra doğrudan slayt olarak ekleniyor. Erişim/hak
  // kontrolü sunucu tarafında (import-video.js) yapılıyor; burada sadece
  // 403 durumunda videoStatus'u tazeleyip kullanıcıya haber veriyoruz.
  async function handlePixabayVideoSlidePick(hit) {
    if (slides.length >= MAX_SLIDES) {
      setError(lang === 'tr' ? `En fazla ${MAX_SLIDES} slayt eklenebilir.` : `You can add up to ${MAX_SLIDES} slides.`)
      return false
    }
    const auth = await authBundle()
    if (!auth) { setError(lang === 'tr' ? 'Giriş yapmalısın.' : 'You need to log in.'); return false }
    setError('')
    try {
      const res = await fetch('/api/pixabay/import-video', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({
          pixabayId: hit.id,
          videoUrl: hit.downloadURL,
          tags: hit.tags,
          pixabayUser: hit.user,
          width: hit.width,
          height: hit.height,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'weekly_video_limit_reached') {
          setVideoStatus((prev) => ({ ...prev, canPickVideo: false, nextAvailableAt: json.nextAvailableAt }))
          setError(lang === 'tr' ? 'Haftalık ücretsiz video hakkın doldu.' : 'Weekly free video pick used up.')
        } else {
          setError(json.error || 'error')
        }
        return false
      }
      await addSlide(json.url)
      if (typeof json.isPremiumMember === 'boolean' && !json.isPremiumMember) {
        setVideoStatus((prev) => ({ ...prev, canPickVideo: false }))
      }
      return true
    } catch {
      setError('network_error')
      return false
    }
  }

  const currentCropItem = cropQueue[cropIndex] || null

  async function handleCropConfirmed(blob) {
    const auth = await authBundle()
    if (!auth) return
    setUploading(true)
    try {
      const url = await uploadToGoalImages(auth.session.user.id, goal.id, blob, 'jpg')
      await addSlide(url)
    } catch (e) {
      setError(e.message || 'upload_error')
    } finally {
      setUploading(false)
      advanceCropQueue()
    }
  }

  // "Kırpmadan Ortala ve Devam Et" — orijinal görsel olduğu gibi eklenir.
  // Görüntüleyicide zaten object-cover ile ekranı dolduruyor, sadece
  // kadrajlama üzerinde kullanıcı kontrolü atlanmış olur.
  async function handleCropSkipped() {
    if (!currentCropItem) return
    setUploading(true)
    try {
      let url = currentCropItem.finalUrl
      if (!url) {
        const auth = await authBundle()
        if (!auth) return
        url = await uploadToGoalImages(auth.session.user.id, goal.id, currentCropItem.file)
      }
      await addSlide(url)
    } catch (e) {
      setError(e.message || 'upload_error')
    } finally {
      setUploading(false)
      advanceCropQueue()
    }
  }

  function advanceCropQueue() {
    setCropIndex((i) => {
      const next = i + 1
      if (next >= cropQueue.length) {
        setCropQueue([])
        return 0
      }
      return next
    })
  }

  async function handleSkipAllRemaining() {
    const auth = await authBundle()
    if (!auth) return
    setUploading(true)
    try {
      for (let i = cropIndex; i < cropQueue.length; i++) {
        const item = cropQueue[i]
        let url = item.finalUrl
        if (!url) url = await uploadToGoalImages(auth.session.user.id, goal.id, item.file)
        await addSlide(url)
      }
    } catch (e) {
      setError(e.message || 'upload_error')
    } finally {
      setUploading(false)
      setCropQueue([])
      setCropIndex(0)
    }
  }

  function handleCropQueueClose() {
    setCropQueue([])
    setCropIndex(0)
  }

  async function updateSlide(slideId, updates) {
    const auth = await authBundle()
    if (!auth) return
    try {
      const res = await fetch('/api/goals/slides/update', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ slideId, ...updates }),
      })
      const json = await res.json()
      if (res.ok && json.slide) {
        setSlides((prev) => prev.map((s) => (s.id === slideId ? json.slide : s)))
      } else {
        setError(json.error || 'error')
      }
    } catch {
      setError('network_error')
    }
  }

  async function removeSlide(slideId) {
    const auth = await authBundle()
    if (!auth) return
    try {
      const res = await fetch('/api/goals/slides/delete', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ slideId }),
      })
      if (res.ok) setSlides((prev) => prev.filter((s) => s.id !== slideId))
    } catch {
      setError('network_error')
    }
  }

  async function persistOrder(nextSlides) {
    setSlides(nextSlides)
    const auth = await authBundle()
    if (!auth) return
    try {
      await fetch('/api/goals/slides/reorder', {
        method: 'POST',
        headers: auth.headers,
        body: JSON.stringify({ goalId: goal.id, orderedSlideIds: nextSlides.map((s) => s.id) }),
      })
    } catch {
      setError('network_error')
    }
  }

  // Sürükle-bırak sıralama — Instagram/TikTok'un klip şeridi gibi, ok
  // butonları yerine doğrudan sürükleyerek yeniden sıralanıyor.
  function handleDragStart(index) {
    dragIndexRef.current = index
  }
  function handleDragOver(e, index) {
    e.preventDefault()
    if (dragOverIndex !== index) setDragOverIndex(index)
  }
  function handleDrop(index) {
    const from = dragIndexRef.current
    dragIndexRef.current = null
    setDragOverIndex(null)
    if (from === null || from === index) return
    const next = [...slides]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    persistOrder(next)
  }

  const unusedImages = existingImages.filter((url) => !slides.some((s) => s.image_url === url))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-white/10 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">
            {lang === 'tr' ? 'Vizyon Slaytları' : 'Vision Slides'}
          </h2>
          <button
            onClick={onClose}
            aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>
        </div>

        {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}

        {loading ? (
          <p className="text-slate-400 text-sm">{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</p>
        ) : (
          <>
            <div className="space-y-2 mb-5">
              {slides.length === 0 && (
                <p className="text-slate-500 text-sm">
                  {lang === 'tr' ? 'Henüz slayt yok. Aşağıdan görsel ekle.' : 'No slides yet. Add images below.'}
                </p>
              )}
              {slides.map((slide, index) => {
                const isVideo = /\/pixabay-video\//.test(slide.image_url) || /\.mp4($|\?)/.test(slide.image_url)
                return (
                  <div
                    key={slide.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null) }}
                    className={`flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border transition-colors ${
                      dragOverIndex === index ? 'border-fuchsia-400/60' : 'border-white/10'
                    }`}
                  >
                    <span className="text-slate-600 cursor-grab active:cursor-grabbing shrink-0" aria-hidden="true">
                      <GripVertical size={16} />
                    </span>

                    {isVideo ? (
                      <video src={slide.image_url} className="w-14 h-14 rounded-lg object-cover shrink-0 bg-black/30" muted />
                    ) : (
                      <img src={slide.image_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-black/30" />
                    )}

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setCaptionEditingSlide(slide)}
                        className="w-full flex items-center gap-1.5 text-left mb-1.5 text-slate-300 hover:text-white"
                      >
                        <Type size={12} className="shrink-0 text-slate-500" />
                        <span className="text-xs truncate">
                          {slide.caption || (lang === 'tr' ? 'Metin ekle...' : 'Add text...')}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] uppercase tracking-widest text-slate-500">
                          {lang === 'tr' ? 'Süre' : 'Duration'}
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={15}
                          defaultValue={slide.duration_seconds}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10)
                            if (val && val !== slide.duration_seconds) {
                              updateSlide(slide.id, { durationSeconds: val })
                            }
                          }}
                          className="w-14 bg-white/5 rounded-md text-slate-200 text-xs px-1.5 py-0.5 outline-none"
                        />
                        <span className="text-[10px] text-slate-500">{lang === 'tr' ? 'sn' : 's'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeSlide(slide.id)}
                      aria-label={lang === 'tr' ? 'Slaytı sil' : 'Delete slide'}
                      className="w-7 h-7 rounded-md bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>

            {unusedImages.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2">
                  {lang === 'tr' ? 'Galerinden Ekle' : 'Add From Gallery'}
                </h3>
                <div
                  className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {unusedImages.map((url) => (
                    <button
                      key={url}
                      onClick={() => addSlide(url)}
                      disabled={slides.length >= MAX_SLIDES}
                      className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-black/30 disabled:opacity-40"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Plus size={16} className="text-white" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <label className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-200 text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 text-center cursor-pointer">
                {uploading
                  ? (lang === 'tr' ? 'Yükleniyor...' : 'Uploading...')
                  : (lang === 'tr' ? 'Cihazdan Yükle' : 'From Device')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploading || slides.length >= MAX_SLIDES}
                  onChange={(e) => { handleUploadFiles(e.target.files); e.target.value = '' }}
                />
              </label>
              <button
                onClick={() => setShowPixabayPicker(true)}
                disabled={slides.length >= MAX_SLIDES}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-200 text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <SearchIcon size={14} />
                {lang === 'tr' ? 'Pixabay' : 'Pixabay'}
              </button>
              <button
                onClick={handleGenerateAiSlide}
                disabled={generatingAi || slides.length >= MAX_SLIDES}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-cyan-300 text-[11px] font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                {generatingAi ? (lang === 'tr' ? 'Üretiliyor...' : 'Generating...') : 'AI'}
              </button>
            </div>
          </>
        )}
      </div>

      {showPixabayPicker && (
        <PixabayPicker
          lang={lang}
          videoStatus={videoStatus}
          onPickImage={handlePixabaySlidePick}
          onPickVideo={handlePixabayVideoSlidePick}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}

      {currentCropItem && (
        <>
          <ImageCropModal
            imageSrc={currentCropItem.previewUrl}
            lang={lang}
            title={cropQueue.length > 1 ? `${lang === 'tr' ? 'Görsel' : 'Image'} ${cropIndex + 1}/${cropQueue.length}` : undefined}
            onCropped={handleCropConfirmed}
            onSkip={handleCropSkipped}
            onClose={handleCropQueueClose}
          />
          {cropQueue.length - cropIndex > 1 && (
            <button
              onClick={handleSkipAllRemaining}
              className="fixed top-7 left-1/2 -translate-x-1/2 z-[130] px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-white text-[11px] font-bold uppercase tracking-widest hover:bg-white/20"
            >
              {lang === 'tr' ? `Kalan ${cropQueue.length - cropIndex} Görseli Kırpmadan Ekle` : `Add Remaining ${cropQueue.length - cropIndex} Without Cropping`}
            </button>
          )}
        </>
      )}

      {captionEditingSlide && (
        <SlideCaptionEditor
          slide={captionEditingSlide}
          imageSrc={captionEditingSlide.image_url}
          lang={lang}
          onClose={() => setCaptionEditingSlide(null)}
          onSave={async (updates) => {
            await updateSlide(captionEditingSlide.id, updates)
            setCaptionEditingSlide(null)
          }}
        />
      )}
    </div>
  )
}
