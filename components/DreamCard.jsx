import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import Image from 'next/image'
import { Upload, Search as SearchIcon, Pencil } from 'lucide-react'
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

export default function DreamCard({ dream, lang, onTranslate, translating, translated, translatedContent, translatedAnalysis, currentUserId, onImageChanged, owner }) {
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
  // 'repairing' -> arka planda onarım isteniyor (kısa an) | 'broken' -> onarım da
  // başarısız oldu, zarif bir yer tutucu göster (asla sessizce KAYBOLMASIN).
  const [imgState, setImgState] = useState('idle')
  const [imgOverrideUrl, setImgOverrideUrl] = useState(null) // onarımdan dönen taze URL
  const repairAttemptedRef = useRef(false)
  // Sahibinin kapak görselini elle değiştirmesi (cihazdan yükleme / Pixabay).
  // AI otomatik üretiminden BAĞIMSIZ, ek bir yol — sahibi rüya kartı
  // oluştuktan sonra da (görsel olsun/olmasın) görseli değiştirebilsin diye.
  const [showPixabayPicker, setShowPixabayPicker] = useState(false)
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false)
  const [coverImageError, setCoverImageError] = useState('')
  const coverFileInputRef = useRef(null)
  // Tam düzenleme (içerik/konum/etiket/görünürlük/görsel) — DreamEditModal
  // artık burada bağlı: sahibi "Düzenle"ye basınca açılır.
  const [showEditModal, setShowEditModal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const effectiveDream = useMemo(() => (analysisOverride ? { ...dream, ...analysisOverride } : dream), [dream, analysisOverride])

  // Modal başka bir rüya için yeniden açıldığında (aynı component instance
  // farklı bir dream prop'uyla yeniden kullanılabiliyor) görsel deneme
  // durumunu sıfırla — aksi halde önceki rüyadan kalan 'broken' durumu
  // yenisine sızabilir.
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
        const res = await fetch(`/api/get-dream?id=${dreamId}`)
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

        // Gumroad "Lunosfer Premium" aboneliği aktifse Aura harcanmadan
        // derin analiz/görsel yapılabiliyor — bkz. pages/api/user/premium-status.js
        try {
          const res = await fetch('/api/user/premium-status', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          const status = await res.json()
          if (active && res.ok) setIsPremiumMember(!!status?.isPremium)
        } catch {
          // sessizce geç — premium değilse zaten normal Aura akışı çalışır
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

  const triggerToast = (msg) => { setToastMessage(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800) }

  // Bkz. lib/repairDreamImage.js kök neden notu: bu genelde hiç tetiklenmez
  // (Explore artık bozuk görselleri sunucu tarafında zaten eliyor), ama bir
  // görsel gerçekten burada kırılırsa: 1) bir kez cache-bypass ile yeniden
  // dener, 2) hâlâ olmazsa ANINDA onarım isteği atar ve dönen taze URL'i
  // gösterir, 3) onarım da görsel bulamazsa (ör. sağlayıcı geçici olarak
  // erişilemez) zarif bir yer tutucuya düşer — ama görsel ASLA sessizce
  // kaybolmaz, kullanıcı her zaman bir şey görür.
  const handleImageError = useCallback(async () => {
    if (imgState === 'idle') {
      setImgState('retry')
      return
    }
    if (imgState === 'retry') {
      if (repairAttemptedRef.current) {
        // Onarım zaten bu açılışta bir kez denendi ve döndürdüğü taze URL de
        // yüklenemedi — tekrar tekrar denemek yerine zarif yer tutucuya düş.
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

  // Sahibi kapak görselini cihazından ya da Pixabay'den elle seçtiğinde
  // ikisi de burada birleşiyor: yükle/al -> update-dream ile kalıcı olarak
  // rüyaya kaydet -> ekranı anında handleGenerateImageOnly ile AYNI desende
  // güncelle (analysisOverride + img state reset).
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

  // DreamEditModal'dan gelen tam güncelleme (içerik/konum/etiket/görünürlük
  // ve opsiyonel olarak görsel) — aynı update-dream endpoint'i, aynı
  // "kaydet -> analysisOverride'a yansıt" deseni.
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
          const postOwner = owner || effectiveDream?.owner
          if (!postOwner && !isOwner) return null
          return (
            <div className="flex items-center justify-between mb-3 -mt-1">
              {postOwner ? <AuthorHeader owner={postOwner} lang={lang} /> : <span />}
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
                ? 'Görsel şu anda hazırlanıyor, birazdan tekrar dene.'
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
                <span className="text-brand-primary-200">🜂</span>
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
      
