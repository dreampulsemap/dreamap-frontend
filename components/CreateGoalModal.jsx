import { useState, useRef, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'
import { hasFutureTenseLanguage, affirmationExamples } from '@/lib/affirmationLanguage'
import PixabayPicker from './PixabayPicker'
import AddMediaMenu from './AddMediaMenu'
import VisionVideoEditor from './VisionVideoEditor'
import CoverPickerModal from './CoverPickerModal'

// Vizyon oluşturma artık video editörüyle AYNI medya seçim akışını kullanıyor
// (cihazdan video/görsel + Pixabay çoklu seçim) — önceden burada sadece
// "kapak" seçiliyordu ve seçilenler eski slayt sistemine ekleniyordu.
// Şimdi: medya seç -> goal oluştur -> seçilenler otomatik olarak yeni
// goal'ün video editörüne klip olarak düşer (initialMedia) -> kaydedince ya
// da vazgeçince, videoya eklenen GÖRSELLER arasından kapak seçilir
// (CoverPickerModal, ayrı ve opsiyonel bir son adım).
//
// Cihazdan seçilen dosyalar burada YÜKLENMİYOR — blob: URL olarak
// pendingMedia'da bekliyor, video editörü onları normal cihaz-klipleri gibi
// kabul ediyor (aynen editör içindeki "+ Ekle" ile aynı). Sadece export
// sırasında BİRLEŞTİRİLMİŞ video yükleniyor — tek tek her klibi önceden
// storage'a atmaya gerek yok. Pixabay'den seçilenler ise zaten
// goal-bağımsız import endpoint'leriyle indirilip kalıcı URL olarak geliyor.

export default function CreateGoalModal({ lang = 'en', onClose, onCreated }) {
  const t = getVisionBoardText(lang)
  const modalRef = useRef(null)
  const [step, setStep] = useState('form') // 'form' | 'video' | 'cover'
  const [createdGoal, setCreatedGoal] = useState(null)

  const [title, setTitle] = useState('')
  const [dismissedTenseHint, setDismissedTenseHint] = useState(false)
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [visibility, setVisibility] = useState('public')
  // Kullanıcının profil gizliliği (public/friends/private) — paylaşım
  // gizliliği seçenekleri buna göre kısıtlanır. Yüklenene kadar en
  // kısıtlayıcı varsayımla ('private') başlıyoruz.
  const [profileVisibility, setProfileVisibility] = useState('private')
  const [roadmapInput, setRoadmapInput] = useState('')
  const [roadmap, setRoadmap] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // MEDYA — [{ url, type: 'image'|'video', name, source: 'user_upload'|'pixabay' }]
  const [pendingMedia, setPendingMedia] = useState([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [videoStatus, setVideoStatus] = useState(null)
  const [mediaError, setMediaError] = useState('')
  const videoInputRef = useRef(null)
  const imageInputRef = useRef(null)

  useModalA11y(modalRef, onClose)

  // Profil gizliliğini çek — paylaşım gizliliği seçenekleri buna göre
  // kısıtlanır (bkz. VALID_VISIBILITY / clampVisibilityToProfile backend
  // tarafında, DB trigger'ı zaten nihai güvence).
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return
      supabase
        .from('user_profiles')
        .select('profile_visibility')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data?.profile_visibility) setProfileVisibility(data.profile_visibility)
        })
    })
    return () => { active = false }
  }, [])

  const allowedVisibilityOptions =
    profileVisibility === 'private' ? ['private']
    : profileVisibility === 'friends' ? ['friends', 'private']
    : ['public', 'friends', 'private']

  // Profil yüklendikten sonra, o an seçili değer artık izin verilmiyorsa
  // (örn. varsayılan 'public' ama profil 'friends' çıktı) otomatik düşür.
  useEffect(() => {
    if (!allowedVisibilityOptions.includes(visibility)) {
      setVisibility(allowedVisibilityOptions[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileVisibility])

  // PixabayPicker'ın video sekmesindeki kilit/haftalık-hak UI'ı için —
  // VisionVideoEditor'daki aynı fetch (bkz. o dosyadaki aynı yorum).
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !active) return
      fetch('/api/user/premium-status', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((r) => r.json())
        .then((json) => { if (active && !json.error) setVideoStatus(json) })
        .catch(() => {})
    })
    return () => { active = false }
  }, [])

  function addRoadmapStep() {
    const clean = roadmapInput.trim()
    if (!clean) return
    setRoadmap((r) => [...r, clean])
    setRoadmapInput('')
  }

  function removeStep(index) {
    setRoadmap((r) => r.filter((_, i) => i !== index))
  }

  function removeMedia(index) {
    setPendingMedia((prev) => prev.filter((_, i) => i !== index))
  }

  function onVideoFileChange(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type?.startsWith('video/'))
    files.forEach((file) => {
      setPendingMedia((prev) => [...prev, { url: URL.createObjectURL(file), type: 'video', name: file.name, source: 'user_upload' }])
    })
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  function onImageFileChange(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type?.startsWith('image/'))
    files.forEach((file) => {
      setPendingMedia((prev) => [...prev, { url: URL.createObjectURL(file), type: 'image', name: file.name, source: 'user_upload' }])
    })
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function pixabayAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
  }

  // Bu ikisi PixabayPicker'ın multiSelect sözleşmesiyle birebir aynı
  // (VisionVideoEditor'daki handlePixabayImagePick/VideoPick ile aynı desen)
  // — goal-bağımsız import endpoint'lerini kullanıyor, henüz bir goal yok.
  async function handlePixabayImagePick(hit) {
    const headers = await pixabayAuthHeaders()
    if (!headers) { setMediaError(t.loginRequired); return false }
    try {
      const res = await fetch('/api/pixabay/import-image', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pixabayId: hit.id, imageUrl: hit.largeImageURL, tags: hit.tags, pixabayUser: hit.user, width: hit.width, height: hit.height }),
      })
      const json = await res.json()
      if (!res.ok) { setMediaError(json.error || (lang === 'tr' ? 'Görsel eklenemedi' : 'Could not add image')); return false }
      setPendingMedia((prev) => [...prev, { url: json.url, type: 'image', name: (hit.tags && hit.tags[0]) || 'Pixabay', source: 'pixabay' }])
      return true
    } catch (_) {
      setMediaError(lang === 'tr' ? 'Ağ hatası' : 'Network error')
      return false
    }
  }

  async function handlePixabayVideoPick(hit) {
    const headers = await pixabayAuthHeaders()
    if (!headers) { setMediaError(t.loginRequired); return false }
    try {
      const res = await fetch('/api/pixabay/import-video', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pixabayId: hit.id, videoUrl: hit.downloadURL, tags: hit.tags, pixabayUser: hit.user, width: hit.width, height: hit.height }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMediaError(json.error === 'weekly_video_limit_reached'
          ? (lang === 'tr' ? 'Haftalık ücretsiz video hakkın doldu.' : 'Weekly free video pick used up.')
          : (json.error || (lang === 'tr' ? 'Video eklenemedi' : 'Could not add video')))
        return false
      }
      setPendingMedia((prev) => [...prev, { url: json.url, type: 'video', name: (hit.tags && hit.tags[0]) || 'Pixabay', source: 'pixabay' }])
      return true
    } catch (_) {
      setMediaError(lang === 'tr' ? 'Ağ hatası' : 'Network error')
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
          cover_image_url: null,
          cover_image_source: undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'error')
        return
      }

      setCreatedGoal(json.goal)
      if (pendingMedia.length) {
        setStep('video')
      } else {
        finish(json.goal)
      }
    } catch (err) {
      setError('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  function finish(goal) {
    onCreated?.(goal)
    onClose?.()
  }

  // Video kaydedilince goal'ün en güncel halini (vision_video_url dahil)
  // tutuyoruz ama adımı DEĞİŞTİRMİYORUZ — kullanıcı "Kaydedildi!" ekranını
  // görsün, ne zaman devam edeceğine kendi karar versin (X'e basınca aşağı).
  function handleVideoChanged(updatedGoal) {
    setCreatedGoal(updatedGoal)
  }

  function handleVideoClose() {
    const imageOptions = pendingMedia.filter((m) => m.type === 'image')
    if (imageOptions.length === 0) {
      finish(createdGoal)
    } else {
      setStep('cover')
    }
  }

  function handleCoverDone(updatedGoal) {
    finish(updatedGoal || createdGoal)
  }

  if (step === 'video' && createdGoal) {
    return (
      <VisionVideoEditor
        goal={createdGoal}
        lang={lang}
        initialMedia={pendingMedia}
        onClose={handleVideoClose}
        onChanged={handleVideoChanged}
      />
    )
  }

  if (step === 'cover' && createdGoal) {
    return (
      <CoverPickerModal
        lang={lang}
        goalId={createdGoal.id}
        images={pendingMedia.filter((m) => m.type === 'image').map((m) => ({ url: m.url, source: m.source, name: m.name }))}
        onDone={handleCoverDone}
      />
    )
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
              {lang === 'tr' ? 'Görsel & Video' : 'Photos & Video'}
              {pendingMedia.length > 0 && (
                <span className="normal-case tracking-normal text-slate-500"> · {pendingMedia.length}</span>
              )}
            </label>

            {pendingMedia.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {pendingMedia.map((m, i) => (
                  <div key={m.url} className="relative aspect-square rounded-lg overflow-hidden bg-black/30">
                    {m.type === 'video' ? (
                      <video src={m.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      aria-label={lang === 'tr' ? 'Kaldır' : 'Remove'}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddMenu(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10"
            >
              <Upload size={14} />
              {pendingMedia.length > 0 ? (lang === 'tr' ? 'Daha Fazla Ekle' : 'Add More') : (lang === 'tr' ? '+ Görsel / Video Ekle' : '+ Add Photos / Video')}
            </button>
            <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={onVideoFileChange} className="hidden" />
            <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={onImageFileChange} className="hidden" />

            {pendingMedia.length > 0 && (
              <p className="text-slate-500 text-[11px] mt-1">
                {lang === 'tr'
                  ? 'Bunlardan otomatik bir vizyon videosu oluşturulur; kapak fotoğrafını sonra bunların arasından seçersin.'
                  : "These automatically become your vision video; you'll pick a cover photo from among them afterward."}
              </p>
            )}
            {mediaError && <p className="text-semantic-danger-400 text-xs mt-1">{mediaError}</p>}
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
                {allowedVisibilityOptions.includes('public') && (
                  <option value="public" className="bg-black">{t.visibilityPublic}</option>
                )}
                {allowedVisibilityOptions.includes('friends') && (
                  <option value="friends" className="bg-black">{t.visibilityFriends}</option>
                )}
                <option value="private" className="bg-black">{t.visibilityPrivate}</option>
              </select>
              {profileVisibility === 'private' && (
                <p className="text-[10px] text-slate-400 mt-1">{t.visibilityLockedPrivateNote}</p>
              )}
              {profileVisibility === 'friends' && (
                <p className="text-[10px] text-slate-400 mt-1">{t.visibilityRestrictedFriendsNote}</p>
              )}
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

      {showAddMenu && (
        <AddMediaMenu
          lang={lang}
          onPickVideo={() => { setShowAddMenu(false); videoInputRef.current?.click() }}
          onPickImage={() => { setShowAddMenu(false); imageInputRef.current?.click() }}
          onPickPixabay={() => { setShowAddMenu(false); setShowPixabayPicker(true) }}
          onClose={() => setShowAddMenu(false)}
        />
      )}

      {showPixabayPicker && (
        <PixabayPicker
          lang={lang}
          videoStatus={videoStatus}
          multiSelect
          onPickImage={handlePixabayImagePick}
          onPickVideo={handlePixabayVideoPick}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
    </div>
  )
}
