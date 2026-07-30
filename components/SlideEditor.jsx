import { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, ArrowUp, ArrowDown, Search as SearchIcon, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import PixabayPicker from './PixabayPicker'

const MAX_SLIDES = 20

async function authBundle() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return {
    session,
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  }
}

// "Vizyon Slaytları" — hedefin galerisinden/cihazdan seçilen görsellerin
// sıralı, başlıklı (niyet notu) ve süreli bir diziye dönüştürüldüğü editör.
// Sadece hedef sahibi açabilir; oynatıcı (viewer) ayrı bir bileşendir.
export default function SlideEditor({ goal, lang = 'en', onClose }) {
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)

  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [generatingAi, setGeneratingAi] = useState(false)

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

  async function handlePixabaySlidePick(hit) {
    if (slides.length >= MAX_SLIDES) {
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
      await addSlide(json.url)
      return true
    } catch {
      setError('network_error')
      return false
    }
  }

  // Her tıklamada TEK bir görsel üretir ve doğrudan slayt olarak ekler
  // (bkz. /api/goals/generate-slide-image.js — kapak alanına dokunmuyor).
  // Tekrar tekrar çağrılabilir, her seferinde farklı bir görsel üretir.
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

  async function handleUploadFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'))
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const auth = await authBundle()
      if (!auth) { setError(lang === 'tr' ? 'Giriş yapmalısın.' : 'You need to log in.'); return }

      for (const file of files) {
        if (slides.length >= MAX_SLIDES) break
        const fileExt = file.name.split('.').pop() || 'jpg'
        const filePath = `${auth.session.user.id}/${goal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('goal-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })
        if (uploadError) { setError(uploadError.message || 'upload_error'); continue }

        const { data: publicData } = supabase.storage.from('goal-images').getPublicUrl(filePath)
        if (publicData?.publicUrl) await addSlide(publicData.publicUrl)
      }
    } catch {
      setError('network_error')
    } finally {
      setUploading(false)
    }
  }

  async function updateSlide(slideId, updates) {
    const auth = await authBundle()
    if (!auth) return
    setSavingId(slideId)
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
    } finally {
      setSavingId(null)
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

  function moveSlide(index, direction) {
    const next = [...slides]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
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
              {slides.map((slide, index) => (
                <div key={slide.id} className="flex gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                  <img
                    src={slide.image_url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0 bg-black/30"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      defaultValue={slide.caption || ''}
                      placeholder={lang === 'tr' ? 'Niyet / başlık (opsiyonel)' : 'Intention / caption (optional)'}
                      maxLength={200}
                      onBlur={(e) => {
                        if (e.target.value !== (slide.caption || '')) {
                          updateSlide(slide.id, { caption: e.target.value })
                        }
                      }}
                      className="w-full bg-transparent text-slate-200 text-sm placeholder-slate-500 border-b border-white/10 focus:border-fuchsia-400/50 outline-none pb-1 mb-1.5"
                    />
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
                      {savingId === slide.id && (
                        <span className="text-[10px] text-slate-500">
                          {lang === 'tr' ? 'kaydediliyor...' : 'saving...'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-between shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        aria-label={lang === 'tr' ? 'Yukarı taşı' : 'Move up'}
                        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-slate-300"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === slides.length - 1}
                        aria-label={lang === 'tr' ? 'Aşağı taşı' : 'Move down'}
                        className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-slate-300"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeSlide(slide.id)}
                      aria-label={lang === 'tr' ? 'Slaytı sil' : 'Delete slide'}
                      className="w-6 h-6 rounded-md bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
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
          videoEnabled={false}
          onPickImage={handlePixabaySlidePick}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
    </div>
  )
}
