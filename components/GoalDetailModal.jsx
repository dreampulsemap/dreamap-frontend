import { useState, useEffect, useRef } from 'react'
import { X, Check, MessageCircle, Trash2, ArrowUp, Image as ImageIcon, Sparkles as SparklesIcon, Search as SearchIcon, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getVisionBoardText } from '@/lib/visionBoardTranslations'
import { useModalA11y } from '@/lib/useModalA11y'
import { getDailyPractice, getPracticeDoneKey } from '@/lib/dailyPractices'
import VisionVideoEditor from './VisionVideoEditor'
import VisionVideoPlayer from './VisionVideoPlayer'
import SlidesViewer from './SlidesViewer'
import PixabayPicker from './PixabayPicker'
import AuthorHeader from './AuthorHeader'

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
}

export default function GoalDetailModal({ goal: initialGoal, lang = 'en', currentUserId, onClose, onChanged, onDeleted }) {
  const t = getVisionBoardText(lang)
  const modalRef = useRef(null)
  useModalA11y(modalRef, onClose)
  const [goal, setGoal] = useState(initialGoal)
  const [microGoals, setMicroGoals] = useState(initialGoal.micro_goals || [])
  const [newStep, setNewStep] = useState('')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [resolveMode, setResolveMode] = useState(null) // 'completed' | 'abandoned' | null
  const [story, setStory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [generatingCover, setGeneratingCover] = useState(false)
  const [coverError, setCoverError] = useState('')
  const [galleryImages, setGalleryImages] = useState(initialGoal.gallery_image_urls || [])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [galleryError, setGalleryError] = useState('')
  const [showVisionVideoEditor, setShowVisionVideoEditor] = useState(false)
  const [showVisionVideoPlayer, setShowVisionVideoPlayer] = useState(false)
  const [showSlidesViewer, setShowSlidesViewer] = useState(false)
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [videoStatus, setVideoStatus] = useState(null)

  const AURA_COST = 2  // generate-cover.js ile aynı maliyet

  const isOwner = currentUserId && goal.user_id === currentUserId

  // GÜNLÜK PRATİK — her gün hedefe küçük bir adım attıran eğlenceli
  // manifestation/oyun/alıştırma. Sadece aktif hedeflerde ve sahibi için
  // anlamlı (başkasının hedefinde "bugünkü pratiğini yap" demek garip olur).
  const dailyPractice = getDailyPractice(goal.id, lang === 'tr' ? 'tr' : 'en')
  const practiceDoneKey = getPracticeDoneKey(goal.id, dailyPractice.dateKey)
  const [practiceDone, setPracticeDone] = useState(false)
  useEffect(() => {
    try {
      setPracticeDone(window.localStorage.getItem(practiceDoneKey) === '1')
    } catch (_) {}
  }, [practiceDoneKey])
  function togglePracticeDone() {
    const next = !practiceDone
    setPracticeDone(next)
    try {
      if (next) window.localStorage.setItem(practiceDoneKey, '1')
      else window.localStorage.removeItem(practiceDoneKey)
    } catch (_) {}
  }

  useEffect(() => {
    let active = true
    authHeader().then((headers) => {
      fetch(`/api/goals/comment?goalId=${goal.id}`, { headers: headers || {} })
        .then((r) => r.json())
        .then((json) => { if (active) setComments(json.comments || []) })
        .catch(() => {})
    })
    return () => { active = false }
  }, [goal.id])

  // Pixabay video sekmesinde doğru kilit durumunu gösterebilmek için, picker
  // hiç açılmasa bile sahip görüntülediğinde premium/haftalık hak durumunu
  // önceden çekiyoruz.
  useEffect(() => {
    if (!isOwner) return
    let active = true
    authHeader().then((headers) => {
      if (!headers) return
      fetch('/api/user/premium-status', { headers })
        .then((r) => r.json())
        .then((json) => { if (active && !json.error) setVideoStatus(json) })
        .catch(() => {})
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

  async function generateCover() {
    setGeneratingCover(true)
    setCoverError('')
    try {
      const headers = await authHeader()
      if (!headers) { setCoverError(t.loginRequired); return }
      const res = await fetch('/api/goals/generate-cover', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === 'insufficient_auras') {
          setCoverError(lang === 'tr' ? `Yetersiz Aura (${AURA_COST} gerekiyor).` : `Not enough Auras (need ${AURA_COST}).`)
        } else if (json.error === 'image_generation_failed') {
          setCoverError(lang === 'tr' ? 'Görsel üretilemedi, kredi iade edildi.' : 'Image generation failed, credit refunded.')
        } else {
          setCoverError(json.error || 'error')
        }
        return
      }
      setGoal(json.goal)
      onChanged?.(json.goal)
    } catch {
      setCoverError('network_error')
    } finally {
      setGeneratingCover(false)
    }
  }

  async function handleGalleryFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'))
    if (!files.length || !isOwner) return

    setUploadingImages(true)
    setGalleryError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setGalleryError(t.loginRequired); return }

      for (const file of files) {
        const fileExt = file.name.split('.').pop() || 'jpg'
        const filePath = `${session.user.id}/${goal.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('goal-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })
        if (uploadError) {
          setGalleryError(uploadError.message || 'upload_error')
          continue
        }

        const { data: publicData } = supabase.storage.from('goal-images').getPublicUrl(filePath)
        const imageUrl = publicData?.publicUrl
        if (!imageUrl) continue

        const res = await fetch('/api/goals/add-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ goalId: goal.id, imageUrl }),
        })
        const json = await res.json()
        if (res.ok && json.gallery_image_urls) {
          setGalleryImages(json.gallery_image_urls)
          if (json.goal) onChanged?.(json.goal)
        } else {
          setGalleryError(json.error || 'error')
        }
      }
    } catch {
      setGalleryError('network_error')
    } finally {
      setUploadingImages(false)
    }
  }

  // Pixabay picker'da bir görsele tıklandığında çağrılır. Gerçek indirme +
  // kendi storage/DB'mize kaydetme işini sunucu tarafı yapar (bkz.
  // /api/goals/add-image-from-pixabay). true dönerse picker kapanır.
  async function handlePixabayImagePick(hit) {
    if (!isOwner) return false
    setGalleryError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setGalleryError(t.loginRequired); return false }

      const res = await fetch('/api/goals/add-image-from-pixabay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          goalId: goal.id,
          pixabayId: hit.id,
          imageUrl: hit.largeImageURL,
          tags: hit.tags,
          pixabayUser: hit.user,
          width: hit.width,
          height: hit.height,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setGalleryError(
          json.error === 'gallery_limit_reached'
            ? (lang === 'tr' ? 'Galeri dolu (maks. 20 görsel).' : 'Gallery is full (max 20 images).')
            : json.error || 'error'
        )
        return false
      }
      setGalleryImages(json.gallery_image_urls || [])
      if (json.goal) onChanged?.(json.goal)
      return true
    } catch {
      setGalleryError('network_error')
      return false
    }
  }

  // Video seçimi — aynı akış, ama /api/goals/add-video-from-pixabay premium/
  // haftalık hak kontrolünü de yapıyor. Başarılı ekleme sonrası (ücretsiz
  // kullanıcıysa) haftalık hakkı düşmüş olur, bu yüzden videoStatus'u tazeliyoruz.
  async function handlePixabayVideoPick(hit) {
    if (!isOwner) return false
    setGalleryError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setGalleryError(t.loginRequired); return false }

      const res = await fetch('/api/goals/add-video-from-pixabay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          goalId: goal.id,
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
        setGalleryError(
          json.error === 'gallery_limit_reached'
            ? (lang === 'tr' ? 'Galeri dolu (maks. 20 görsel).' : 'Gallery is full (max 20 images).')
            : json.error === 'weekly_video_limit_reached'
              ? (lang === 'tr' ? 'Haftalık ücretsiz video hakkın doldu.' : 'Weekly free video pick used up.')
              : json.error || 'error'
        )
        return false
      }
      setGalleryImages(json.gallery_image_urls || [])
      if (json.goal) onChanged?.(json.goal)
      setVideoStatus((prev) => (prev?.isPremium ? prev : { isPremium: false, canPickVideo: false, nextAvailableAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }))
      return true
    } catch {
      setGalleryError('network_error')
      return false
    }
  }

  // MİKRO-TAAHHÜT: bir vizyonu paylaşmak, ona olan bağlılığı sosyal olarak
  // görünür (ve dolayısıyla daha güçlü) kılar — davranış psikolojisinde
  // "public commitment" ilkesi.
  async function handleShare() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lunosfer.com'
    const text = t.shareText(goal.title)
    if (navigator.share) {
      try { await navigator.share({ title: goal.title, text, url: appUrl }); return } catch (_) { return }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${appUrl}`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (_) {}
  }

  async function removeGalleryImage(imageUrl) {
    if (!isOwner) return
    const headers = await authHeader()
    if (!headers) return setGalleryError(t.loginRequired)
    try {
      const res = await fetch('/api/goals/remove-image', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, imageUrl }),
      })
      const json = await res.json()
      if (!res.ok) return setGalleryError(json.error || 'error')
      setGalleryImages(json.gallery_image_urls || [])
      if (json.goal) onChanged?.(json.goal)
    } catch {
      setGalleryError('network_error')
    }
  }

  async function toggleStep(microGoalId) {
    const headers = await authHeader()
    if (!headers) return setError(t.loginRequired)
    try {
      const res = await fetch('/api/micro-goals/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({ microGoalId }),
      })
      const json = await res.json()
      if (!res.ok) return setError(json.error)

      setMicroGoals((list) => list.map((m) => (m.id === microGoalId ? json.microGoal : m)))
      if (json.goal) {
        const updated = { ...goal, completion_percentage: json.goal.completion_percentage }
        setGoal(updated)
        onChanged?.(updated)
      }
    } catch {
      setError('network_error')
    }
  }

  async function addStep() {
    const clean = newStep.trim()
    if (!clean || !isOwner) return
    const headers = await authHeader()
    if (!headers) return setError(t.loginRequired)
    try {
      const res = await fetch('/api/micro-goals/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, title: clean }),
      })
      const json = await res.json()
      if (!res.ok) return setError(json.error)
      setMicroGoals((list) => [...list, json.microGoal])
      setNewStep('')
    } catch {
      setError('network_error')
    }
  }

  async function postComment() {
    const clean = newComment.trim()
    if (!clean) return
    const headers = await authHeader()
    if (!headers) return setError(t.loginRequired)
    try {
      const res = await fetch('/api/goals/comment', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, content: clean }),
      })
      const json = await res.json()
      if (!res.ok) return setError(json.error)
      setComments((c) => [json.comment, ...c])
      setNewComment('')
    } catch {
      setError('network_error')
    }
  }

  async function resolveGoal() {
    setBusy(true)
    setError('')
    try {
      const headers = await authHeader()
      if (!headers) { setError(t.loginRequired); return }
      const res = await fetch('/api/goals/update-status', {
        method: 'POST',
        headers,
        body: JSON.stringify({ goalId: goal.id, status: resolveMode, story: story.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      setGoal(json.goal)
      onChanged?.(json.goal)
      setResolveMode(null)
    } catch {
      setError('network_error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteGoal() {
    if (!window.confirm(t.deleteConfirm)) return
    setBusy(true)
    try {
      const headers = await authHeader()
      if (!headers) { setError(t.loginRequired); return }
      const res = await fetch('/api/goals/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ goalId: goal.id }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error); return }
      onDeleted?.(goal.id)
      onClose?.()
    } catch {
      setError('network_error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label={goal.title} className="glass-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <AuthorHeader owner={initialGoal.owner || goal.owner} lang={lang} className="mb-2.5" />
            <h2 className="text-white font-bold text-lg">{goal.title}</h2>
            {goal.description && <p className="text-slate-400 text-sm mt-1">{goal.description}</p>}
          </div>
          <button onClick={onClose} aria-label={lang === 'tr' ? 'Kapat' : 'Close'} className="text-slate-400 hover:text-white shrink-0"><X size={20} /></button>
        </div>

        {goal.status === 'active' && (
          <button
            onClick={handleShare}
            className="w-full flex items-center gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary-500/10 to-brand-secondary-500/10 border border-brand-primary-500/20 hover:border-brand-primary-500/40 transition-colors text-left"
          >
            <Share2 size={15} className="text-brand-primary-300 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-white text-xs font-semibold">{t.shareCommitmentTitle}</span>
              <span className="block text-slate-400 text-[11px] truncate">{shareCopied ? t.shareLinkCopied : t.shareCommitmentDesc}</span>
            </span>
            <span className="text-brand-primary-300 text-[10px] font-bold uppercase tracking-widest shrink-0">{t.shareBtn}</span>
          </button>
        )}

        {goal.status === 'completed' && goal.victory_story && (
          <div className="mb-4 p-3 rounded-xl bg-semantic-success-500/10 border border-semantic-success-500/20">
            <p className="text-semantic-success-300 text-xs font-bold uppercase tracking-widest mb-1">{t.victoryWallTitle}</p>
            <p className="text-slate-200 text-sm">{goal.victory_story}</p>
          </div>
        )}
        {goal.status === 'abandoned' && goal.abandon_reason && (
          <div className="mb-4 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mb-1">{t.phoenixWallTitle}</p>
            <p className="text-slate-200 text-sm">{goal.abandon_reason}</p>
          </div>
        )}

        {/* GÖRSEL GALERİSİ — kapak görseli + kullanıcının cihazından
            yüklediği görseller, yana kaydırarak gezilebilir. */}
        {(goal.cover_image_url || galleryImages.length > 0) && (
          <div className="mb-5 -mx-6 px-6">
            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              {goal.cover_image_url && (
                <div className="relative shrink-0 w-[80%] sm:w-[60%] aspect-[4/3] snap-center rounded-xl overflow-hidden bg-black/30">
                  <img src={goal.cover_image_url} alt={goal.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              {galleryImages.map((url) => {
                const isVideo = /\/pixabay-video\//.test(url) || /\.mp4($|\?)/.test(url)
                return (
                  <div key={url} className="relative shrink-0 w-[80%] sm:w-[60%] aspect-[4/3] snap-center rounded-xl overflow-hidden bg-black/30">
                    {isVideo ? (
                      <video src={url} className="w-full h-full object-cover" muted loop autoPlay playsInline preload="metadata" />
                    ) : (
                      <img src={url} alt={goal.title} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    {isOwner && (
                      <button
                        onClick={() => removeGalleryImage(url)}
                        aria-label={lang === 'tr' ? 'Kaldır' : 'Remove'}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-5">
          <button
            onClick={() => (goal.vision_video_url ? setShowVisionVideoPlayer(true) : setShowSlidesViewer(true))}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-primary-500/90 via-brand-accent-500/90 to-brand-secondary-500/90 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90"
          >
            {lang === 'tr' ? '▶ Vizyonu İzle' : '▶ Watch Vision'}
          </button>
        </div>

        {showVisionVideoPlayer && goal.vision_video_url && (
          <VisionVideoPlayer
            goal={goal}
            lang={lang}
            currentUserId={currentUserId}
            onClose={() => setShowVisionVideoPlayer(false)}
            onChanged={onChanged}
          />
        )}

        {/* goal.vision_video_url henüz yoksa (video oluşturulmamış eski hedef) eski slayt gösterisine düş */}
        {showSlidesViewer && (
          <SlidesViewer
            goal={goal}
            lang={lang}
            currentUserId={currentUserId}
            onClose={() => setShowSlidesViewer(false)}
            onChanged={onChanged}
            onEditSlides={() => { setShowSlidesViewer(false); setShowVisionVideoEditor(true) }}
          />
        )}

        {isOwner && goal.status === 'active' && (
          <div className="mb-5">
            <div className="flex gap-2">
              <label className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-white/10 text-center cursor-pointer">
                {uploadingImages
                  ? (lang === 'tr' ? 'Yükleniyor...' : 'Uploading...')
                  : (lang === 'tr' ? 'Cihazından Ekle' : 'From Device')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingImages}
                  onChange={(e) => { handleGalleryFiles(e.target.files); e.target.value = '' }}
                />
              </label>
              <button
                onClick={() => setShowPixabayPicker(true)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-white/10 flex items-center justify-center gap-1.5"
              >
                <SearchIcon size={14} />
                {lang === 'tr' ? 'Pixabay\u2019dan Seç' : 'From Pixabay'}
              </button>
            </div>
            {galleryError && <p className="text-semantic-danger-400 text-xs mt-1.5">{galleryError}</p>}
            <button
              onClick={() => setShowVisionVideoEditor(true)}
              className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-primary-500/20 via-brand-accent-500/20 to-brand-secondary-500/20 text-brand-primary-200 text-xs font-bold uppercase tracking-widest hover:opacity-90"
            >
              {lang === 'tr'
                ? (goal.vision_video_url ? 'Vizyon Videosunu Düzenle' : 'Vizyon Videosu Oluştur')
                : (goal.vision_video_url ? 'Edit Vision Video' : 'Create Vision Video')}
            </button>
          </div>
        )}

        {showVisionVideoEditor && (
          <VisionVideoEditor
            goal={goal}
            lang={lang}
            onClose={() => setShowVisionVideoEditor(false)}
            onChanged={(videoUrl) => {
              const updated = { ...goal, vision_video_url: videoUrl }
              setGoal(updated)
              onChanged?.(updated)
            }}
          />
        )}

        {showPixabayPicker && (
          <PixabayPicker
            lang={lang}
            videoStatus={videoStatus}
            onPickImage={handlePixabayImagePick}
            onPickVideo={handlePixabayVideoPick}
            onClose={() => setShowPixabayPicker(false)}
          />
        )}

        {/* YOL HARİTASI */}
        <div className="mb-5">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2">{t.roadmapSectionTitle}</h3>
          {microGoals.length === 0 && <p className="text-slate-500 text-sm">{t.noSteps}</p>}
          <ul className="space-y-1.5">
            {microGoals.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <button
                  onClick={() => toggleStep(m.id)}
                  disabled={!isOwner}
                  aria-label={m.is_completed ? (lang === 'tr' ? 'Tamamlandı, geri al' : 'Completed, undo') : (lang === 'tr' ? 'Tamamlandı işaretle' : 'Mark complete')}
                  aria-pressed={m.is_completed}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 ${
                    m.is_completed ? 'bg-brand-secondary-400 border-brand-secondary-400 text-black' : 'border-white/20 text-transparent'
                  } ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {m.is_completed && <Check size={12} />}
                </button>
                <span className={`text-sm ${m.is_completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {m.title}
                </span>
              </li>
            ))}
          </ul>
          {isOwner && goal.status === 'active' && (
            <div className="flex gap-2 mt-2">
              <input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addStep() }}
                placeholder={t.addStepPlaceholder}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button onClick={addStep} className="px-3 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">+</button>
            </div>
          )}
        </div>

        {/* GÜNLÜK PRATİK — eğlenceli manifestation / oyun / alıştırma */}
        {goal.status === 'active' && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-brand-primary-500/10 via-brand-accent-500/10 to-brand-secondary-500/10 border border-white/10">
            <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
              <SparklesIcon size={14} className="text-brand-primary-300" />
              {lang === 'tr' ? 'Bugünün Pratiği' : "Today's Practice"}
            </h3>
            <p className="text-slate-200 text-sm mb-3">
              <span className="mr-1.5">{dailyPractice.icon}</span>
              {dailyPractice.text}
            </p>
            <button
              onClick={togglePracticeDone}
              className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
                practiceDone
                  ? 'bg-semantic-success-500/90 text-black'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {practiceDone ? (
                <>
                  <Check size={14} />
                  {lang === 'tr' ? 'Bugün yapıldı ✓' : 'Done today ✓'}
                </>
              ) : (
                lang === 'tr' ? 'Bugün Yaptım' : 'I Did This Today'
              )}
            </button>
          </div>
        )}

        {/* AI KAPAK GÖRSELİ ÜRETİMİ (image_credits harcar) */}
        {isOwner && goal.status === 'active' && (
          <div className="mb-5">
            <button
              onClick={generateCover}
              disabled={generatingCover}
              className="w-full py-2.5 rounded-xl bg-white/5 text-brand-secondary-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <ImageIcon size={14} />
              {generatingCover
                ? (lang === 'tr' ? 'Görsel Üretiliyor...' : 'Generating Image...')
                : (lang === 'tr' ? `AI Kapak Üret (${AURA_COST} Aura)` : `Generate AI Cover (${AURA_COST} Auras)`)}
            </button>
            {coverError && <p className="text-semantic-danger-400 text-xs mt-1.5">{coverError}</p>}
          </div>
        )}

        {/* SAHİP AKSİYONLARI */}
        {isOwner && goal.status === 'active' && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setResolveMode('completed')}
              className="flex-1 py-2.5 rounded-xl bg-semantic-success-500/90 text-black text-xs font-bold uppercase tracking-widest hover:opacity-90"
            >
              {t.markCompleteBtn}
            </button>
            <button
              onClick={() => setResolveMode('abandoned')}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest hover:bg-white/20"
            >
              {t.releaseGoalBtn}
            </button>
          </div>
        )}

        {resolveMode && (
          <div className="mb-5 p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-white font-bold text-sm mb-1">
              {resolveMode === 'completed' ? t.completeModalTitle : t.releaseModalTitle}
            </h4>
            <p className="text-slate-400 text-xs mb-3">
              {resolveMode === 'completed' ? t.completeModalDesc : t.releaseModalDesc}
            </p>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder={t.storyPlaceholder}
              rows={3}
              maxLength={2000}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={resolveGoal}
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-brand-primary-500 text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40"
              >
                {t.confirmBtn}
              </button>
              <button
                onClick={() => setResolveMode(null)}
                className="flex-1 py-2 rounded-lg bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        )}

        {isOwner && (
          <button
            onClick={deleteGoal}
            disabled={busy}
            className="text-semantic-danger-400 text-xs font-bold uppercase tracking-widest mb-5 hover:text-semantic-danger-300 flex items-center gap-1.5"
          >
            <Trash2 size={14} /> {t.deleteGoalBtn}
          </button>
        )}

        {error && <p className="text-semantic-danger-400 text-sm mb-3">{error}</p>}

        {/* YORUMLAR */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><MessageCircle size={14} /> {comments.length}</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') postComment() }}
              placeholder="..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button onClick={postComment} aria-label={lang === 'tr' ? 'Yorum gönder' : 'Send comment'} className="px-3 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"><ArrowUp size={16} /></button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="text-brand-secondary-300 font-semibold">
                  {c.user_profiles?.display_name || c.user_profiles?.username || '...'}
                </span>{' '}
                <span className="text-slate-300">{c.content}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
