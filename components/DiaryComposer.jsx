import { useState, useRef, useEffect } from 'react'
import { Upload, X, ImageIcon, Film } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useModalA11y } from '@/lib/useModalA11y'
import { getDiaryText } from '@/lib/diaryTranslations'
import { uploadDiaryMedia, getDiaryUploadErrorMessage } from '@/lib/uploadDiaryMedia'

// CreateGoalModal ile aynı modal kabuğu/gizlilik-seçici deseni; tür seçimi
// HomeFeedFilter'daki AYNI segmentli pill kontrolü (beyaz/siyah aktif durum)
// — homepage'de story satırının hemen altında duran filtreyle görsel
// tutarlılık için bilinçli olarak birebir aynı stil.
//
// Medya, seçilir seçilmez DEĞİL, PAYLAŞ'a basılınca yükleniyor — kullanıcı
// vazgeçip modalı kapatırsa storage'da öksüz dosya kalmasın diye.
const TYPES = [
  { value: 'photo', icon: ImageIcon },
  { value: 'video', icon: Film },
]

export default function DiaryComposer({ lang = 'en', currentUser, onClose, onCreated }) {
  const t = getDiaryText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)
  const fileInputRef = useRef(null)

  const [mediaType, setMediaType] = useState('photo')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState('private')
  const [goalId, setGoalId] = useState('')
  const [myGoals, setMyGoals] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // { phase, percent } | null
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/goals/list?mode=own&status=active', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((json) => { if (active) setMyGoals(json.goals || []) })
        .catch(() => {})
    })
    return () => { active = false }
  }, [])

  // Önizleme URL'ini bellek sızıntısı olmadan temizle.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function handleTypeChange(next) {
    setMediaType(next)
    setFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setError('')
  }

  function handleFileSelect(e) {
    const picked = e.target.files?.[0]
    if (!picked) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(picked)
    setPreviewUrl(URL.createObjectURL(picked))
    setError('')
  }

  async function handleSubmit() {
    if (submitting) return
    setError('')

    if (mediaType === 'text' && !caption.trim()) {
      setError(t.errorNeedsContent)
      return
    }
    if (mediaType !== 'text' && !file) {
      setError(t.errorNeedsContent)
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError(t.errorGeneric); return }

      let mediaUrl = null
      let posterUrl = null
      let resolvedType = mediaType
      if (file) {
        const uploaded = await uploadDiaryMedia({ file, userId: session.user.id, onProgress: setUploadProgress })
        mediaUrl = uploaded.url
        posterUrl = uploaded.posterUrl
        resolvedType = uploaded.mediaType
      }

      setUploadProgress(null)
      const res = await fetch('/api/diary/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: resolvedType,
          mediaUrl,
          posterUrl,
          caption: caption.trim() || null,
          visibility,
          goalId: goalId || null,
        }),
      })
      if (!res.ok) throw new Error('create_failed')

      window.dispatchEvent(new Event('diary-entries-updated'))
      onCreated?.()
    } catch (err) {
      setError(file ? getDiaryUploadErrorMessage(err, lang) : t.errorGeneric)
      setUploadProgress(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.composerTitle}
        className="glass-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-bold text-lg">{t.composerTitle}</h2>
          <button onClick={onClose} aria-label={t.close} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur">
              {TYPES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeChange(opt.value)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    mediaType === opt.value ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <opt.icon size={13} />
                  {opt.value === 'photo' ? t.typePhoto : t.typeVideo}
                </button>
              ))}
              <button
                onClick={() => handleTypeChange('text')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  mediaType === 'text' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.typeText}
              </button>
            </div>
          </div>

          {mediaType !== 'text' ? (
            <div>
              {previewUrl ? (
                <div className="relative aspect-[9/16] max-h-64 mx-auto rounded-xl overflow-hidden bg-black/30">
                  {mediaType === 'video' ? (
                    <video src={previewUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                  ) : (
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold hover:bg-black/90"
                  >
                    {t.changeFile}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-xl bg-white/5 border border-dashed border-white/15 text-slate-300 text-sm font-semibold hover:bg-white/10"
                >
                  <Upload size={20} />
                  {t.chooseFile}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : null}

          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={mediaType === 'text' ? t.textPlaceholder : t.captionPlaceholder}
              rows={mediaType === 'text' ? 4 : 2}
              maxLength={1000}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.visibilityLabel}</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-primary-500/50"
              >
                <option value="private" className="bg-black">{t.visibilityPrivate}</option>
                <option value="friends" className="bg-black">{t.visibilityFriends}</option>
                <option value="public" className="bg-black">{t.visibilityPublic}</option>
              </select>
            </div>

            {myGoals.length > 0 && (
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-400 mb-1.5 block">{t.linkGoalLabel}</label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand-primary-500/50"
                >
                  <option value="" className="bg-black">{t.linkGoalNone}</option>
                  {myGoals.map((g) => (
                    <option key={g.id} value={g.id} className="bg-black">{g.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && <p className="text-semantic-danger-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="relative w-full py-3 rounded-xl bg-gradient-to-r from-brand-primary-500 to-brand-accent-500 text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 disabled:opacity-40 transition-all overflow-hidden"
          >
            {uploadProgress?.phase === 'uploading' && (
              <span
                className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-150 ease-linear"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            )}
            <span className="relative">
              {uploadProgress?.phase === 'compressing'
                ? t.compressing
                : uploadProgress?.phase === 'uploading'
                ? t.uploadingPercent(uploadProgress.percent)
                : submitting
                ? t.posting
                : t.postBtn}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
