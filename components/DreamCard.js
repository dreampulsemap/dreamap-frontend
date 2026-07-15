import { useEffect, useMemo, useState, useCallback } from 'react'
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

const GUMROAD_PRODUCT_URL = 'https://lunosfer.gumroad.com/l/lunosfer-deep-analysis'

function getAnalysisButtonLabel(lang) {
  return lang === 'tr' ? 'Rüya Analizini Aç' : 'Open Dream Analysis'
}

function getCloseLabel(lang) {
  return lang === 'tr' ? 'Kapat' : 'Close'
}

export default function DreamCard({
  dream,
  lang,
  onTranslate,
  translating,
  translated,
  translatedContent,
  translatedAnalysis,
}) {
  const { i18n } = useTranslation()
  const router = useRouter()

  // Dil kodunu temizler (örneğin 'tr-TR' -> 'tr')
  const currentLang = useMemo(() => {
    const rawLang = lang || i18n.language || 'en'
    return String(rawLang).toLowerCase().split('-')[0]
  }, [lang, i18n.language])

  const t = getDreamCardText(currentLang)

  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(dream.likes_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [commentsCount, setCommentsCount] = useState(dream.comments_count || 0)
  const [commentsLoading, setCommentsLoading] = useState(false)

  // Modaller
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showStoryMode, setShowStoryMode] = useState(false)

  // Bakiye, Görsel ve Analiz Durumları
  const [premiumAuras, setPremiumAuras] = useState(0)
  const [aurasLoading, setAurasLoading] = useState(false)
  const [premiumGenerating, setPremiumGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [premiumError, setPremiumError] = useState('')
  const [premiumAnalysis, setPremiumAnalysis] = useState(
    dream?.premium_deep_analysis || null
  )

  const [analysisOverride, setAnalysisOverride] = useState(null)
  const [retryingAnalysis, setRetryingAnalysis] = useState(false)
  const [retryError, setRetryError] = useState('')

  // Toast
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const effectiveDream = useMemo(
    () => (analysisOverride ? { ...dream, ...analysisOverride } : dream),
    [dream, analysisOverride]
  )

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 2800)
  }

  const translateArchetype = useCallback((arch) => {
    if (!arch) return ''
    const cleanArch = String(arch).trim()
    const localized = ARCHETYPE_LOCALIZATIONS[currentLang]?.[cleanArch]
    return localized || cleanArch
  }, [currentLang])

  const translateEmotion = useCallback((sentiment) => {
    if (!sentiment) return ''
    const emotionKey = `emotion.${String(sentiment).toLowerCase()}`
    const localized = tAddDream(emotionKey, currentLang)
    return localized && localized !== emotionKey ? localized : sentiment
  }, [currentLang])

  useEffect(() => {
    setLikesCount(dream.likes_count || 0)
    setCommentsCount(dream.comments_count || 0)
    setComments([])
    setShowComments(false)
    setShowAnalysisModal(false)
    setShowConfirmModal(false)
    setShowStoryMode(false)
    setPremiumGenerating(false)
    setGeneratingImage(false)
    setPremiumError('')
    setPremiumAnalysis(dream?.premium_deep_analysis || null)
    setAnalysisOverride(null)
    setRetryError('')
  }, [dream.id, dream.likes_count, dream.comments_count, dream?.premium_deep_analysis])

  useEffect(() => {
    if (!showAnalysisModal && !showConfirmModal) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAnalysisModal(false)
        setShowConfirmModal(false)
        setShowStoryMode(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [showAnalysisModal, showConfirmModal])

  const teaserAnalysis = useMemo(() => {
    if (
      effectiveDream?.ai_jungian_analysis &&
      Object.keys(effectiveDream.ai_jungian_analysis).length > 0
    ) {
      return effectiveDream.ai_jungian_analysis
    }

    if (
      effectiveDream?.ai_summary ||
      effectiveDream?.ai_summary_en ||
      effectiveDream?.ai_summary_tr ||
      effectiveDream?.ai_title ||
      effectiveDream?.ai_motiv
    ) {
      return {
        title: {
          en: effectiveDream?.ai_title_en || effectiveDream?.ai_title || '',
          tr: effectiveDream?.ai_title_tr || effectiveDream?.ai_title || '',
        },
        summary: {
          en: effectiveDream?.ai_summary_en || effectiveDream?.ai_summary || '',
          tr: effectiveDream?.ai_summary_tr || effectiveDream?.ai_summary || '',
        },
        motiv: {
          en: effectiveDream?.ai_motiv_en || effectiveDream?.ai_motiv || '',
          tr: effectiveDream?.ai_motiv_tr || effectiveDream?.ai_motiv || '',
        },
        sentiment: effectiveDream?.ai_sentiment || null,
        archetypes: Array.isArray(effectiveDream?.ai_archetypes)
          ? effectiveDream.ai_archetypes
          : [],
        teaser: true,
      }
    }

    return null
  }, [effectiveDream])

  const getDreamAnalysis = useCallback(() => {
    if (translated && translatedAnalysis) {
      return translatedAnalysis
    }

    return (
      effectiveDream[`ai_summary_${currentLang}`] ||
      teaserAnalysis?.summary?.[currentLang] ||
      effectiveDream.ai_summary ||
      effectiveDream.ai_summary_en ||
      teaserAnalysis?.summary?.en ||
      ''
    )
  }, [effectiveDream, currentLang, translated, translatedAnalysis, teaserAnalysis])

  const getDreamMotiv = useCallback(() => {
    return (
      effectiveDream[`ai_motiv_${currentLang}`] ||
      teaserAnalysis?.motiv?.[currentLang] ||
      effectiveDream.ai_motiv ||
      effectiveDream.ai_motiv_en ||
      teaserAnalysis?.motiv?.en ||
      ''
    )
  }, [effectiveDream, currentLang, teaserAnalysis])

  const getDreamTitle = useCallback(() => {
    return (
      effectiveDream[`ai_title_${currentLang}`] ||
      teaserAnalysis?.title?.[currentLang] ||
      effectiveDream.ai_title ||
      effectiveDream.ai_title_en ||
      teaserAnalysis?.title?.en ||
      ''
    )
  }, [effectiveDream, currentLang, teaserAnalysis])

  const hasTeaserAnalysis = useMemo(() => {
    return Boolean(teaserAnalysis && (getDreamAnalysis() || getDreamMotiv() || getDreamTitle()))
  }, [teaserAnalysis, getDreamAnalysis, getDreamMotiv, getDreamTitle])

  const analysisStatus = effectiveDream?.analysis_status || null
  const isAnalysisProcessing = !hasTeaserAnalysis && analysisStatus === 'processing'
  const isAnalysisFailed =
    !hasTeaserAnalysis && !isAnalysisProcessing && (analysisStatus === 'failed' || !analysisStatus)

  const dreamImage = useMemo(() => effectiveDream.ai_image_url || null, [effectiveDream])
  const dreamMotiv = useMemo(() => getDreamMotiv(), [getDreamMotiv])
  const dreamTitle = useMemo(() => getDreamTitle(), [getDreamTitle])

  useEffect(() => {
    let mounted = true

    async function checkUser() {
      try {
        const {
          data: { user: currentUser },
          error,
        } = await supabase.auth.getUser()

        if (error) throw error
        if (!mounted) return

        setUser(currentUser || null)

        if (currentUser?.id) {
          await Promise.all([checkIfLiked(currentUser.id), loadPremiumAuras(currentUser.id)])
        } else {
          setPremiumAuras(0)
        }
      } catch (err) {
        console.error('User check error:', err)
        if (mounted) {
          setUser(null)
          setPremiumAuras(0)
        }
      }
    }

    checkUser()

    return () => {
      mounted = false
    }
  }, [dream.id])

  async function loadPremiumAuras(userId) {
    try {
      setAurasLoading(true)

      const { data, error } = await supabase
        .from('user_profiles')
        .select('premium_analysis_auras')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      setPremiumAuras(Number(data?.premium_analysis_auras || 0))
    } catch (err) {
      console.error('Load premium auras error:', err)
      setPremiumAuras(0)
    } finally {
      setAurasLoading(false)
    }
  }

  async function checkIfLiked(userId) {
    try {
      const res = await fetch(
        `/api/like?dreamId=${encodeURIComponent(dream.id)}&userId=${encodeURIComponent(userId)}`
      )

      if (!res.ok) return

      const data = await res.json()
      setLiked(Boolean(data.liked))
    } catch (err) {
      console.error('Check like error:', err)
    }
  }

  async function handleLike() {
    if (!user?.id) {
      alert(getTranslation('social.loginToLike', currentLang))
      return
    }

    const method = liked ? 'DELETE' : 'POST'

    try {
      const res = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
        }),
      })

      if (!res.ok) throw new Error('Like request failed')

      const data = await res.json()

      setLiked((prevLiked) => {
        const nextLiked = !prevLiked

        setLikesCount((prevCount) =>
          data.count !== undefined
            ? data.count
            : nextLiked
            ? prevCount + 1
            : Math.max(0, prevCount - 1)
        )

        return nextLiked
      })
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  async function loadComments() {
    setCommentsLoading(true)

    try {
      const res = await fetch(`/api/comment?dreamId=${encodeURIComponent(dream.id)}`)
      if (!res.ok) throw new Error('Comments request failed')

      const data = await res.json()
      setComments(Array.isArray(data.comments) ? data.comments : [])
    } catch (err) {
      console.error('Load comments error:', err)
      setComments([])
    } finally {
      setCommentsLoading(false)
    }
  }

  async function handleAddComment() {
    if (!user?.id) {
      alert(getTranslation('social.loginToComment', currentLang))
      return
    }

    const content = newComment.trim()
    if (!content) return

    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          content,
        }),
      })

      if (!res.ok) throw new Error('Add comment request failed')

      const data = await res.json()

      setComments((prev) => [data.comment, ...prev])
      setNewComment('')
      setCommentsCount((prev) => prev + 1)
    } catch (err) {
      console.error('Add comment error:', err)
    }
  }

  async function handleDeleteComment(commentId) {
    if (!user?.id) return

    const confirmText =
      currentLang === 'tr'
        ? 'Yorumu silmek istediğine emin misin?'
        : 'Are you sure you want to delete this comment?'

    if (!window.confirm(confirmText)) return

    try {
      const res = await fetch('/api/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userId: user.id,
        }),
      })

      if (!res.ok) throw new Error('Delete comment request failed')

      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentsCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  async function handleRetryAnalysis() {
    if (retryingAnalysis) return

    setRetryingAnalysis(true)
    setRetryError('')

    try {
      const res = await fetch('/api/analyze-dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          lang: currentLang,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'retry_failed')
      }

      if (data.dream) {
        setAnalysisOverride(data.dream)
      }
    } catch (err) {
      console.error('Retry analysis error:', err)
      setRetryError(getAnalysisFailedLabel(currentLang))
    } finally {
      setRetryingAnalysis(false)
    }
  }

  // Derin Rüya Analizini Başlatma (Gerçek Üretim Tetikleyicisi)
  async function handlePremiumAnalysisExecute() {
    setShowConfirmModal(false)
    setPremiumGenerating(true)
    setPremiumError('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setPremiumError(getPremiumErrorMessage(currentLang, 'unauthorized'))
        return
      }

      const res = await fetch('/api/generate-deep-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dreamId: dream.id,
          lang: currentLang,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        if (data?.error === 'no_credits' || data?.error === 'no_auras') {
          setPremiumError(getPremiumErrorMessage(currentLang, 'no_auras'))
          setPremiumAuras(0)
          return
        }
        setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
        return
      }

      if (data?.analysis) {
        setPremiumAnalysis(data.analysis)
        setShowAnalysisModal(true)
      }

      if (typeof data?.aurasLeft === 'number') {
        setPremiumAuras(data.aurasLeft)
      } else {
        setPremiumAuras((prev) => Math.max(0, prev - 8))
      }
    } catch (err) {
      console.error('Premium analysis error:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    } finally {
      setPremiumGenerating(false)
    }
  }

  // Sadece Rüya Görseli Üretme (Bağımsız 2 Aura Tetikleyicisi)
  const handleGenerateImageOnly = async () => {
    setPremiumError('')

    try {
      const {
        data: { user: verifiedUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !verifiedUser?.id) {
        setUser(null)
        setPremiumError(getPremiumErrorMessage(currentLang, 'login_required'))
        router.push('/auth')
        return
      }

      setUser(verifiedUser)

      if (premiumAuras < 2) {
        setPremiumError(getPremiumErrorMessage(currentLang, 'no_auras'))
        return
      }

      const confirmMsg = currentLang === 'tr'
        ? 'Rüyanızın kozmik illüstrasyonunu 2 Aura karşılığında üretmek istiyor musunuz? 🌌'
        : 'Do you want to generate the dream illustration for 2 Auras? 🌌'

      if (!window.confirm(confirmMsg)) return

      setGeneratingImage(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setPremiumError(getPremiumErrorMessage(currentLang, 'unauthorized'))
        return
      }

      const res = await fetch('/api/generate-dream-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dreamId: dream.id,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setPremiumError(t.imageFail)
        return
      }

      if (data?.imageUrl) {
        triggerToast(t.imageSuccess)
        
        // Sayfa yenilemesi yapmadan, state üzerinden rüya kartına yeni görseli anında giydirir
        setAnalysisOverride({ ...effectiveDream, ai_image_url: data.imageUrl })
      }

      if (typeof data?.aurasLeft === 'number') {
        setPremiumAuras(data.aurasLeft)
      } else {
        setPremiumAuras((prev) => Math.max(0, prev - 2))
      }
    } catch (err) {
      console.error('Image only generation error:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    } finally {
      setGeneratingImage(false)
    }
  }

  // Butona tıklandığında bakiye durumuna göre Onay Modalı veya Gumroad açar
  async function handlePremiumButtonClick() {
    setPremiumError('')

    try {
      const {
        data: { user: verifiedUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !verifiedUser?.id) {
        setUser(null)
        setPremiumError(getPremiumErrorMessage(currentLang, 'login_required'))
        router.push('/auth')
        return
      }

      setUser(verifiedUser)

      // Eğer zaten analiz üretilmişse onay ekranı göstermeden doğrudan Instagram carousel'i aç
      if (premiumAnalysis) {
        setShowAnalysisModal(true)
        return
      }

      // Analiz henüz üretilmemişse onay penceresini tetikle
      setShowConfirmModal(true)
    } catch (err) {
      console.error('User verification check failed:', err)
      setPremiumError(getPremiumErrorMessage(currentLang, 'generic'))
    }
  }

  // Lunosfer Sohbet Çemberi Paylaşımı (Gerçek Veritabanı ve Akış Entegrasyonu)
  const handleLunosferShare = async () => {
    if (!user?.id) {
      alert(getTranslation('social.loginToComment', currentLang))
      return
    }

    try {
      const shareMsg = t.lunosferShareMsg

      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dreamId: dream.id,
          userId: user.id,
          content: shareMsg,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments((prev) => [data.comment, ...prev])
        setCommentsCount((prev) => prev + 1)
        triggerToast(t.lunosferSuccess)
      } else {
        throw new Error('Sohbet paylaşımı başarısız')
      }
    } catch (err) {
      console.error('Lunosfer share error:', err)
      triggerToast(t.toastCopied)
    }
  }

  // Sosyal Medya & Instagram Paylaşım Fonksiyonu (Web Share API & Clipboard Fallback)
  const handleShareOnSocial = async () => {
    const dreamUrl = typeof window !== 'undefined' ? `${window.location.origin}/dreams/${dream.id}` : ''
    const shareText = t.shareText.replace('{url}', dreamUrl)

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lunosfer Rüya Analizim 🔮',
          text: shareText,
          url: dreamUrl
        })
      } catch (err) {
        console.error('Native sharing failed:', err)
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        triggerToast(t.toastCopied)
      } catch (err) {
        console.error('Clipboard copy failed:', err)
        alert('Bağlantı: ' + dreamUrl)
      }
    }
  }

  const displayContent = translated ? translatedContent : dream.content
  const displayAnalysis = getDreamAnalysis()

  const sentimentLabel = dream.user_selected_sentiment
    ? translateEmotion(dream.user_selected_sentiment)
    : null

  return (
    <>
      <article className="glass-card hover-lift overflow-hidden">
        {dreamImage && (
          <div className="dream-image relative h-64 w-full overflow-hidden bg-black">
            <img
              src={dreamImage}
              alt="Dream"
              className="h-full w-full object-cover animate-fade-in"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-orange-100">
              <span className="signal-dot heat" />
              Rare Signal
            </div>
          </div>
        )}

        <div className="p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {Array.isArray(effectiveDream.ai_archetypes) && effectiveDream.ai_archetypes.length > 0 ? (
              effectiveDream.ai_archetypes.map((arch, i) => (
                <span
                  key={`${dream.id}-arch-${i}`}
                  className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {translateArchetype(arch)}
                </span>
              ))
            ) : Array.isArray(teaserAnalysis?.archetypes) && teaserAnalysis.archetypes.length > 0 ? (
              teaserAnalysis.archetypes.map((arch, i) => (
                <span
                  key={`${dream.id}-teaser-arch-${i}`}
                  className="rounded-full border border-violet-300/18 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-100"
                >
                  {translateArchetype(arch)}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-cyan-300/16 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-cyan-100">
                {currentLang === 'tr' ? 'Rüya Parçası' : 'Dream Fragment'}
              </span>
            )}
          </div>

          <p className="mb-6 whitespace-pre-wrap text-base leading-8 text-white/90 sm:text-lg">
            {displayContent || ''}
          </p>

          {dream.original_language !== currentLang && dream.content && (
            <button
              onClick={() => onTranslate?.(dream)}
              disabled={translating}
              className="energy-button mb-5 inline-flex w-full items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translating ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                  {currentLang === 'tr' ? 'Çevriliyor...' : 'Translating...'}
                </span>
              ) : translated ? (
                currentLang === 'tr' ? 'Orijinali Göster' : 'Show original'
              ) : (
                `${currentLang.toUpperCase()} ${currentLang === 'tr' ? 'diline çevir' : 'translate'}`
              )}
            </button>
          )}

          {/* Sadece derin rüya analizi bulunmuyorsa Teaser yorum butonu gösterilir */}
          {hasTeaserAnalysis && !premiumAnalysis && (
            <div className="mb-5 rounded-[1.5rem] border border-violet-300/18 bg-violet-500/8 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg text-violet-200">🜂</span>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-100">
                  {getTranslation('feed.jungianAnalysis', currentLang)}
                </span>
              </div>

              {dreamTitle ? (
                <h3 className="mb-3 text-base font-semibold leading-7 text-violet-50 sm:text-lg">
                  {dreamTitle}
                </h3>
              ) : null}

              <p className="text-sm leading-7 text-white/82">{displayAnalysis}</p>

              {dreamMotiv && (
                <div className="mt-4 border-t border-violet-300/14 pt-3">
                  <p className="text-xs italic text-violet-100/78">💫 {dreamMotiv}</p>
                </div>
              )}
            </div>
          )}

          {isAnalysisProcessing && (
            <div className="mb-5 flex items-center gap-3 rounded-[1.5rem] border border-cyan-300/18 bg-cyan-500/8 p-4 sm:p-5">
              <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
              <p className="text-sm leading-6 text-cyan-100/90">
                {getAnalysisProcessingLabel(currentLang)}
              </p>
            </div>
          )}

          {isAnalysisFailed && (
            <div className="mb-5 rounded-[1.5rem] border border-white/12 bg-white/4 p-4 sm:p-5">
              <p className="mb-3 text-sm leading-6 text-white/70">
                {getAnalysisFailedLabel(currentLang)}
              </p>
              <button
                type="button"
                onClick={handleRetryAnalysis}
                disabled={retryingAnalysis}
                className="energy-button inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {retryingAnalysis && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" />
                )}
                <span>{getRetryAnalysisLabel(currentLang, retryingAnalysis)}</span>
              </button>
              {retryError ? (
                <p className="mt-2 text-xs leading-5 text-rose-200/90">{retryError}</p>
              ) : null}
            </div>
          )}

          {/* Derin Rüya Analizini Başlat/Aç Butonu */}
          <button
            type="button"
            onClick={handlePremiumButtonClick}
            disabled={premiumGenerating}
            className="energy-button mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-fuchsia-300/18 bg-fuchsia-500/10 px-4 py-3.5 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-500/18 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_20px_rgba(240,73,214,0.15)]"
          >
            <span>{premiumGenerating ? '⏳' : '✦'}</span>
            <span>
              {premiumAnalysis 
                ? t.exploreCards
                : t.getDeepAnalysis
              }
            </span>
          </button>

          {/* Sadece Rüya Görseli Üretme Butonu (2 Aura - Sadece rüya resmi yoksa ve analiz alınmamışsa gösterilir) */}
          {!premiumAnalysis && !dreamImage && (
            <button
              type="button"
              onClick={handleGenerateImageOnly}
              disabled={generatingImage}
              className="energy-button mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-3.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-60 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse"
            >
              <span>{generatingImage ? '⏳' : '🌌'}</span>
              <span>
                {generatingImage 
                  ? t.generatingImage
                  : t.generateImage
                }
              </span>
            </button>
          )}

          {premiumError ? (
            <p className="mb-5 -mt-2 text-sm leading-6 text-rose-200/90" role="alert">
              {premiumError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button
              onClick={handleLike}
              className={`energy-button inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm transition-all ${
                liked
                  ? 'border border-red-400/20 bg-red-500/16 text-red-200'
                  : 'border border-white/10 bg-white/5 text-white/80 hover:bg-red-500/10'
              }`}
            >
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{likesCount}</span>
            </button>

            <button
              onClick={() => {
                const nextValue = !showComments
                setShowComments(nextValue)
                if (nextValue && comments.length === 0) {
                  loadComments()
                }
              }}
              className="energy-button inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-cyan-500/10"
            >
              <span>💬</span>
              <span>{commentsCount}</span>
            </button>

            {/* Mükerrerliği önlemek adına; rüya analiz kartları varsa sadece premium carousel açılır, yoksa teaser açılır */}
            {hasTeaserAnalysis && !premiumAnalysis && (
              <button
                type="button"
                onClick={() => {
                  setShowAnalysisModal(true)
                }}
                className="energy-button inline-flex items-center gap-2 rounded-2xl border border-violet-300/18 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/18"
              >
                <span>🜂</span>
                <span>{getAnalysisButtonLabel(currentLang)}</span>
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-sm text-white/58">
            {dream.dream_date && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {dream.dream_date}
              </span>
            )}
            {dream.location_name && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {dream.location_name}
              </span>
            )}
            {dream.original_language && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {String(dream.original_language).toUpperCase()}
              </span>
            )}
            {sentimentLabel && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1">
                {sentimentLabel}
              </span>
            )}
          </div>

          {showComments && (
            <div className="mt-5 border-t border-white/10 pt-5">
              {user && (
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddComment()
                      }
                    }}
                    placeholder={getTranslation('social.addComment', currentLang)}
                    className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-violet-400/30 focus:outline-none"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="energy-button rounded-2xl border border-violet-300/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100 hover:bg-violet-500/18 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {getTranslation('social.send', currentLang)}
                  </button>
                </div>
              )}

              {commentsLoading ? (
                <p className="py-4 text-center text-sm text-white/40">
                  {currentLang === 'tr' ? 'Yorumlar yükleniyor...' : 'Loading comments...'}
                </p>
              ) : comments.length === 0 ? (
                <p className="py-4 text-center text-sm text-white/40">
                  {getTranslation('social.noComments', currentLang)}
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-[1.35rem] border border-white/10 bg-white/5 p-3.5"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">
                            {comment.user_profiles?.display_name ||
                              comment.user_profiles?.username ||
                              'Anonim'}
                          </span>
                          <span className="text-xs text-white/40">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-400 transition-colors hover:text-red-300"
                          >
                            {getTranslation('social.delete', currentLang)}
                          </button>
                        )}
                      </div>

                      <p className="text-sm leading-7 text-white/82">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      {/* TOAST BİLDİRİMİ */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] pointer-events-none transition-all duration-300 animate-pulse">
          <div className="rounded-full border border-fuchsia-300/30 bg-fuchsia-950/90 px-6 py-3 text-sm font-medium text-fuchsia-100 shadow-[0_0_30px_rgba(240,73,214,0.3)] backdrop-blur-md">
            {toastMessage}
          </div>
        </div>
      )}

      {/* ONAY MODALİ (8 AURA SATIN ALMA/BAŞLATMA EKRANI) */}
      <DeepAnalysisConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        auras={premiumAuras}
        onConfirm={handlePremiumAnalysisExecute}
        lang={currentLang}
        gumroadUrl={GUMROAD_PRODUCT_URL}
      />

      {/* HİBRİT ANALİZ İNCELEME MODALÜ (Premium ise 7 Slaytlı Carousel, Teaser ise Klasik Görünüm) */}
      {showAnalysisModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md sm:items-center sm:p-4"
          onClick={() => {
            setShowAnalysisModal(false)
            setShowStoryMode(false)
          }}
          role="dialog"
          aria-modal="true"
        >
          {premiumAnalysis ? (
            /* Premium ise Gelişmiş 7 Slaytlı ve Sosyal Paylaşım Merkezli Instagram Carousel Modal */
            <DeepAnalysisCarouselModal
              isOpen={showAnalysisModal}
              onClose={() => setShowAnalysisModal(false)}
              premiumAnalysis={premiumAnalysis}
              lang={currentLang}
              dreamTitle={dreamTitle}
              dreamImage={dreamImage}
              dreamMotiv={dreamMotiv}
              dreamContent={dream.content}
              teaserSummary={teaserAnalysis?.summary?.[currentLang] || teaserAnalysis?.summary?.en || dream.ai_summary}
              onShare={handleShareOnSocial}
              onLunosferShare={handleLunosferShare}
              translateArchetype={translateArchetype}
              onOpenStoryMode={() => setShowStoryMode(true)}
              dreamId={dream.id}
            />
          ) : (
            /* Ücretsiz Teaser ise Klasik DreamAnalysisView */
            <div
              className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#070b14] shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:rounded-[2rem]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowAnalysisModal(false)}
                className="sticky right-4 top-4 z-20 ml-auto mr-4 mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white hover:bg-white/10"
                aria-label={getCloseLabel(currentLang)}
              >
                ✕
              </button>
              <DreamAnalysisView 
                analysis={effectiveDream?.premium_deep_analysis || teaserAnalysis} 
                lang={currentLang} 
              />
            </div>
          )}
        </div>
      )}

      {/* HİKAYE MODU MODALİ (Screenshot uyumlu dikey görünüm) */}
      <StoryModeModal
        isOpen={showStoryMode && showAnalysisModal}
        onClose={() => setShowStoryMode(false)}
        dreamImage={dreamImage}
        dreamTitle={dreamTitle}
        dreamMotiv={dreamMotiv}
        premiumAnalysis={premiumAnalysis}
        lang={currentLang}
        translateArchetype={translateArchetype}
      />
    </>
  )
}