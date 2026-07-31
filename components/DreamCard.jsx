import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import { getTranslation } from '@/lib/translations'
import { supabase } from '@/lib/supabase'
import { tAddDream } from '@/lib/addDreamTranslations'
import { ARCHETYPE_LOCALIZATIONS } from '@/lib/archetypeTranslations'
import { getDreamCardText } from '@/lib/dreamCardTranslations'
import DreamAnalysisView from '@/components/DreamAnalysisView'
import DeepAnalysisConfirmationModal from '@/components/DeepAnalysisConfirmationModal'
import DeepAnalysisCarouselModal from '@/components/DeepAnalysisCarouselModal'
import StoryModeModal from '@/components/StoryModeModal'

const GUMROAD_PRODUCT_URL = 'https://shop.lunosfer.com'

export default function DreamCard({ dream, lang, onTranslate, translating, translated, translatedContent, translatedAnalysis, currentUserId }) {
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

    const applyUser = async (currentUser) => {
      if (!active) return
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('premium_analysis_auras')
          .eq('id', currentUser.id)
          .single()
        if (active && profile) setPremiumAuras(profile.premium_analysis_auras || 0)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      applyUser(session?.user || null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user || null)
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
          </div>
        )}
        {imgState === 'repairing' && (
          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 flex flex-col items-center justify-center gap-2 bg-white/[0.03] border border-white/10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-fuchsia-400 border-t-transparent" />
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
            <div className="mb-5 rounded-2xl border border-fuchsia-300/15 bg-fuchsia-500/8 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-fuchsia-200">🜂</span>
                <p className="text-xs uppercase tracking-[0.18em] text-fuchsia-100">
                  {t.jungianAnalysisLabel}
                </p>
              </div>
              {summary && <p className="text-sm leading-7 text-slate-200">{summary}</p>}
              {motiv && (
                <p className="mt-3 border-l border-fuchsia-300/30 pl-3 text-xs italic text-slate-400">
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
          className="w-full bg-fuchsia-600 p-4 rounded-xl text-white font-bold mb-3 disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full bg-cyan-600 p-4 rounded-xl text-white font-bold hover:bg-cyan-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generatingImage ? (stepMessage || t.generatingImage) : (isOwner ? t.generateImage : t.giftDreamImage)}
            </button>
            {generatingImage && stepMessage && (
              <p className="text-center text-xs text-cyan-300 animate-pulse">{stepMessage}</p>
            )}
          </div>
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

      {showConfirmModal && <DeepAnalysisConfirmationModal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} auras={premiumAuras} onConfirm={handlePremiumAnalysisExecute} lang={currentLang} gumroadUrl={GUMROAD_PRODUCT_URL} isGift={!isOwner} isGenerating={premiumGenerating} />}
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
      
