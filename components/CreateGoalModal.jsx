import { useState, useRef } from 'react'
import { Sparkles, Upload, X, Search as SearchIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'
import PixabayPicker from './PixabayPicker'

export default function CreateGoalModal({ lang = 'en', onClose, onCreated }) {
  const t = getVisionBoardText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [roadmapInput, setRoadmapInput] = useState('')
  const [roadmap, setRoadmap] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // KAPAK GÖRSELİ — önceden bu modalda hiç yoktu, oluşturma sırasında
  // görsel eklemenin tek yolu YOKTU (sadece oluşturduktan sonra
  // GoalDetailModal'da AI üretimi vardı, elle yükleme hiçbir yerde yoktu).
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverImageSource, setCoverImageSource] = useState('ai_generated')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  // AI ile üretilirken kapak dışında kalan ekstra görseller — goal
  // oluşturulduğunda kapakla birlikte otomatik olarak başlangıç slaytı
  // yapılıyor (bkz. handleSubmit).
  const [aiSlideImages, setAiSlideImages] = useState([])
  const fileInputRef = useRef(null)

  function addRoadmapStep() {
    const clean = roadmapInput.trim()
    if (!clean) return
    setRoadmap((r) => [...r, clean])
    setRoadmapInput('')
  }

  function removeStep(index) {
    setRoadmap((r) => r.filter((_, i) => i !== index))
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setCoverError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverError(t.loginRequired); return }

      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('goal-covers')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('goal-covers').getPublicUrl(filePath)
      setCoverImageUrl(data.publicUrl)
      setCoverImageSource('user_upload')
      setAiSlideImages([])
    } catch (err) {
      setCoverError(t.coverUploadFailed)
    } finally {
      setUploadingCover(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // AI artık tek bir kapak değil, küçük bir başlangıç SLAYT destesi üretiyor
  // (bkz. pages/api/goals/generate-cover.js — goalId yokken images[] döner).
  // İlk görsel kapak olarak kullanılıyor, kalanı goal oluşunca otomatik
  // slayt olarak ekleniyor (handleSubmit).
  async function handleGenerateCover() {
    const cleanTitle = title.trim()
    if (!cleanTitle) { setCoverError(t.coverNeedsTitle); return }

    setGeneratingCover(true)
    setCoverError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverError(t.loginRequired); return }

      const res = await fetch('/api/goals/generate-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        // NOT: goalId göndermiyoruz — hedef henüz yok (form dolduruluyor).
        // API bunu görünce görselleri üretip URL'lerini döndürüyor, hiçbir
        // hedefe kaydetmiyor (bkz. pages/api/goals/generate-cover.js).
        body: JSON.stringify({ title: cleanTitle, description: description.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'insufficient_auras') setCoverError(t.coverInsufficientCredits)
        else if (json.error === 'image_generation_failed') setCoverError(t.coverGenerationFailed)
        else setCoverError(json.error || 'error')
        return
      }
      const images = json.images || []
      if (images.length === 0) { setCoverError(t.coverGenerationFailed); return }
      setCoverImageUrl(images[0])
      setAiSlideImages(images.slice(1))
      setCoverImageSource('ai_generated')
    } catch (err) {
      setCoverError('network_error')
    } finally {
      setGeneratingCover(false)
    }
  }

  // Pixabay picker'da bir görsele tıklandığında çağrılır. Henüz bir goal
  // yok, o yüzden goal-bağımsız import endpoint'ini kullanıyoruz — sadece
  // indirip kendi storage'ımıza kaydediyor, hiçbir goal'a bağlamıyor.
  async function handleCoverPixabayPick(hit) {
    setCoverError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverError(t.loginRequired); return false }

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
      if (!res.ok) { setCoverError(json.error || 'error'); return false }
      setCoverImageUrl(json.url)
      setCoverImageSource('pixabay')
      setAiSlideImages([])
      return true
    } catch (err) {
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
          cover_image_source: coverImageUrl ? coverImageSource : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'error')
        return
      }

      // VİZYON EKLENDİĞİNDE SLAYTLAR OTOMATİK OLUŞTURULSUN — AI kullanıldıysa
      // kapak + tüm ekstra üretilen görseller; değilse (yükleme/Pixabay) tek
      // kapak görseli, başlangıç slaytı olarak ekleniyor. Kullanıcı sonra
      // Vizyon Slaytları ekranından (SlideEditor) düzenleyebiliyor.
      const initialSlideUrls = coverImageSource === 'ai_generated' && aiSlideImages.length > 0
        ? [coverImageUrl, ...aiSlideImages]
        : (coverImageUrl ? [coverImageUrl] : [])

      for (const url of initialSlideUrls) {
        try {
          await fetch('/api/goals/slides/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ goalId: json.goal.id, imageUrl: url }),
          })
        } catch (_) {
          // Bir slayt oluşturma başarısız olsa bile goal zaten oluşturuldu —
          // akışı durdurmuyoruz, kullanıcı SlideEditor'dan elle ekleyebilir.
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
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.coverLabel}</label>

            {coverImageUrl ? (
              <div className="mb-2">
                <div className="relative rounded-xl overflow-hidden aspect-[3/2]">
                  <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setCoverImageUrl(''); setAiSlideImages([]); setCoverError('') }}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs hover:bg-black/90"
                  >
                    <X size={12} /> {t.removeCoverBtn}
                  </button>
                  {coverImageSource === 'ai_generated' && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-semibold uppercase tracking-widest">
                      {lang === 'tr' ? 'Kapak' : 'Cover'}
                    </span>
                  )}
                </div>
                {aiSlideImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                      {lang === 'tr' ? `+${aiSlideImages.length} başlangıç slaytı` : `+${aiSlideImages.length} starter slides`}
                    </p>
                    <div className="flex gap-1.5">
                      {aiSlideImages.map((url, i) => (
                        <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden bg-black/30 shrink-0">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAiSlideImages((prev) => prev.filter((_, idx) => idx !== i))}
                            aria-label={lang === 'tr' ? 'Kaldır' : 'Remove'}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center"
                          >
                            <X size={9} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 mb-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCover || generatingCover}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <Upload size={14} />
                  {uploadingCover ? t.uploading : t.uploadBtn}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleGenerateCover}
                  disabled={uploadingCover || generatingCover}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <Sparkles size={14} />
                  {generatingCover ? t.generatingCoverBtn : t.generateAiBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPixabayPicker(true)}
                  disabled={uploadingCover || generatingCover}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-fuchsia-300 text-[10px] font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <SearchIcon size={14} />
                  {lang === 'tr' ? 'Pixabay' : 'Pixabay'}
                </button>
              </div>
            )}
            {!coverImageUrl && (
              <p className="text-slate-500 text-[10px] mt-1">
                {lang === 'tr'
                  ? 'AI ile Oluştur, kapak + birkaç başlangıç slaytı birlikte üretir.'
                  : 'Generate with AI creates a cover plus a few starter slides.'}
              </p>
            )}
            {coverError && <p className="text-rose-400 text-xs mt-1">{coverError}</p>}
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.descriptionLabel}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              maxLength={2000}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.targetDateLabel}</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500/50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.visibilityLabel}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-fuchsia-500/50"
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
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500/50"
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
                    <button onClick={() => removeStep(i)} className="text-slate-500 hover:text-rose-400 ml-2"><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-rose-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-500 text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {submitting ? t.creating : t.createSubmitBtn}
          </button>
        </div>
      </div>

      {showPixabayPicker && (
        <PixabayPicker
          lang={lang}
          videoEnabled={false}
          onPickImage={handleCoverPixabayPick}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
    </div>
  )
}
