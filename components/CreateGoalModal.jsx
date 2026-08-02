import { useState, useRef } from 'react'
import { Upload, X, Search as SearchIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'
import { hasFutureTenseLanguage, affirmationExamples } from '@/lib/affirmationLanguage'
import PixabayPicker from './PixabayPicker'

// Bir vizyon oluştururken en fazla kaç görsel (kapak + başlangıç slaytları)
// seçilebilir. SlideEditor'daki genel MAX_SLIDES=20 sınırının altında
// tutuyoruz — oluşturma ekranı hızlı kalsın, kullanıcı isterse sonradan
// Vizyon Slaytları ekranından daha fazla ekleyebilir.
const MAX_COVER_IMAGES = 10

export default function CreateGoalModal({ lang = 'en', onClose, onCreated }) {
  const t = getVisionBoardText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)
  const [title, setTitle] = useState('')
  const [dismissedTenseHint, setDismissedTenseHint] = useState(false)
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [roadmapInput, setRoadmapInput] = useState('')
  const [roadmap, setRoadmap] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // GÖRSELLER — birden fazla seçilebilir. images[0] "kapak" (goal'ün
  // cover_image_url'i) olarak kullanılıyor; seçilen TÜM görseller (kapak
  // dahil) oluşturma sonrasında sırasıyla başlangıç slaytı olarak da
  // ekleniyor (bkz. handleSubmit). Önceden burada sadece TEK bir görsel
  // seçilebiliyordu.
  const [images, setImages] = useState([]) // [{ url, source: 'user_upload' | 'pixabay' }]
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const fileInputRef = useRef(null)

  const remainingSlots = Math.max(0, MAX_COVER_IMAGES - images.length)

  function addRoadmapStep() {
    const clean = roadmapInput.trim()
    if (!clean) return
    setRoadmap((r) => [...r, clean])
    setRoadmapInput('')
  }

  function removeStep(index) {
    setRoadmap((r) => r.filter((_, i) => i !== index))
  }

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setCoverError('')
  }

  // Cihazdan seçilen TÜM dosyaları (input artık multiple) sırayla storage'a
  // yükler. Tek bir dosya başarısız olursa diğerlerini durdurmuyoruz.
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type?.startsWith('image/'))
    if (!files.length) return
    if (remainingSlots <= 0) {
      setCoverError(lang === 'tr' ? `En fazla ${MAX_COVER_IMAGES} görsel seçebilirsin.` : `You can select up to ${MAX_COVER_IMAGES} images.`)
      return
    }

    setUploadingCover(true)
    setCoverError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverError(t.loginRequired); return }

      const toUpload = files.slice(0, remainingSlots)
      const uploaded = []
      for (const file of toUpload) {
        try {
          const fileExt = file.name.split('.').pop() || 'jpg'
          const filePath = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('goal-covers')
            .upload(filePath, file, { cacheControl: '3600', upsert: true })
          if (uploadError) throw uploadError
          const { data } = supabase.storage.from('goal-covers').getPublicUrl(filePath)
          uploaded.push({ url: data.publicUrl, source: 'user_upload' })
        } catch (_) {
          // bu dosya başarısız oldu, diğerlerine devam
        }
      }

      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded])
      }
      if (uploaded.length < toUpload.length) {
        setCoverError(t.coverUploadFailed)
      }
    } finally {
      setUploadingCover(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Pixabay picker'da birden fazla görsel işaretlenip onaylandığında çağrılır.
  // Henüz bir goal yok, o yüzden goal-bağımsız import endpoint'ini
  // kullanıyoruz — sadece indirip kendi storage'ımıza kaydediyor, hiçbir
  // goal'a bağlamıyor. Görseller paralel indirilir (import-image endpoint'i
  // bir sayaç/sıra tutmuyor, yalnızca önbelleğe alıp URL döndürüyor —
  // paralel çağırmak güvenli).
  async function handleCoverPixabayMultiPick(picked) {
    setCoverError('')
    if (remainingSlots <= 0) return false
    const toImport = picked.slice(0, remainingSlots)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverError(t.loginRequired); return false }

      const results = await Promise.all(toImport.map(async (hit) => {
        try {
          const res = await fetch('/api/pixabay/import-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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
          if (!res.ok) return null
          return { url: json.url, source: 'pixabay' }
        } catch (_) {
          return null
        }
      }))

      const ok = results.filter(Boolean)
      if (ok.length) setImages((prev) => [...prev, ...ok])
      if (ok.length < toImport.length) {
        setCoverError(lang === 'tr' ? 'Bazı görseller eklenemedi.' : 'Some images could not be added.')
      }
      return ok.length > 0
    } catch (_) {
      setCoverError('network_error')
      return false
    }
  }

  async function handleSubmit() {
    const cleanTitle = title.trim()
    if (!cleanTitle || submitting) return

    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError(t.loginRequired)
        return
      }

      const coverImageUrl = images[0]?.url || ''

      const res = await fetch('/api/goals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: cleanTitle,
          description: description.trim() || null,
          target_date: targetDate || null,
          visibility,
          roadmap,
          cover_image_url: coverImageUrl || null,
          cover_image_source: coverImageUrl ? images[0].source : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'error')
        return
      }

      // VİZYON EKLENDİĞİNDE SLAYTLAR OTOMATİK OLUŞTURULSUN — seçilen TÜM
      // görseller (kapak dahil) başlangıç slaytı olarak da ekleniyor.
      // /api/goals/slides/create, order_index'i "mevcut slayt sayısı"na
      // bakarak hesaplıyor; bu yüzden isteklerin SIRAYLA (paralel değil)
      // gönderilmesi gerekiyor — yoksa yarış durumu (TOCTOU) yüzünden
      // birden fazla slayt aynı order_index'i alabilir ya da MAX_SLIDES
      // sınırı yanlış hesaplanabilir.
      if (images.length) {
        for (const img of images) {
          try {
            await fetch('/api/goals/slides/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ goalId: json.goal.id, imageUrl: img.url }),
            })
          } catch (_) {
            // Bir slaytın oluşturulması başarısız olsa bile goal zaten
            // oluşturuldu — akışı durdurmuyoruz, kullanıcı SlideEditor'dan
            // elle ekleyebilir.
          }
        }
      }

      onCreated?.(json.goal)
      onClose?.()
    } catch (err) {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label={t.createModalTitle} className="glass-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">{t.createModalTitle}</h2>
          <button onClick={onClose} aria-label={lang === 'tr' ? 'Kapat' : 'Close'} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.titleLabel}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePlaceholder}
              maxLength={120}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary-500/50"
            />
            {!dismissedTenseHint && hasFutureTenseLanguage(title, lang) && (
              <div className="mt-1.5 flex items-start gap-2 bg-brand-primary-500/5 border border-brand-primary-500/15 rounded-lg px-3 py-2">
                <p className="flex-1 text-[11px] text-brand-primary-200/90 leading-snug">
                  {t.titleTenseHint}{' '}
                  <span className="text-slate-400">
                    {(affirmationExamples[lang] || affirmationExamples.en)[0].future} → <span className="text-brand-primary-300">{(affirmationExamples[lang] || affirmationExamples.en)[0].present}</span>
                  </span>
                </p>
                <button type="button" onClick={() => setDismissedTenseHint(true)} className="text-brand-primary-300/60 hover:text-brand-primary-200 shrink-0">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">
              {t.coverLabel}
              {images.length > 0 && (
                <span className="normal-case tracking-normal text-slate-500"> · {images.length}/{MAX_COVER_IMAGES}</span>
              )}
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {images.map((img, i) => (
                  <div key={img.url} className="relative aspect-square rounded-lg overflow-hidden bg-black/30">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-black/70 text-[9px] text-brand-primary-300 font-bold uppercase tracking-wide">
                        {lang === 'tr' ? 'Kapak' : 'Cover'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={lang === 'tr' ? 'Görseli kaldır' : 'Remove image'}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {remainingSlots > 0 && (
              <div className="flex gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <Upload size={14} />
                  {uploadingCover
                    ? t.uploading
                    : (images.length > 0 ? (lang === 'tr' ? 'Daha Fazla Ekle' : 'Add More') : t.uploadBtn)}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPixabayPicker(true)}
                  disabled={uploadingCover}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-brand-primary-300 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <SearchIcon size={14} />
                  {lang === 'tr' ? 'Pixabay\u2019dan Seç' : 'From Pixabay'}
                </button>
              </div>
            )}
            {images.length > 0 && (
              <p className="text-slate-500 text-[11px] mt-1">
                {lang === 'tr'
                  ? 'İlk görsel kapak olur, seçtiğin tüm görseller başlangıç slaytı olarak da eklenir.'
                  : 'The first image becomes the cover; every selected image is also added as a starting slide.'}
              </p>
            )}
            {coverError && <p className="text-semantic-danger-400 text-xs mt-1">{coverError}</p>}
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.descriptionLabel}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              maxLength={2000}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.targetDateLabel}</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-primary-500/50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.visibilityLabel}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-primary-500/50"
              >
                <option value="public" className="bg-black">{t.visibilityPublic}</option>
                <option value="friends" className="bg-black">{t.visibilityFriends}</option>
                <option value="private" className="bg-black">{t.visibilityPrivate}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.roadmapLabel}</label>
            <div className="flex gap-2">
              <input
                value={roadmapInput}
                onChange={(e) => setRoadmapInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoadmapStep() } }}
                placeholder={t.roadmapPlaceholder}
                maxLength={200}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary-500/50"
              />
              <button
                onClick={addRoadmapStep}
                type="button"
                className="px-4 rounded-xl bg-white/10 text-white hover:bg-white/20"
              >
                +
              </button>
            </div>
            {roadmap.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {roadmap.map((step, i) => (
                  <li key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5 text-sm text-slate-300">
                    <span className="truncate">{step}</span>
                    <button onClick={() => removeStep(i)} className="text-slate-500 hover:text-semantic-danger-400 ml-2"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-semantic-danger-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {submitting ? t.creating : t.createSubmitBtn}
          </button>
        </div>
      </div>

      {showPixabayPicker && (
        <PixabayPicker
          lang={lang}
          videoEnabled={false}
          multiple
          maxSelectable={remainingSlots}
          onPickMultiple={handleCoverPixabayMultiPick}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
    </div>
  )
}
