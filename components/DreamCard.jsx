import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import Image from 'next/image'
import { Upload, Search as SearchIcon, Pencil, Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getTranslation } from '@/lib/translations'
import { supabase } from '@/lib/supabase'
import { tAddDream } from '@/lib/addDreamTranslations'
import { ARCHETYPE_LOCALIZATIONS } from '@/lib/archetypeTranslations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import { uploadDreamCoverImage, getDreamUploadErrorMessage } from '@/lib/uploadDreamCoverImage'
import { updateDream } from '@/services/dreamService'
import DreamAnalysisView from '@/components/DreamAnalysisView'
import DeepAnalysisConfirmationModal from '@/components/DeepAnalysisConfirmationModal'
import DeepAnalysisCarouselModal from '@/components/DeepAnalysisCarouselModal'
import StoryModeModal from '@/components/StoryModeModal'
import PixabayPicker from '@/components/PixabayPicker'
import DreamEditModal from '@/components/dreams/DreamEditModal'
import AuthorHeader from '@/components/AuthorHeader'

const GUMROAD_PRODUCT_URL = 'https://shop.lunosfer.com'

export default function DreamCard({ dream, lang, onTranslate, translating, translated, translatedContent, translatedAnalysis, currentUserId, onImageChanged, owner, onClose }) {
  const { i18n } = useTranslation()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const currentLang = useMemo(() => {
    const rawLang = lang || (mounted ? (i18n?.language || 'en') : 'en')
    return String(rawLang).toLowerCase().split('-')[0]
  }, [lang, i18n, mounted])

  const t = getDreamCardText(currentLang)

  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(dream.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsCount, setCommentsCount] = useState(dream.comments_count || 0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)

  const { subscribe: subscribeToPush } = usePushSubscription()
  const [premiumAuras, setPremiumAuras] = useState(0)
  const [isPremiumMember, setIsPremiumMember] = useState(false)
  const [premiumGenerating, setPremiumGenerating] = useState(false)
  const [premiumQueued, setPremiumQueued] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [stepMessage, setStepMessage] = useState('')
  const [premiumError, setPremiumError] = useState('')
  const [premiumAnalysis, setPremiumAnalysis] = useState(dream?.premium_deep_analysis || null)
  const [analysisOverride, setAnalysisOverride] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  // 'idle' -> normal gösterim | 'retry' -> bir kez cache-bypass ile yeniden dene
  // 'repairing' -> arka planda onarim isteniyor (kisa an) | 'broken' -> onarim da
  // basarisiz oldu, zarif bir yer tutucu göster (asla sessizce KAYBOLMASIN).
  const [imgState, setImgState] = useState('idle')
  const [imgOverrideUrl, setImgOverrideUrl] = useState(null) // onarimdan dönen taze URL
  const repairAttemptedRef = useRef(false)
  // Sahibinin kapak görselini elle degistirmesi (cihazdan yükleme / Pixabay).
  // AI otomatik uretiminden BAGIMSIZ, ek bir yol — sahibi ruya karti
  // olusturduktan sonra da (gorsel olsun/olmasin) gorseli degistirebilsin diye.
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false)
  const [coverImageError, setCoverImageError] = useState('')
  const coverFileInputRef = useRef(null)
  // Tam duzenleme (icerik/konum/etiket/gorunurluk/gorsel) — DreamEditModal
  // artik burada bagli: sahibi "Duzenle"ye basinca acilir.
  const [showEditModal, setShowEditModal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])

  // Modal baska bir ruya icin yeniden acildiginda (ayni component instance
  // farkli bir dream prop'uyla yeniden kullanilabiliyor) gorsel deneme
  // durumunu sifirla — aksi halde onceki ruyadan kalan 'broken' durumu
  // yenisine sizabilir.
  useEffect(() => {
    setImgState('idle')
    setImgOverrideUrl(null)
    repairAttemptedRef.current = false
  }, [dream.id])

  const isAnalysisPreparing = useMemo(() => {
    if (premiumAnalysis || effectiveDream?.premium_deep_analysis) return false
    if (premiumQueued) return true
    return effectiveDream?.premium_deep_analysis_status === 'pending' || effectiveDream?.premium_deep_analysis_status === 'processing'
  }, [premiumAnalysis, effectiveDream, premiumQueued])

  useEffect(() => {
    if (!isAnalysisPreparing) return

    let active = true
    const dreamId = dream.id

    const poll = async () => {
      try {
              const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/get-dream?id=${dreamId}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        })
        if (!active || !res.ok) return
        const { dream: fresh } = await res.json()
        if (!active || !fresh) return

        if (fresh.premium_deep_analysis_status === 'generated' && fresh.premium_deep_analysis) {
          setPremiumAnalysis(fresh.premium_deep_analysis)
          setAnalysisOverride((prev) => ({ ...prev, ...fresh }))
          setPremiumQueued(false)
        } else if (fresh.premium_deep_analysis_status === 'failed') {
          setPremiumError(fresh.premium_deep_analysis_error || t.analysisTimeout || 'Analysis failed')
          setPremiumQueued(false)
        }
      } catch {
        // sessizce geç
      }
    }

    const intervalId = setInterval(poll, 6000)
    poll()

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [isAnalysisPreparing, dream.id])

  const isOwner = useMemo(() => {
    const effectiveUserId = currentUserId ?? user?.id
    if (!effectiveUserId) return false
    const ownerId = effectiveDream?.user_id ?? effectiveDream?.owner_id ?? effectiveDream?.author_id ?? effectiveDream?.uid
    return ownerId != null && String(ownerId) === String(effectiveUserId)
  }, [user, effectiveDream, currentUserId])

  useEffect(() => {
    let active = true

    const applyUser = async (session) => {
      if (!active) return
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('premium_analysis_auras')
          .eq('id', currentUser.id)
          .single()
        if (active && profile) setPremiumAuras(profile.premium_analysis_auras || 0)

        // Gumroad "Lunosfer Premium" aboneligi aktifse Aura harcanmadan
        // derin analiz/gorsel yapilabiliyor — bkz. pages/api/user/premium-status.js
        try {
          const res = await fetch('/api/user/premium-status', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          const status = await res.json()
          if (active && res.ok) setIsPremiumMember(!!status?.isPremium)
        } catch {
          // sessizce geç — premium degilse zaten normal Aura akisi calisir
        }
      } else {
        setIsPremiumMember(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      applyUser(session)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session)
    })

    return () => {
      active = false
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  // YENI: bu kullanici bu ruyayi daha once begenmis mi kontrol et — sayfa
  // acildiginda kalp ikonunun dogru (dolu/bos) durumda baslamasi icin.
  useEffect(() => {
    if (!user?.id) {
      setLiked(false)
      return
    }

    let active = true

    supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('dream_id', dream.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setLiked(!!data)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [user?.id, dream.id])

  const triggerToast = (msg) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800) }

  // YENI: begeni ekle/kaldir — iyimser guncelleme (istek beklemeden aninda
  // kalp doluyor/bosaliyor), API basarisiz olursa geri aliniyor.
  const handleLike = async () => {
    if (!user) {
      triggerToast(t.loginRequired || 'Please log in to continue')
      return
    }

    const wasLiked = liked
    const prevCount = likesCount

    setLiked(!wasLiked)
    setLikesCount(wasLiked ? Math.max(0, prevCount - 1) : prevCount + 1)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t.loginRequired || 'Please log in to continue')

      const res = await fetch('/api/like', {
        method: wasLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setLiked(!!data.liked)
      if (typeof data.count === 'number') setLikesCount(data.count)
    } catch (err) {
      // Basarisiz olursa iyimser guncellemeyi geri al
      setLiked(wasLiked)
      setLikesCount(prevCount)
      triggerToast(err.message || (lang === 'tr' ? 'İşlem başarısız.' : 'Action failed.'))
    }
  }

  // YENI: yorumlari sadece panel ilk acildiginda cek (her render'da degil).
  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/comment?dreamId=${dream.id}`)
      const data = await res.json()
      if (res.ok) {
        const list = Array.isArray(data.comments) ? data.comments : []
        setComments(list)
        setCommentsCount(list.length)
      }
    } catch (err) {
      console.error('Load comments error:', err)
    } finally {
      setCommentsLoading(false)
    }
  }, [dream.id])

  const handleToggleComments = () => {
    setShowComments((prev) => {
      const next = !prev
      if (next && comments.length === 0) loadComments()
      return next
    })
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    const content = newComment.trim()
    if (!content || !user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        triggerToast(t.loginRequired || 'Please log in to continue')
        return
      }

      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id, content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || (lang === 'tr' ? 'Yorum eklenemedi' : 'Could not add comment'))

      setComments((prev) => [data.comment, ...prev])
      setCommentsCount((prev) => prev + 1)
      setNewComment('')
    } catch (err) {
      triggerToast(err.message || (lang === 'tr' ? 'Yorum eklenemedi.' : 'Could not add comment.'))
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ commentId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || (lang === 'tr' ? 'Yorum silinemedi' : 'Could not delete comment'))
      }

      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentsCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      triggerToast(err.message || (lang === 'tr' ? 'Yorum silinemedi.' : 'Could not delete comment.'))
    }
  }

  // Bkz. lib/repairDreamImage.js kok neden notu: bu genelde hic tetiklenmez
  // (Explore artik bozuk gorselleri sunucu tarafinda zaten eliyor), ama bir
  // gorsel gercekten burada kirilirsa: 1) bir kez cache-bypass ile yeniden
  // dener, 2) hala olmazsa ANINDA onarim istegi atar ve donen taze URL'i
  // gosterir, 3) onarim da gorsel bulamazsa (or. saglayici gecici olarak
  // erisilemez) zarif bir yer tutucuya duser — ama gorsel ASLA sessizce
  // kaybolmaz, kullanici her zaman bir sey gorur.
  const handleImageError = useCallback(async () => {
    if (imgState === 'idle') {
      setImgState('retry')
      return
    }
    if (imgState === 'retry') {
      if (repairAttemptedRef.current) {
        // Onarim zaten bu acilista bir kez denendi ve dondurdugu taze URL de
        // yuklenemedi — tekrar tekrar denemek yerine zarif yer tutucuya dus.
        setImgState('broken')
        return
      }
      repairAttemptedRef.current = true
      setImgState('repairing')
      try {
        const res = await fetch('/api/dreams/report-broken-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dreamId: dream.id }),
        })
        const data = await res.json().catch(() => null)
        if (data?.imageUrl) {
          setImgOverrideUrl(data.imageUrl)
          setImgState('idle')
        } else {
          setImgState('broken')
        }
      } catch {
        setImgState('broken')
      }
    }
  }, [dream.id, imgState])

  const displayImageUrl = imgOverrideUrl || effectiveDream.ai_image_url
  const showImage = !!displayImageUrl && imgState !== 'broken' && imgState !== 'repairing'
  const imageSrc = imgState === 'retry'
    ? `${displayImageUrl}${displayImageUrl.includes('?') ? '&' : '?'}retry=${dream.id}`
    : displayImageUrl

  const translateArchetype = useCallback((arch) => {
    const cleanArch = String(arch).trim()
    return ARCHETYPE_LOCALIZATIONS[currentLang]?.[cleanArch] || cleanArch
  }, [currentLang])

  // Sahibi kapak gorselini cihazindan ya da Pixabay'den elle sectiginde
  // ikisi de burada birlesiyor: yukle/al -> update-dream ile kalici olarak
  // ruyaya kaydet -> ekrani aninda handleGenerateImageOnly ile AYNI desende
  // guncelle (analysisOverride + img state reset).
  const persistCoverImage = async (result, userId) => {
    await updateDream(dream.id, userId, {
      ai_image_url: result.url,
      image_source: result.source,
      image_width: result.width || null,
      image_height: result.height || null,
    })
    setAnalysisOverride({
      ...effectiveDream,
      ai_image_url: result.url,
      image_source: result.source,
      image_width: result.width || null,
      image_height: result.height || null,
    })
    setImgOverrideUrl(null)
    setImgState('idle')
    repairAttemptedRef.current = false
    setShowPixabayPicker(false)
    onImageChanged?.(result.url)
  }

  const handleDeviceCoverUpload = async (file) => {
    if (!file || !isOwner) return
    setCoverImageError('')
    setUploadingCoverImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverImageError(t.loginRequired || 'Please log in to continue'); return }
      const result = await uploadDreamCoverImage({ file, userId: session.user.id, dreamId: dream.id })
      await persistCoverImage(result, session.user.id)
    } catch (err) {
      setCoverImageError(getDreamUploadErrorMessage(err, lang))
    } finally {
      setUploadingCoverImage(false)
    }
  }

  const onCoverFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (file) handleDeviceCoverUpload(file)
  }

  const handlePixabayCoverPick = async (hit) => {
    if (!isOwner) return false
    setCoverImageError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setCoverImageError(t.loginRequired || 'Please log in to continue'); return false }
      const res = await fetch('/api/dreams/pixabay-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          pixabayId: hit.id,
          imageUrl: hit.largeImageURL || hit.webformatURL,
          tags: hit.tags,
          pixabayUser: hit.user,
          width: hit.width,
          height: hit.height,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setCoverImageError(json.error || 'error'); return false }
      await persistCoverImage({ url: json.url, width: json.width, height: json.height, source: 'pixabay' }, session.user.id)
      return true
    } catch {
      setCoverImageError(lang === 'tr' ? 'Görsel eklenemedi, tekrar dene.' : 'Could not add the image, please try again.')
      return false
    }
  }

  // DreamEditModal'dan gelen tam guncelleme (icerik/konum/etiket/gorunurluk
  // ve opsiyonel olarak gorsel) — ayni update-dream endpoint'i, ayni
  // "kaydet -> analysisOverride'a yansit" deseni.
  const handleSaveEdit = async (updates) => {
    setSavingEdit(true)
    setEditError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t.loginRequired || 'Please log in to continue')
      await updateDream(dream.id, session.user.id, updates)
      setAnalysisOverride((prev) => ({ ...(prev || effectiveDream), ...updates }))
      if ('ai_image_url' in updates) {
        setImgOverrideUrl(null)
        setImgState('idle')
        repairAttemptedRef.current = false
      }
      setShowEditModal(false)
      triggerToast(lang === 'tr' ? 'Rüya güncellendi.' : 'Dream updated.')
    } catch (err) {
      setEditError(err.message || (lang === 'tr' ? 'Güncellenemedi, tekrar dene.' : 'Could not update, please try again.'))
    } finally {
      setSavingEdit(false)
    }
  }

  const handleGenerateImageOnly = async () => {
    setPremiumError('')
    setGeneratingImage(true)
    setStepMessage('Rüya sahnesi analiz ediliyor...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t.loginRequired || 'Please log in to continue')
      
      setStepMessage('Sinematik görsel oluşturuluyor...')
      const res = await fetch('/api/generate-dream-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to generate')
      
      setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      setImgOverrideUrl(null)
      setImgState('idle')
      repairAttemptedRef.current = false
      setPremiumAuras(data.aurasLeft)
      if (typeof data.isPremiumMember === 'boolean') setIsPremiumMember(data.isPremiumMember)
      triggerToast(isOwner ? t.imageSuccess : t.imageGiftSuccess)
    } catch (err) {
      setPremiumError(err.message)
    } finally {
      setGeneratingImage(false)
      setStepMessage('')
    }
  }

  const handlePremiumAnalysisExecute = async () => {
    if (premiumGenerating) return
    setPremiumError('')
    setPremiumGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t.loginRequired || 'Please log in to continue')

      subscribeToPush()

      setPremiumQueued(true)
      setShowConfirmModal(false)
      triggerToast(t.analysisQueuedToast)
      const redirectTarget = isOwner ? '/profile' : '/'
      setTimeout(() => {
        router.push(redirectTarget)
      }, 1400)

      const res = await fetch('/api/generate-deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dreamId: dream.id, lang: currentLang }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error(t.analysisTimeout || 'The analysis is taking longer than expected. Please try again in a moment.')
      }
      if (!res.ok) {
        const failureDetail = Array.isArray(data.failures) && data.failures.length
          ? ' | ' + data.failures.map(f => {
              const issues = Array.isArray(f.issues) && f.issues.length ? ` [${f.issues.join(', ')}]` : ''
              return `${f.provider}: ${f.reason}${issues}`
            }).join(', ')
          : ''
        throw new Error(`${data.error || 'Failed'}${data.details ? ` (${data.details})` : ''}${failureDetail}`)
      }

      setPremiumAuras(data.aurasLeft)
      if (typeof data.isPremiumMember === 'boolean') setIsPremiumMember(data.isPremiumMember)

      if (data.generated && data.analysis) {
        setPremiumAnalysis(data.analysis)
        setAnalysisOverride((prev) => ({ ...prev, premium_deep_analysis: data.analysis, premium_deep_analysis_status: 'generated' }))
      }
      setPremiumQueued(false)
    } catch (err) {
      setPremiumError(err.message)
      setShowConfirmModal(false)
      setPremiumQueued(false)
    } finally {
      setPremiumGenerating(false)
    }
  }

  return (
    <>
      <article className="glass-card p-6 rounded-3xl border border-white/10 bg-slate-900/40">
        {/* Cihazdan kapak görseli seçmek için gizli input — hem "görsel yok"
            hem "görseli değiştir" butonları aynı input'u tetikler. */}
        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploadingCoverImage}
          onChange={onCoverFileInputChange}
        />
        {(() => {
          // owner join'i (or. eski/gorselsiz bazi ruyalarda profil satiri
          // eslesmemis) bos donerse bile en azindan user_id'den minimal,
          // yine de /u/[userId]'e tiklanabilir bir baslik kur — "hic profil
          // gorunmuyor" yerine en kotu ihtimalle jenerik avatar + "Bilinmeyen"
          // gosterir.
          const rawOwner = owner || effectiveDream?.owner
          const postOwner = rawOwner || (effectiveDream?.user_id ? { id: effectiveDream.user_id } : null)
          if (!postOwner && !isOwner) return null
          return (
            <div className="flex items-center justify-between mb-3 -mt-1">
              {postOwner ? <AuthorHeader owner={postOwner} lang={lang} onNavigate={onClose} /> : <span />}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => { setEditError(''); setShowEditModal(true) }}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-white/5 hover:text-brand-primary-200 transition shrink-0"
                >
                  <Pencil size={12} />
                  {lang === 'tr' ? 'Düzenle' : 'Edit'}
                </button>
              )}
            </div>
          )
        })()}
        {showImage && (
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4">
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="object-cover"
              onError={handleImageError}
            />
            {isOwner && (
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={uploadingCoverImage}
                  title={lang === 'tr' ? 'Cihazdan değiştir' : 'Change from device'}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                >
                  <Upload size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPixabayPicker(true)}
                  disabled={uploadingCoverImage}
                  title={lang === 'tr' ? "Pixabay'dan değiştir" : 'Change from Pixabay'}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50"
                >
                  <SearchIcon size={14} />
                </button>
              </div>
            )}
            {uploadingCoverImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
              </div>
            )}
          </div>
        )}
        {imgState === 'repairing' && (
          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 flex flex-col items-center justify-center gap-2 bg-white/[0.03] border border-white/10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
            <span className="text-[11px] text-slate-400">
              {lang === 'tr' ? 'Görsel onarılıyor...' : 'Repairing image...'}
            </span>
          </div>
        )}
        {imgState === 'broken' && effectiveDream.ai_image_url && (
          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 flex flex-col items-center justify-center gap-1.5 bg-white/[0.03] border border-white/10 px-6 text-center">
            <span className="text-xl">🌫️</span>
            <span className="text-[11px] text-slate-400">
              {lang === 'tr'
                ? 'Görsel şu anda hazırlanıyor, biraz sonra tekrar dene.'
                : 'Image is being prepared — check back shortly.'}
            </span>
          </div>
        )}
        <p className="mb-6">{translated ? translatedContent : dream.content}</p>

        {Array.isArray(effectiveDream.tags) && effectiveDream.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5 -mt-3">
            {effectiveDream.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {(() => {
          const summary = effectiveDream?.[`ai_summary_${currentLang}`] || effectiveDream?.ai_summary || effectiveDream?.ai_summary_en
          const motiv = effectiveDream?.[`ai_motiv_${currentLang}`] || effectiveDream?.ai_motiv || effectiveDream?.ai_motiv_en
          if (!summary && !motiv) return null
          return (
            <div className="mb-5 rounded-2xl border border-brand-primary-300/15 bg-brand-primary-500/8 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-brand-primary-200">🌂</span>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-primary-100">
                  {t.jungianAnalysisLabel}
                </p>
              </div>
              {summary && <p className="text-sm leading-7 text-slate-200">{summary}</p>}
              {motiv && (
                <p className="mt-3 border-l border-brand-primary-300/30 pl-3 text-xs italic text-slate-400">
                  "{motiv}"
                </p>
              )}
            </div>
          )
        })()}
        
        <button
          onClick={() => {
            if (isAnalysisPreparing) return
            premiumAnalysis ? setShowAnalysisModal(true) : setShowConfirmModal(true)
          }}
          disabled={isAnalysisPreparing}
          className="w-full bg-brand-primary-600 p-4 rounded-xl text-white font-bold mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {premiumAnalysis
            ? t.exploreCards
            : isAnalysisPreparing
              ? t.analysisPreparing
              : (isOwner ? t.getDeepAnalysis : t.giftDeepAnalysis)}
        </button>

        {!effectiveDream.ai_image_url && (
          <div className="mb-3 space-y-2">
            <button 
              onClick={handleGenerateImageOnly} 
              disabled={generatingImage} 
              className="w-full bg-brand-secondary-600 p-4 rounded-xl text-white font-bold hover:bg-brand-secondary-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generatingImage ? (stepMessage || t.generatingImage) : (isOwner ? t.generateImage : t.giftDreamImage)}
            </button>
            {generatingImage && stepMessage && (
              <p className="text-center text-xs text-brand-secondary-300 animate-pulse">{stepMessage}</p>
            )}
            {isOwner && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={uploadingCoverImage}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <Upload size={14} />
                  {uploadingCoverImage
                    ? (lang === 'tr' ? 'Yükleniyor...' : 'Uploading...')
                    : (lang === 'tr' ? 'Cihazdan Yükle' : 'From Device')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPixabayPicker(true)}
                  disabled={uploadingCoverImage}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-brand-primary-300 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"
                >
                  <SearchIcon size={14} />
                  {lang === 'tr' ? "Pixabay'dan Seç" : 'From Pixabay'}
                </button>
              </div>
            )}
          </div>
        )}

        {coverImageError && (
          <p className="mb-3 text-center text-[11px] text-semantic-danger-400">{coverImageError}</p>
        )}

        {premiumError && (
          <div className="mb-4 flex flex-col gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-red-400 text-xs">{premiumError}</p>
            <button
              onClick={!effectiveDream.ai_image_url ? handleGenerateImageOnly : handlePremiumAnalysisExecute}
              className="self-end rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 transition"
            >
              Yeniden Dene
            </button>
          </div>
        )}

        {/* YENI: Begeni + Yorum bolumu — DB/API zaten hazirdi, sadece arayuz
            baglanmamisti. */}
        <div className="flex items-center gap-5 border-t border-white/10 pt-4 mt-1">
          <button
            type="button"
            onClick={handleLike}
            aria-pressed={liked}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-red-400 transition"
          >
            <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : ''} />
            {likesCount}
          </button>
          <button
            type="button"
            onClick={handleToggleComments}
            aria-expanded={showComments}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-brand-primary-300 transition"
          >
            <MessageCircle size={18} />
            {commentsCount}
          </button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-4">
            {commentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary-400 border-t-transparent" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-2">
                {lang === 'tr' ? 'Henüz yorum yok. İlk yorumu sen yaz.' : 'No comments yet. Be the first to comment.'}
              </p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 shrink-0">
                      {c.user_profiles?.avatar_url ? (
                        <img src={c.user_profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">👤</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">
                        <span className="font-semibold text-white">{c.user_profiles?.display_name || c.user_profiles?.username || 'dreamer'}</span>{' '}
                        <span className="text-slate-300">{c.content}</span>
                      </p>
                    </div>
                    {user?.id === c.user_id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(c.id)}
                        aria-label={lang === 'tr' ? 'Yorumu sil' : 'Delete comment'}
                        className="shrink-0 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {user ? (
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={lang === 'tr' ? 'Bir yorum yaz...' : 'Write a comment...'}
                  maxLength={500}
                  className="flex-1 rounded-full bg-black/40 border border-white/10 px-3.5 py-2 text-xs text-white outline-none focus:border-brand-primary-400"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  aria-label={lang === 'tr' ? 'Gönder' : 'Send'}
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand-primary-600 text-white disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </form>
            ) : (
              <p className="text-center text-[11px] text-slate-500">
                {lang === 'tr' ? 'Yorum yapmak için giriş yap.' : 'Log in to comment.'}
              </p>
            )}
          </div>
        )}
      </article>

      {showConfirmModal && <DeepAnalysisConfirmationModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} auras={premiumAuras} isPremiumMember={isPremiumMember} onConfirm={handlePremiumAnalysisExecute} lang={currentLang} gumroadUrl={GUMROAD_PRODUCT_URL} isGift={!isOwner} isGenerating={premiumGenerating} />}
      {showEditModal && (
        <DreamEditModal
          dream={effectiveDream}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
          saving={savingEdit}
          error={editError}
          lang={currentLang}
        />
      )}
      {showPixabayPicker && (
        <PixabayPicker
          lang={currentLang}
          videoEnabled={false}
          onPickImage={handlePixabayCoverPick}
          onClose={() => setShowPixabayPicker(false)}
        />
      )}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowAnalysisModal(false)}>
           <DeepAnalysisCarouselModal isOpen={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis} lang={currentLang} dreamTitle={dream.ai_title} dreamContent={translated ? translatedContent : dream.content} dreamImage={effectiveDream.ai_image_url} dreamId={dream.id} onGenerateImageOnly={handleGenerateImageOnly} generatingImage={generatingImage} premiumError={premiumError} translateArchetype={translateArchetype} onOpenStoryMode={() => setShowStoryMode(true)} />
        </div>
      )}
      {showStoryMode && (
        <StoryModeModal
          isOpen={showStoryMode}
          onClose={() => setShowStoryMode(false)}
          dream={effectiveDream}
          premiumAnalysis={premiumAnalysis || effectiveDream?.premium_deep_analysis}
          lang={currentLang}
        />
      )}
    </>
  )
}
